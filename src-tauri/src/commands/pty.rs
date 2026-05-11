//! PTY (pseudo-terminal) management for the terminal plugin.
//!
//! Each terminal tab in the frontend maps to a persistent PTY session.
//! Data flows bidirectionally via Tauri events:
//!   - Frontend → Backend: `pty_write` command
//!   - Backend → Frontend: `pty-data-{id}` event (stdout stream)
//!
//! Sessions are stored in a global `HashMap<String, PtySession>` behind a
//! `Mutex`.  The reader thread emits data events; the writer thread receives
//! data via the `pty_write` command.

use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// Maximum bytes per read from PTY stdout before emitting an event.
const READ_BUF_SIZE: usize = 8192;

/// Global PTY session registry.
/// Stored as Tauri managed state.
pub struct PtyState {
    sessions: Mutex<HashMap<String, PtySession>>,
}

impl PtyState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

/// A single PTY session.
struct PtySession {
    writer: Box<dyn Write + Send>,
    /// Keep the master alive so the PTY pipes stay open.
    _master: Box<dyn portable_pty::MasterPty + Send>,
    /// Keep the slave alive — on Windows ConPTY, dropping the slave can
    /// close the pseudoconsole and terminate the child process.
    _slave: Box<dyn portable_pty::SlavePty + Send>,
    /// Child process handle — kept so we can kill/wait on it.
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

/// Find a valid shell executable for the requested shell type.
///
/// On Windows, cmd → cmd.exe, powershell/pwsh → pwsh.exe or powershell.exe,
/// bash/git-bash → Git Bash, wsl → wsl.exe.
/// On Unix, defaults to the user's SHELL or /bin/sh.
fn resolve_shell(shell_type: &str) -> (String, Vec<String>) {
    #[cfg(target_os = "windows")]
    {
        match shell_type {
            "powershell" | "pwsh" => {
                // Try PowerShell Core first, fall back to Windows PowerShell
                let exe = if which_exists("pwsh") {
                    "pwsh".to_string()
                } else {
                    "powershell".to_string()
                };
                (exe, vec!["-NoLogo".to_string()])
            }
            "bash" | "git-bash" => {
                let bash_paths = [
                    r"C:\Program Files\Git\bin\bash.exe",
                    r"C:\Program Files (x86)\Git\bin\bash.exe",
                ];
                let exe = bash_paths
                    .iter()
                    .find(|p| std::path::Path::new(p).exists())
                    .map(|p| p.to_string())
                    .unwrap_or_else(|| "bash.exe".to_string());
                (exe, vec!["--login".to_string(), "-i".to_string()])
            }
            "wsl" => ("wsl".to_string(), vec![]),
            _ => {
                // Default: cmd
                ("cmd.exe".to_string(), vec![])
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = shell_type;
        // Use SHELL env or default to /bin/sh
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        (shell, vec!["-l".to_string()])
    }
}

/// Check whether an executable exists on PATH.
#[cfg(target_os = "windows")]
fn which_exists(name: &str) -> bool {
    std::process::Command::new("where")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Spawn a new PTY session and start streaming output to the frontend.
#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    id: String,
    shell_type: Option<String>,
    cwd: Option<String>,
    rows: Option<u16>,
    cols: Option<u16>,
) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let pty_system = NativePtySystem::default();

    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let shell_type_str = shell_type.as_deref().unwrap_or(
        if cfg!(target_os = "windows") { "cmd" } else { "sh" }
    );
    let (shell_exe, shell_args) = resolve_shell(shell_type_str);

    eprintln!("[PTY] Spawning shell: {} {:?} for session {}", shell_exe, shell_args, id);

    let mut cmd = CommandBuilder::new(&shell_exe);
    for arg in &shell_args {
        cmd.arg(arg);
    }

    // Set environment for proper terminal behavior
    cmd.env("TERM", "xterm-256color");

    // Set working directory
    if let Some(ref dir) = cwd {
        if !dir.is_empty() {
            let p = std::path::Path::new(dir);
            if p.is_absolute() && p.is_dir() {
                cmd.cwd(dir);
            }
        }
    }

    // Get reader and writer from master BEFORE spawning the child.
    // On Windows ConPTY, the order matters — spawning first can cause
    // the initial output pipe setup to miss early data.
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell '{}': {}", shell_exe, e))?;

    eprintln!("[PTY] Shell spawned, pid={:?} for session {}", child.process_id(), id);

    let session = PtySession {
        writer,
        _master: pair.master,
        _slave: pair.slave,  // Keep slave alive for ConPTY lifetime
        _child: child,
    };

    // Store session
    {
        let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(id.clone(), session);
    }

    // Spawn reader thread that emits data events to the frontend
    let event_id = id.clone();
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut buf = vec![0u8; READ_BUF_SIZE];
        let mut consecutive_errors = 0u32;

        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF — shell exited
                    eprintln!("[PTY] EOF for session {}", event_id);
                    let _ = app_handle.emit(&format!("pty-exit-{}", event_id), ());
                    break;
                }
                Ok(n) => {
                    consecutive_errors = 0;
                    let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app_handle.emit(&format!("pty-data-{}", event_id), data);
                }
                Err(e) => {
                    eprintln!("[PTY] Reader error for {}: {} (kind={:?})", event_id, e, e.kind());

                    // On Windows ConPTY, pipe reads can fail transiently during
                    // initialization or when the console is being set up.
                    // Retry a few times before declaring the session dead.
                    consecutive_errors += 1;
                    if consecutive_errors >= 3 {
                        eprintln!("[PTY] Too many consecutive errors for {}, exiting reader", event_id);
                        let _ = app_handle.emit(&format!("pty-exit-{}", event_id), ());
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    continue;
                }
            }
        }

        // Clean up session on exit
        if let Ok(mut sessions) = app_handle.state::<PtyState>().sessions.lock() {
            sessions.remove(&event_id);
        }
    });

    Ok(())
}

/// Write data (user keystrokes) to a PTY session's stdin.
#[tauri::command]
pub fn pty_write(app: AppHandle, id: String, data: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;

    let session = sessions
        .get_mut(&id)
        .ok_or_else(|| format!("PTY session '{}' not found", id))?;

    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {}", e))?;

    session
        .writer
        .flush()
        .map_err(|e| format!("Failed to flush PTY: {}", e))?;

    Ok(())
}

/// Resize a PTY session.
#[tauri::command]
pub fn pty_resize(app: AppHandle, id: String, rows: u16, cols: u16) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;

    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("PTY session '{}' not found", id))?;

    session
        ._master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize PTY: {}", e))?;

    Ok(())
}

/// Kill and remove a PTY session.
#[tauri::command]
pub fn pty_kill(app: AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;

    if let Some(mut session) = sessions.remove(&id) {
        eprintln!("[PTY] Killing session {}", id);
        let _ = session._child.kill();
    } else {
        eprintln!("[PTY] Kill requested for unknown session {}", id);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_shell_returns_valid_default() {
        let (exe, _args) = resolve_shell("cmd");
        assert!(!exe.is_empty());
    }

    #[test]
    fn resolve_shell_powershell() {
        let (exe, args) = resolve_shell("powershell");
        assert!(exe == "pwsh" || exe == "powershell");
        assert!(args.contains(&"-NoLogo".to_string()));
    }

    #[test]
    fn resolve_shell_bash() {
        let (exe, args) = resolve_shell("bash");
        assert!(exe.contains("bash"));
        assert!(args.contains(&"--login".to_string()));
    }
}
