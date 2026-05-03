use std::process::Command;

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
        result = format!("Command exited with code: {}", output.status);
    }

    // Ensure output ends with newline for clean prompt display
    if !result.is_empty() && !result.ends_with('\n') {
        result.push('\n');
    }

    Ok(result)
}
