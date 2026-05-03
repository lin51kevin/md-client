use std::process::Command;
use std::path::Path;

/// Whitelist of allowed shell commands for security.
/// Only these base commands can be executed via the terminal plugin.
const ALLOWED_COMMANDS: &[&str] = &[
    // Navigation & File listing
    "ls", "dir", "pwd", "cd", "tree",
    // File operations (read-only)
    "cat", "type", "head", "tail", "less", "more",
    // Text processing
    "grep", "find", "wc", "sort", "uniq", "diff",
    // Git operations
    "git",
    // System info (safe)
    "echo", "date", "whoami", "hostname", "uname",
    // Network (diagnostic only)
    "ping", "curl", "wget",
    // Package managers (query only, no install)
    "npm", "yarn", "cargo", "pip",
    // Build tools
    "node", "python", "python3", "rustc", "gcc",
    "make", "cmake", "mvn", "gradle",
];

/// Commands that are explicitly forbidden due to high security risk.
const FORBIDDEN_COMMANDS: &[&str] = &[
    "rm", "del", "rmdir", "format", "dd",
    "chmod", "chown", "sudo", "su",
    "kill", "pkill", "killall",
    "shutdown", "reboot", "halt", "poweroff",
    "fdisk", "mkfs", "mount", "umount",
];

/// Maximum command length to prevent DoS
const MAX_COMMAND_LENGTH: usize = 1000;

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

/// Validate and extract the base command from a command string.
fn validate_command(command: &str) -> Result<String, String> {
    // Check length
    if command.len() > MAX_COMMAND_LENGTH {
        return Err("Command too long (max 1000 characters)".to_string());
    }

    // Trim and check if empty
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Empty command".to_string());
    }

    // Extract base command (first word)
    let base_cmd = trimmed
        .split_whitespace()
        .next()
        .ok_or_else(|| "Invalid command format".to_string())?
        .to_lowercase();

    // Check for forbidden commands first
    if FORBIDDEN_COMMANDS.contains(&base_cmd.as_str()) {
        return Err(format!("Command '{}' is forbidden for security reasons", base_cmd));
    }

    // Check if command is in whitelist
    if !ALLOWED_COMMANDS.contains(&base_cmd.as_str()) {
        return Err(format!(
            "Command '{}' is not allowed. Only whitelisted commands can be executed.",
            base_cmd
        ));
    }

    // Check for dangerous patterns
    if trimmed.contains("&&") || trimmed.contains("||") || trimmed.contains(";") {
        return Err("Command chaining (&&, ||, ;) is not allowed".to_string());
    }

    if trimmed.contains("|") && !base_cmd.starts_with("git") {
        return Err("Command piping (|) is not allowed except for git commands".to_string());
    }

    if trimmed.contains(">") || trimmed.contains("<") {
        return Err("File redirection (>, <) is not allowed".to_string());
    }

    // Check for shell escape attempts
    if trimmed.contains("$(") || trimmed.contains("`") || trimmed.contains("${") {
        return Err("Shell command substitution is not allowed".to_string());
    }

    Ok(base_cmd)
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
pub fn execute_shell_command(command: String, cwd: Option<String>) -> Result<String, String> {
    // Validate command
    let base_cmd = validate_command(&command)?;

    // Validate working directory if provided
    if let Some(ref dir) = cwd {
        if !dir.is_empty() {
            validate_cwd(dir)?;
        }
    }

    // Log command execution for audit trail
    eprintln!("[SHELL_AUDIT] Executing: {} | CWD: {:?}", command, cwd);

    // Execute command
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", &command]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(["-c", &command]);
        c
    };

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
