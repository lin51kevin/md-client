/// Git integration commands — wraps system `git` CLI via std::process::Command.
///
/// We deliberately call the system `git` rather than embed git2 crate to:
/// - keep binary size compact
/// - reuse the user's existing credential helpers (SSH agent, keychain, etc.)
/// - simplify cross-platform builds (no OpenSSL linking headaches)
///
/// Each command validates the `path` argument and caps output to 1 MB for safety.

use std::process::Command;

const MAX_OUTPUT_BYTES: usize = 1 * 1024 * 1024; // 1 MB

/// Run a git command in the given directory and return stdout as String.
/// Errors include stderr when the process exits non-zero.
fn run_git(dir: &str, args: &[&str]) -> Result<String, String> {
    // Basic path validation — reject traversal attempts
    if dir.contains("..") {
        return Err("路径不允许包含 '..'".to_string());
    }

    let output = Command::new("git")
        .current_dir(dir)
        .args(args)
        .output()
        .map_err(|e| format!("无法执行 git: {}", e))?;

    if output.stdout.len() > MAX_OUTPUT_BYTES {
        return Err("git 输出过大，已截断".to_string());
    }

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(stderr.trim().to_string())
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct GitRepo {
    pub path:   String,
    pub branch: String,
    pub ahead:  i32,
    pub behind: i32,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct GitFileStatus {
    pub path:   String,
    pub status: String,  // "modified" | "added" | "deleted" | "untracked" | "renamed" | "conflicted"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn porcelain_status_to_string(xy: &str) -> &'static str {
    match xy {
        "M " | " M" | "MM" => "modified",
        "A " | " A"        => "added",
        "D " | " D"        => "deleted",
        "??"               => "untracked",
        "R " | " R"        => "renamed",
        "U " | " U" | "UU" | "AA" | "DD" => "conflicted",
        _                  => "modified",
    }
}

// ─── Commands ────────────────────────────────────────────────────────────────

/// Return basic repository info (branch, ahead/behind counts).
/// Returns an error string if `path` is not inside a git repo.
#[tauri::command]
pub fn git_get_repo(path: String) -> Result<GitRepo, String> {
    // Verify this is a git repo
    run_git(&path, &["rev-parse", "--git-dir"])?;

    // Current branch
    let branch = run_git(&path, &["rev-parse", "--abbrev-ref", "HEAD"])
        .unwrap_or_else(|_| "HEAD".to_string())
        .trim()
        .to_string();

    // Ahead / behind counts vs upstream (may not exist — treat as 0)
    let (ahead, behind) = if let Ok(out) = run_git(&path, &[
        "rev-list", "--left-right", "--count", "HEAD...@{upstream}"
    ]) {
        let parts: Vec<&str> = out.trim().split_whitespace().collect();
        let a = parts.first().and_then(|s| s.parse::<i32>().ok()).unwrap_or(0);
        let b = parts.get(1).and_then(|s| s.parse::<i32>().ok()).unwrap_or(0);
        (a, b)
    } else {
        (0, 0)
    };

    Ok(GitRepo { path, branch, ahead, behind })
}

/// Return the list of modified/untracked/etc. files in the working tree.
#[tauri::command]
pub fn git_get_status(path: String) -> Result<Vec<GitFileStatus>, String> {
    let out = run_git(&path, &["status", "--porcelain", "-u"])?;
    let files = out
        .lines()
        .filter(|l| l.len() >= 3)
        .map(|l| {
            let xy = &l[..2];
            let file_path = l[3..].trim();
            GitFileStatus {
                path:   file_path.to_string(),
                status: porcelain_status_to_string(xy).to_string(),
            }
        })
        .collect();
    Ok(files)
}

/// Return the unified diff for a single file.
#[tauri::command]
pub fn git_diff(path: String, file_path: String) -> Result<String, String> {
    // For untracked files git diff gives nothing, use diff --no-index
    let diff = run_git(&path, &["diff", "HEAD", "--", &file_path])?;
    Ok(diff)
}

/// Stage the given files and create a commit with the supplied message.
#[tauri::command]
pub fn git_commit(path: String, message: String, files: Vec<String>) -> Result<(), String> {
    if message.trim().is_empty() {
        return Err("提交信息不能为空".to_string());
    }
    if files.is_empty() {
        return Err("未选择任何文件".to_string());
    }

    // Stage selected files
    for f in &files {
        run_git(&path, &["add", "--", f])?;
    }

    // Commit
    run_git(&path, &["commit", "-m", &message])?;
    Ok(())
}

/// Pull from the default upstream.
#[tauri::command]
pub fn git_pull(path: String) -> Result<(), String> {
    run_git(&path, &["pull"])?;
    Ok(())
}

/// Push to the default upstream.
#[tauri::command]
pub fn git_push(path: String) -> Result<(), String> {
    run_git(&path, &["push"])?;
    Ok(())
}
