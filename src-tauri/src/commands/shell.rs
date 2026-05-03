use std::process::Command;

#[tauri::command]
pub fn execute_shell_command(command: String, cwd: Option<String>) -> Result<String, String> {
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

    let output = cmd.output().map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

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
        result = format!("Command exited with code: {}", output.status);
    }

    // Ensure output ends with newline for clean prompt display
    if !result.is_empty() && !result.ends_with('\n') {
        result.push('\n');
    }

    Ok(result)
}
