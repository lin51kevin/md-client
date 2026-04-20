/// Windows Explorer context-menu integration (right-click "Open with MarkLite").
///
/// All registry keys are written to HKCU (no admin elevation needed).
/// The executable path is resolved from the current process at registration time,
/// so the entries survive across app updates.

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// ── Public Tauri commands ────────────────────────────────────────────

/// Register MarkLite in the Windows Explorer right-click context menu.
///
/// Adds three entries:
/// 1. `.md` / `.markdown` / `.txt` files → "Open with MarkLite"
/// 2. Directories (right-click folder) → "Open with MarkLite"
/// 3. Directory background (right-click empty area) → "Open with MarkLite"
#[tauri::command]
pub fn register_context_menu() -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Context menu registration is only supported on Windows.".into());
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let exe = current_exe_path()?;
        let icon_val = format!("{},0", exe);

        // ── 1. File types: use wildcard key + AppliesTo filter (most reliable for icon display) ──
        // This mirrors how VS Code / Notepad++ register file context menus.
        // Per-extension keys (HKCU\Software\Classes\.md\shell\...) often lose their icons
        // in the Windows 11 context menu; the wildcard key does not.
        let applies_to = "System.FileExtension:=.md \
                          OR System.FileExtension:=.markdown \
                          OR System.FileExtension:=.mdx \
                          OR System.FileExtension:=.txt";
        let file_verb  = "HKCU\\Software\\Classes\\*\\shell\\MarkLite";
        let file_cmd   = "HKCU\\Software\\Classes\\*\\shell\\MarkLite\\command";

        let _ = Command::new("reg")
            .args(["add", file_verb, "/ve", "/t", "REG_SZ", "/d", "Open with MarkLite", "/f"])
            .creation_flags(0x08000000)
            .output();
        let _ = Command::new("reg")
            .args(["add", file_verb, "/v", "MUIVerb", "/t", "REG_SZ", "/d", "Open with MarkLite", "/f"])
            .creation_flags(0x08000000)
            .output();
        let _ = Command::new("reg")
            .args(["add", file_verb, "/v", "Icon", "/t", "REG_SZ", "/d", &icon_val, "/f"])
            .creation_flags(0x08000000)
            .output();
        let _ = Command::new("reg")
            .args(["add", file_verb, "/v", "AppliesTo", "/t", "REG_SZ", "/d", applies_to, "/f"])
            .creation_flags(0x08000000)
            .output();
        let file_open_cmd = format!("\"{}\" \"%1\"", exe);
        let result = Command::new("reg")
            .args(["add", file_cmd, "/ve", "/t", "REG_SZ", "/d", &file_open_cmd, "/f"])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Failed to run reg: {}", e))?;
        if !result.status.success() {
            return Err(String::from_utf8_lossy(&result.stderr).to_string());
        }

        // ── 2. Directories: right-click a folder → open that folder as root ──
        let _ = reg_add(
            "HKCU\\Software\\Classes\\Directory\\shell\\MarkLite",
            &["/ve", "/t", "REG_SZ", "/d", "Open with MarkLite"],
        );
        let _ = reg_add(
            "HKCU\\Software\\Classes\\Directory\\shell\\MarkLite",
            &["/v", "MUIVerb", "/t", "REG_SZ", "/d", "Open with MarkLite"],
        );
        let _ = reg_add(
            "HKCU\\Software\\Classes\\Directory\\shell\\MarkLite",
            &["/v", "Icon", "/t", "REG_SZ", "/d", &icon_val],
        );
        let cmd = format!("\"{}\" \"%1\"", exe);
        reg_add(
            "HKCU\\Software\\Classes\\Directory\\shell\\MarkLite\\command",
            &["/ve", "/t", "REG_SZ", "/d", &cmd],
        )?;

        // ── 3. Directory background: right-click empty area → open that dir ──
        let _ = reg_add(
            "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MarkLite",
            &["/ve", "/t", "REG_SZ", "/d", "Open with MarkLite"],
        );
        let _ = reg_add(
            "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MarkLite",
            &["/v", "MUIVerb", "/t", "REG_SZ", "/d", "Open with MarkLite"],
        );
        let _ = reg_add(
            "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MarkLite",
            &["/v", "Icon", "/t", "REG_SZ", "/d", &icon_val],
        );
        let cmd = format!("\"{}\" \"%V\"", exe);
        reg_add(
            "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MarkLite\\command",
            &["/ve", "/t", "REG_SZ", "/d", &cmd],
        )?;

        // Notify the Shell of the association change so icons refresh immediately.
        let _ = Command::new("ie4uinit.exe")
            .args(["-show"])
            .creation_flags(0x08000000)
            .output();
    }

    Ok(())
}

/// Remove all MarkLite entries from the Windows Explorer context menu.
#[tauri::command]
pub fn unregister_context_menu() -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Context menu registration is only supported on Windows.".into());
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // Remove wildcard file-type entry (current approach)
        let _ = Command::new("reg")
            .args(["delete", "HKCU\\Software\\Classes\\*\\shell\\MarkLite", "/f"])
            .creation_flags(0x08000000)
            .output();

        // Remove per-extension entries from older registrations (cleanup)
        for ext in &[".md", ".markdown", ".mdx", ".txt"] {
            let key = format!("HKCU\\Software\\Classes\\{ext}\\shell\\MarkLite");
            let _ = Command::new("reg")
                .args(["delete", &key, "/f"])
                .creation_flags(0x08000000)
                .output();
        }

        // Remove directory entries
        for key in &[
            "HKCU\\Software\\Classes\\Directory\\shell\\MarkLite",
            "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MarkLite",
        ] {
            let _ = Command::new("reg")
                .args(["delete", key, "/f"])
                .creation_flags(0x08000000)
                .output();
        }
    }

    Ok(())
}

// ── Helpers ─────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn current_exe_path() -> Result<String, String> {
    std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Cannot resolve current executable: {}", e))
}

/// Write a single registry value via `reg add`.
/// `args_slice` must come in pairs: `/ve`+value or `/v`+name+type+value.
#[cfg(target_os = "windows")]
fn reg_add(key: &str, args: &[&str]) -> Result<(), String> {
    use std::process::Command;

    let result = Command::new("reg")
        .args(["add", key])
        .args(args)
        .args(["/f"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .map_err(|e| format!("Failed to run reg: {}", e))?;

    if !result.status.success() {
        Err(String::from_utf8_lossy(&result.stderr).to_string())
    } else {
        Ok(())
    }
}
