use std::process::Command;
use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Maximum command length to prevent DoS
const MAX_COMMAND_LENGTH: usize = 4000;

/// Decode bytes to a UTF-8 String.
/// On Windows, cmd.exe output is typically in the system ANSI/OEM code page (e.g. GBK for
/// Chinese Windows). We use chardetng to detect the encoding, then encoding_rs to transcode it.
fn decode_output(bytes: &[u8]) -> String {
    if bytes.is_empty() {
        return String::new();
    }
    // Fast path: valid UTF-8 already
    if let Ok(s) = std::str::from_utf8(bytes) {
        return s.to_owned();
    }
    // Detect encoding and transcode to UTF-8
    let mut det = chardetng::EncodingDetector::new();
    det.feed(bytes, true);
    let encoding = det.guess(None, true);
    let (cow, _, _) = encoding.decode(bytes);
    cow.into_owned()
}

/// Validate the command string (basic sanity checks).
fn validate_command(command: &str) -> Result<(), String> {
    // Check length
    if command.len() > MAX_COMMAND_LENGTH {
        return Err(format!("Command too long (max {} characters)", MAX_COMMAND_LENGTH));
    }

    // Trim and check if empty
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Empty command".to_string());
    }

    Ok(())
}

/// Validate working directory path.
fn validate_cwd(cwd: &str) -> Result<(), String> {
    let path = Path::new(cwd);
    
    // Must be absolute path
    if !path.is_absolute() {
        return Err("Working directory must be an absolute path".to_string());
    }

    // Must exist
    if !path.exists() {
        return Err("Working directory does not exist".to_string());
    }

    // Must be a directory
    if !path.is_dir() {
        return Err("Working directory path is not a directory".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn execute_shell_command(command: String, cwd: Option<String>, shell_type: Option<String>) -> Result<String, String> {
    // Validate command
    validate_command(&command)?;
    let base_cmd = command.trim().split_whitespace().next().unwrap_or("").to_lowercase();

    // Validate working directory if provided
    if let Some(ref dir) = cwd {
        if !dir.is_empty() {
            validate_cwd(dir)?;
        }
    }

    // Log command execution for audit trail
    eprintln!("[SHELL_AUDIT] Executing: {} | CWD: {:?} | Shell: {:?}", command, cwd, shell_type);

    // Determine shell type (default to cmd on Windows, sh on Unix)
    let shell_type = shell_type.as_deref().unwrap_or(if cfg!(target_os = "windows") { "cmd" } else { "sh" });

    // Execute command
    let mut cmd = if cfg!(target_os = "windows") {
        match shell_type {
            "powershell" | "pwsh" => {
                // Try pwsh (PowerShell Core) first, fall back to powershell (Windows PowerShell)
                let ps_exe = if std::process::Command::new("pwsh").arg("--version").output().is_ok() {
                    "pwsh"
                } else {
                    "powershell"
                };
                let mut c = Command::new(ps_exe);
                c.args(["-NoProfile", "-NonInteractive", "-Command", &command]);
                c
            },
            "bash" | "git-bash" => {
                // Try to find Git Bash
                let bash_paths = vec![
                    "C:\\Program Files\\Git\\bin\\bash.exe",
                    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
                    "bash.exe", // Try PATH
                ];
                let bash_path = bash_paths.iter()
                    .find(|p| std::path::Path::new(p).exists())
                    .unwrap_or(&"bash.exe");
                
                let mut c = Command::new(bash_path);
                c.args(["--login", "-c", &command]);
                c
            },
            "wsl" => {
                let mut c = Command::new("wsl");
                c.args(["--", "bash", "-l", "-c", &command]);
                c
            },
            _ => {
                // Default: cmd
                let mut c = Command::new("cmd");
                c.args(["/C", &command]);
                c
            }
        }
    } else {
        let mut c = Command::new("sh");
        c.args(["-l", "-c", &command]);
        c
    };

    // Prevent console window from appearing on Windows
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    if let Some(dir) = cwd {
        if !dir.is_empty() {
            cmd.current_dir(&dir);
        }
    }

    // Execute with timeout would be ideal, but not implemented here
    let output = cmd.output().map_err(|e| {
        eprintln!("[SHELL_ERROR] Command '{}' failed: {}", base_cmd, e);
        "Command execution failed. Please try again.".to_string()
    })?;

    let stdout = decode_output(&output.stdout);
    let stderr = decode_output(&output.stderr);

    let mut result = String::new();
    if !stdout.is_empty() {
        result.push_str(&stdout);
    }
    if !stderr.is_empty() {
        if !result.is_empty() && !result.ends_with('\n') {
            result.push('\n');
        }
        result.push_str(&stderr);
    }

    if result.is_empty() && !output.status.success() {
        result = format!("Command exited with non-zero status.\n");
    }

    // Ensure output ends with newline for clean prompt display
    if !result.is_empty() && !result.ends_with('\n') {
        result.push('\n');
    }

    Ok(result)
}
