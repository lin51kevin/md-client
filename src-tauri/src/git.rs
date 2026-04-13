/// Git integration commands — wraps system `git` CLI via std::process::Command.
///
/// We deliberately call the system `git` rather than embed git2 crate to:
/// - keep binary size compact
/// - reuse the user's existing credential helpers (SSH agent, keychain, etc.)
/// - simplify cross-platform builds (no OpenSSL linking headaches)
///
/// All commands are async — heavy git I/O runs on a blocking thread pool
/// so the Tauri main thread (and UI) stays responsive.

use std::process::Command;
use std::sync::{LazyLock, Mutex};

const MAX_OUTPUT_BYTES: usize = 1 * 1024 * 1024; // 1 MB

/// Global mutex to serialize all git operations, preventing index.lock conflicts
/// when multiple commands (stage, status, etc.) run concurrently.
static GIT_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

/// Remove stale `.git/index.lock` if it exists.
/// This file is left behind when a git process crashes or is killed mid-operation.
/// Without cleanup, all subsequent git index operations will fail.
fn cleanup_stale_lock(dir: &str) {
    let lock_path = std::path::Path::new(dir).join(".git").join("index.lock");
    if lock_path.exists() {
        // Try to remove it — if another process truly holds it, the next git
        // command will fail with a clear error anyway.
        let _ = std::fs::remove_file(&lock_path);
    }
}

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

/// Like run_git but truncates stdout instead of erroring when it exceeds the limit.
fn run_git_truncate(dir: &str, args: &[&str]) -> Result<String, String> {
    if dir.contains("..") {
        return Err("路径不允许包含 '..'".to_string());
    }

    let output = Command::new("git")
        .current_dir(dir)
        .args(args)
        .output()
        .map_err(|e| format!("无法执行 git: {}", e))?;

    if output.status.success() {
        let raw = &output.stdout;
        if raw.len() > MAX_OUTPUT_BYTES {
            let truncated = String::from_utf8_lossy(&raw[..MAX_OUTPUT_BYTES]).to_string();
            Ok(format!("{}\n\n… (输出过大，已截断，仅显示前 1 MB)", truncated))
        } else {
            Ok(String::from_utf8_lossy(raw).to_string())
        }
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
    pub staged: bool,    // true if changes are in the index (git add)
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
/// Returns an error string if `path` is not a git repo root.
#[tauri::command]
pub async fn git_get_repo(path: String) -> Result<GitRepo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        cleanup_stale_lock(&path);
        // Only accept if .git exists directly in this directory (no upward search)
        let git_dir = std::path::Path::new(&path).join(".git");
        if !git_dir.exists() {
            return Err("该目录不是 Git 仓库根目录".to_string());
        }

        run_git(&path, &["rev-parse", "--git-dir"])?;

        let branch = run_git(&path, &["rev-parse", "--abbrev-ref", "HEAD"])
            .unwrap_or_else(|_| "HEAD".to_string())
            .trim()
            .to_string();

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
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// Return the list of modified/untracked/etc. files in the working tree.
#[tauri::command]
pub async fn git_get_status(path: String) -> Result<Vec<GitFileStatus>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        cleanup_stale_lock(&path);
        let out = run_git(&path, &["status", "--porcelain", "-u"])?;
        let files = out
            .lines()
            .filter(|l| l.len() >= 3)
            .map(|l| {
                let xy = &l[..2];
                let x = xy.as_bytes()[0];
                let file_path = l[3..].trim();
                // X column (index) != ' ' and != '?' means file has staged changes
                let staged = x != b' ' && x != b'?';
                GitFileStatus {
                    path:   file_path.to_string(),
                    status: porcelain_status_to_string(xy).to_string(),
                    staged,
                }
            })
            .collect();
        Ok(files)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// Return the unified diff for a single file.
#[tauri::command]
pub async fn git_diff(path: String, file_path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        let diff = run_git_truncate(&path, &["diff", "HEAD", "--", &file_path])?;
        Ok(diff)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// Stage the given files and create a commit with the supplied message.
#[tauri::command]
pub async fn git_commit(path: String, message: String, files: Vec<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        cleanup_stale_lock(&path);
        if message.trim().is_empty() {
            return Err("提交信息不能为空".to_string());
        }
        if files.is_empty() {
            return Err("未选择任何文件".to_string());
        }

        for f in &files {
            run_git(&path, &["add", "--", f])?;
        }

        run_git(&path, &["commit", "-m", &message])?;
        Ok(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// Pull from the default upstream.
#[tauri::command]
pub async fn git_pull(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        cleanup_stale_lock(&path);
        run_git(&path, &["pull"])?;
        Ok(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// Push to the default upstream.
#[tauri::command]
pub async fn git_push(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        cleanup_stale_lock(&path);
        run_git(&path, &["push"])?;
        Ok(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// Stage (git add) the given files.
#[tauri::command]
pub async fn git_stage(path: String, files: Vec<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        cleanup_stale_lock(&path);
        if files.is_empty() {
            return Err("未选择任何文件".to_string());
        }
        for f in &files {
            run_git(&path, &["add", "--", f])?;
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// Restore (discard changes) for the given file.
#[tauri::command]
pub async fn git_restore(path: String, file_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        cleanup_stale_lock(&path);
        let status_out = run_git(&path, &["status", "--porcelain", "--", &file_path])?;
        let is_untracked = status_out.trim().starts_with("??");
        if is_untracked {
            run_git(&path, &["clean", "-fd", "--", &file_path])?;
        } else {
            run_git(&path, &["checkout", "HEAD", "--", &file_path])?;
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// Unstage the given files (git reset HEAD -- <files>).
#[tauri::command]
pub async fn git_unstage(path: String, files: Vec<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _lock = GIT_LOCK.lock().map_err(|e| format!("锁获取失败: {}", e))?;
        cleanup_stale_lock(&path);
        if files.is_empty() {
            return Err("未选择任何文件".to_string());
        }
        for f in &files {
            run_git(&path, &["reset", "HEAD", "--", f])?;
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}
