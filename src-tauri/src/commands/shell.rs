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

/// Entry returned by shell tab-completion.
#[derive(serde::Serialize)]
pub struct CompletionEntry {
    pub name: String,
    pub is_dir: bool,
}

/// Convert a git-bash / Unix-style drive path to a Windows native path.
///
/// On Windows only, paths of the form `/X` or `/X/rest` (where X is a single
/// ASCII letter) are treated as git-bash drive references and converted to
/// `X:\rest`.  All other paths are returned unchanged.
///
/// Examples (Windows only):
///   `/f/`          → `F:\`
///   `/f/md-client` → `F:\md-client`
///   `/c/Windows`   → `C:\Windows`
///   `src/utils`    → `src/utils`  (unchanged)
fn convert_unix_drive_path(path: &str) -> std::borrow::Cow<'_, str> {
    #[cfg(target_os = "windows")]
    {
        if let Some(rest) = path.strip_prefix('/') {
            let mut chars = rest.chars();
            if let Some(drive) = chars.next() {
                if drive.is_ascii_alphabetic() {
                    let after = chars.as_str(); // everything after the drive letter
                    if after.is_empty() || after.starts_with('/') {
                        let drive_upper = drive.to_ascii_uppercase();
                        if after.is_empty() {
                            // "/X" → "X:\"
                            return format!("{drive_upper}:\\").into();
                        } else {
                            // "/X/rest" → "X:\rest" (drop the leading slash from after)
                            let sub = &after[1..];
                            if sub.is_empty() {
                                return format!("{drive_upper}:\\").into();
                            }
                            return format!("{drive_upper}:\\{}", sub.replace('/', "\\")).into();
                        }
                    }
                }
            }
        }
    }
    path.into()
}

/// List files and directories for tab-completion in the terminal plugin.
/// `cwd` – absolute working directory.
/// `partial` – the (possibly partial) path fragment the user has typed so far.
///
/// Returns matching entries sorted directories-first, then alphabetically.
#[tauri::command]
pub fn shell_tab_complete(cwd: String, partial: String) -> Result<Vec<CompletionEntry>, String> {
    // Convert Unix/git-bash drive paths (e.g. /f/) to Windows native paths (F:\)
    // before any further processing so that resolve_dir works correctly.
    let partial = convert_unix_drive_path(&partial).into_owned();
    let partial = partial.replace('/', std::path::MAIN_SEPARATOR_STR);

    // Split into directory part and prefix-to-match
    let partial_path = Path::new(&partial);
    let (search_dir, prefix) = if partial.ends_with(std::path::MAIN_SEPARATOR_STR) {
        // User typed "dir/" → list contents of that dir
        (resolve_dir(&cwd, &partial), String::new())
    } else if let Some(parent) = partial_path.parent() {
        let parent_str = parent.to_string_lossy().to_string();
        let file_part = partial_path
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_default();
        if parent_str.is_empty() {
            (Path::new(&cwd).to_path_buf(), file_part)
        } else {
            (resolve_dir(&cwd, &parent_str), file_part)
        }
    } else {
        (Path::new(&cwd).to_path_buf(), partial.clone())
    };

    if !search_dir.is_dir() {
        return Ok(vec![]);
    }

    let prefix_lower = prefix.to_lowercase();

    let mut entries: Vec<CompletionEntry> = std::fs::read_dir(&search_dir)
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            // Skip hidden files
            if name.starts_with('.') {
                return None;
            }
            if !prefix_lower.is_empty() && !name.to_lowercase().starts_with(&prefix_lower) {
                return None;
            }
            let is_dir = entry.path().is_dir();
            Some(CompletionEntry { name, is_dir })
        })
        .collect();

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    // Limit results to avoid flooding the terminal
    entries.truncate(50);

    Ok(entries)
}

/// Resolve a possibly-relative directory against `cwd`.
fn resolve_dir(cwd: &str, dir: &str) -> std::path::PathBuf {
    let p = Path::new(dir);
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        Path::new(cwd).join(dir)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── validate_command ─────────────────────────────────────────────────────

    #[test]
    fn validate_command_rejects_empty() {
        assert!(validate_command("").is_err());
        assert!(validate_command("   ").is_err());
    }

    #[test]
    fn validate_command_rejects_too_long() {
        let long = "a".repeat(MAX_COMMAND_LENGTH + 1);
        assert!(validate_command(&long).is_err());
    }

    #[test]
    fn validate_command_accepts_valid() {
        assert!(validate_command("ls -la").is_ok());
        assert!(validate_command("dir /w").is_ok());
        assert!(validate_command("echo hello world").is_ok());
    }

    // ── validate_cwd ─────────────────────────────────────────────────────────

    #[test]
    fn validate_cwd_rejects_relative() {
        assert!(validate_cwd("relative/path").is_err());
        assert!(validate_cwd("docs").is_err());
    }

    #[test]
    fn validate_cwd_rejects_nonexistent() {
        // This path should not exist on any CI machine.
        assert!(validate_cwd("/nonexistent_marklite_test_dir_xyzzy_12345").is_err());
    }

    #[test]
    fn validate_cwd_accepts_existing_dir() {
        // Use the OS temp dir which is guaranteed to exist and be a directory.
        let tmp = std::env::temp_dir();
        let tmp_str = tmp.to_string_lossy();
        assert!(
            validate_cwd(&tmp_str).is_ok(),
            "expected temp dir {tmp_str:?} to be accepted"
        );
    }

    // ── convert_unix_drive_path ───────────────────────────────────────────────

    /// On Windows, Unix-style drive paths must be converted to Windows paths.
    #[cfg(target_os = "windows")]
    mod unix_drive_path_windows {
        use super::super::convert_unix_drive_path;

        #[test]
        fn drive_root_with_trailing_slash() {
            assert_eq!(convert_unix_drive_path("/f/"), "F:\\");
            assert_eq!(convert_unix_drive_path("/c/"), "C:\\");
            assert_eq!(convert_unix_drive_path("/F/"), "F:\\");
        }

        #[test]
        fn drive_root_without_trailing_slash() {
            // "/X" alone (no trailing slash) still converts
            assert_eq!(convert_unix_drive_path("/f"), "F:\\");
        }

        #[test]
        fn drive_with_subdirectory() {
            assert_eq!(convert_unix_drive_path("/f/md-client"), "F:\\md-client");
            assert_eq!(convert_unix_drive_path("/c/Windows/System32"), "C:\\Windows\\System32");
        }

        #[test]
        fn leaves_relative_paths_unchanged() {
            assert_eq!(convert_unix_drive_path("src/utils"), "src/utils");
            assert_eq!(convert_unix_drive_path("relative"), "relative");
        }

        #[test]
        fn leaves_windows_absolute_paths_unchanged() {
            assert_eq!(convert_unix_drive_path("C:\\Windows"), "C:\\Windows");
            assert_eq!(convert_unix_drive_path("F:\\md-client"), "F:\\md-client");
        }

        #[test]
        fn does_not_convert_long_first_segment() {
            // /foo/ is not a drive letter (more than one char), must be left unchanged
            assert_eq!(convert_unix_drive_path("/foo/bar"), "/foo/bar");
        }
    }

    /// On non-Windows, the function must be a no-op.
    #[cfg(not(target_os = "windows"))]
    mod unix_drive_path_noop {
        use super::super::convert_unix_drive_path;

        #[test]
        fn leaves_all_paths_unchanged() {
            assert_eq!(convert_unix_drive_path("/f/"), "/f/");
            assert_eq!(convert_unix_drive_path("/usr/local/bin"), "/usr/local/bin");
            assert_eq!(convert_unix_drive_path("relative"), "relative");
        }
    }

    // ── resolve_dir ───────────────────────────────────────────────────────────

    #[test]
    fn resolve_dir_with_absolute_dir_ignores_cwd() {
        let tmp = std::env::temp_dir();
        let result = resolve_dir("/some/cwd", &tmp.to_string_lossy());
        assert_eq!(result, tmp);
    }

    #[test]
    fn resolve_dir_with_relative_dir_joins_cwd() {
        let tmp = std::env::temp_dir();
        let result = resolve_dir(&tmp.to_string_lossy(), "subdir");
        assert_eq!(result, tmp.join("subdir"));
    }

    // ── shell_tab_complete (integration-style, filesystem dependent) ──────────

    #[test]
    fn tab_complete_empty_partial_lists_cwd_contents() {
        let tmp = std::env::temp_dir();
        // Create a transient subdirectory to assert on
        let marker = tmp.join("marklite_tabtest_dir");
        let _ = std::fs::create_dir_all(&marker);

        let result = shell_tab_complete(tmp.to_string_lossy().to_string(), String::new());
        assert!(result.is_ok(), "shell_tab_complete should succeed");

        let _ = std::fs::remove_dir_all(&marker);
    }

    #[test]
    fn tab_complete_nonexistent_cwd_returns_empty() {
        let result = shell_tab_complete(
            "/nonexistent_xyzzy_cwd_12345".to_string(),
            String::new(),
        );
        // Either Ok(empty) or Err is acceptable; must not panic
        match result {
            Ok(entries) => assert!(entries.is_empty()),
            Err(_) => {}
        }
    }

    #[test]
    fn tab_complete_prefix_filters_entries() {
        let tmp = std::env::temp_dir();
        // Create two directories with distinct prefixes
        let dir_aa = tmp.join("marklite_aa_test");
        let dir_bb = tmp.join("marklite_bb_test");
        let _ = std::fs::create_dir_all(&dir_aa);
        let _ = std::fs::create_dir_all(&dir_bb);

        let result = shell_tab_complete(
            tmp.to_string_lossy().to_string(),
            "marklite_aa".to_string(),
        )
        .expect("tab_complete should succeed");

        // Only entries starting with "marklite_aa" should be returned
        for entry in &result {
            assert!(
                entry.name.to_lowercase().starts_with("marklite_aa"),
                "unexpected entry: {}",
                entry.name
            );
        }
        assert!(
            result.iter().any(|e| e.name == "marklite_aa_test"),
            "expected marklite_aa_test in results"
        );

        let _ = std::fs::remove_dir_all(&dir_aa);
        let _ = std::fs::remove_dir_all(&dir_bb);
    }

    #[test]
    fn tab_complete_dirs_come_before_files() {
        let tmp = std::env::temp_dir();
        let dir_path = tmp.join("marklite_sort_dir");
        let file_path = tmp.join("marklite_sort_file.txt");
        let _ = std::fs::create_dir_all(&dir_path);
        let _ = std::fs::write(&file_path, b"");

        let result = shell_tab_complete(
            tmp.to_string_lossy().to_string(),
            "marklite_sort".to_string(),
        )
        .expect("tab_complete should succeed");

        let dir_pos = result.iter().position(|e| e.name == "marklite_sort_dir");
        let file_pos = result.iter().position(|e| e.name == "marklite_sort_file.txt");

        if let (Some(d), Some(f)) = (dir_pos, file_pos) {
            assert!(d < f, "directory should come before file in completions");
        }

        let _ = std::fs::remove_dir_all(&dir_path);
        let _ = std::fs::remove_file(&file_path);
    }
}

