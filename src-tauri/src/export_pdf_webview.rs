//! PDF export via WebView2 PrintToPdf API.
//!
//! Creates a hidden WebviewWindow, loads the provided HTML content,
//! waits for the page to finish loading, then uses the platform WebView
//! to print to PDF silently (no dialog).
//!
//! Platform support:
//! - Windows: WebView2 ICoreWebView2_7::PrintToPdfAsync via webview2-com
//! - macOS/Linux: Fallback to window.print() (system dialog)

use std::sync::{Arc, Mutex};

/// Export HTML content to PDF via the WebView print-to-PDF API.
/// This command creates a hidden webview, loads the HTML, and uses
/// platform-specific APIs to generate the PDF file.
#[tauri::command]
pub async fn export_pdf_via_webview(
    app: tauri::AppHandle,
    html_content: String,
    output_path: String,
) -> Result<(), String> {
    crate::validate_user_path(&output_path)?;

    // Validate inputs
    if html_content.is_empty() {
        return Err("HTML content cannot be empty".into());
    }
    if html_content.len() > 100 * 1024 * 1024 {
        return Err("HTML content too large (>100MB)".into());
    }

    // Write HTML to a temporary file so the WebView can load it via file:// URL
    let tmp_dir = std::env::temp_dir();
    let tmp_name = format!(
        "marklite_pdf_{}_{}.html",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    let tmp_html_path = tmp_dir.join(&tmp_name);
    std::fs::write(&tmp_html_path, html_content.as_bytes())
        .map_err(|e| format!("Failed to write temp HTML: {e}"))?;

    let tmp_html_path_str = tmp_html_path.to_string_lossy().to_string();
    let output_path_clone = output_path.clone();

    // Use a channel to communicate result from the webview callback
    let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();
    let tx = Arc::new(Mutex::new(Some(tx)));

    // Navigate to the temp HTML file
    let file_url = format!("file:///{}", tmp_html_path_str.replace('\\', "/"));
    let url = tauri::WebviewUrl::External(
        tauri::Url::parse(&file_url).map_err(|e| format!("Invalid URL: {e}"))?
    );

    let tmp_path_for_cleanup = tmp_html_path.clone();
    let tx_clone = tx.clone();

    // Create hidden window for PDF rendering with on_page_load on builder
    let pdf_window = tauri::WebviewWindowBuilder::new(&app, "pdf-export", url)
        .title("PDF Export")
        .visible(false)
        .inner_size(794.0, 1123.0) // A4 at 96 DPI
        .on_page_load(move |wv, payload| {
            if payload.event() == tauri::webview::PageLoadEvent::Finished {
                let output = output_path_clone.clone();
                let tx_inner = tx_clone.clone();
                let tmp_cleanup = tmp_path_for_cleanup.clone();

                let wv_clone = wv.clone();
                std::thread::spawn(move || {
                    // Wait for rendering to complete
                    std::thread::sleep(std::time::Duration::from_millis(800));

                    let result = print_to_pdf_platform(&wv_clone, &output);

                    // Cleanup temp file
                    let _ = std::fs::remove_file(&tmp_cleanup);

                    // Close the hidden window
                    let _ = wv_clone.close();

                    // Send result
                    // Safety: This runs on a dedicated thread where no other code holds the lock.
                    // The sender is only accessed once (take()), and panicking here would only
                    // affect the print task, not the main application.
                    if let Some(sender) = tx_inner.lock().expect("print task mutex poisoned").take() {
                        let _ = sender.send(result);
                    }
                });
            }
        })
        .build()
        .map_err(|e| {
            let _ = std::fs::remove_file(&tmp_html_path);
            format!("Failed to create PDF webview: {e}")
        })?;

    // Wait for result with timeout
    match rx.recv_timeout(std::time::Duration::from_secs(30)) {
        Ok(result) => result,
        Err(_) => {
            let _ = pdf_window.close();
            let _ = std::fs::remove_file(&tmp_html_path);
            Err("PDF export timed out (30s)".into())
        }
    }
}

/// Platform-specific print-to-PDF implementation for Windows.
/// Uses WebView2 ICoreWebView2_7::PrintToPdf via the webview2-com crate.
#[cfg(target_os = "windows")]
fn print_to_pdf_platform<R: tauri::Runtime>(
    webview: &tauri::WebviewWindow<R>,
    output_path: &str,
) -> Result<(), String> {
    use std::sync::mpsc;

    let (done_tx, done_rx) = mpsc::channel::<Result<(), String>>();
    let output_path = output_path.to_string();

    webview
        .with_webview(move |platform_webview| {
            // Safety: Required by WebView2 COM API for PDF printing.
            // The COM interface pointers are obtained from the official WebView2 controller
            // and are guaranteed valid within this callback's scope.
            unsafe {
                use webview2_com::Microsoft::Web::WebView2::Win32::*;
                use windows::core::*;

                let controller = platform_webview.controller();
                let core: ICoreWebView2 = controller
                    .CoreWebView2()
                    .expect("Failed to get CoreWebView2");

                // Get ICoreWebView2_7 for PrintToPdf support
                let core7: ICoreWebView2_7 = match core.cast::<ICoreWebView2_7>() {
                    Ok(c) => c,
                    Err(e) => {
                        let _ = done_tx.send(Err(format!(
                            "WebView2 version too old for PrintToPdf: {e}"
                        )));
                        return;
                    }
                };

                // Get environment for print settings
                let env = match core
                    .cast::<ICoreWebView2_2>()
                    .and_then(|c2| c2.Environment())
                {
                    Ok(e) => e,
                    Err(e) => {
                        let _ = done_tx.send(Err(format!(
                            "Failed to get environment: {e}"
                        )));
                        return;
                    }
                };

                let env6: ICoreWebView2Environment6 = match env.cast() {
                    Ok(e) => e,
                    Err(e) => {
                        let _ = done_tx.send(Err(format!(
                            "WebView2 env version too old: {e}"
                        )));
                        return;
                    }
                };

                let settings: ICoreWebView2PrintSettings = match env6.CreatePrintSettings() {
                    Ok(s) => s,
                    Err(e) => {
                        let _ = done_tx.send(Err(format!(
                            "Failed to create print settings: {e}"
                        )));
                        return;
                    }
                };

                // Configure A4 page — margins are handled by CSS @page rules
                let _ = settings.SetOrientation(COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT);
                let _ = settings.SetPageWidth(8.27);   // A4 width in inches
                let _ = settings.SetPageHeight(11.69); // A4 height in inches
                let _ = settings.SetMarginTop(0.0);    // CSS handles margins
                let _ = settings.SetMarginBottom(0.0);
                let _ = settings.SetMarginLeft(0.0);
                let _ = settings.SetMarginRight(0.0);
                let _ = settings.SetShouldPrintBackgrounds(true);
                let _ = settings.SetShouldPrintHeaderAndFooter(false);
                let _ = settings.SetScaleFactor(1.0);

                // Convert output path to wide string
                let wide_path: HSTRING = HSTRING::from(&output_path);

                // Use webview2-com's PrintToPdfCompletedHandler
                let handler = webview2_com::PrintToPdfCompletedHandler::create(
                    Box::new(move |error_code, _is_success| {
                        let result = if error_code.is_ok() {
                            Ok(())
                        } else {
                            Err(format!("PrintToPdf failed: {:?}", error_code))
                        };
                        let _ = done_tx.send(result);
                        Ok(())
                    }),
                );

                // Call PrintToPdf
                if let Err(e) = core7.PrintToPdf(
                    PCWSTR(wide_path.as_ptr()),
                    &settings,
                    &handler,
                ) {
                    // If the call itself fails, we already consumed done_tx above
                    eprintln!("[export_pdf_webview] PrintToPdf call failed: {e}");
                }
            }
        })
        .map_err(|e| format!("with_webview failed: {e}"))?;

    // Wait for the async print operation to complete
    done_rx
        .recv_timeout(std::time::Duration::from_secs(25))
        .map_err(|_| "PrintToPdf timed out".to_string())?
}

/// Fallback for macOS/Linux — use webview eval to trigger window.print()
/// which opens the system print dialog where user can select "Save as PDF".
#[cfg(not(target_os = "windows"))]
fn print_to_pdf_platform<R: tauri::Runtime>(
    webview: &tauri::WebviewWindow<R>,
    _output_path: &str,
) -> Result<(), String> {
    webview
        .eval("window.print()")
        .map_err(|e| format!("Failed to trigger print: {e}"))?;
    // Give time for the dialog to appear
    std::thread::sleep(std::time::Duration::from_millis(1000));
    Ok(())
}

