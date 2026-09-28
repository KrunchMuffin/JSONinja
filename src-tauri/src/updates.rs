//! Update checks against the latest published GitHub release. Updates are
//! signed, and the updater refuses anything not signed with our key.

use std::fs;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

use crate::{files, show_error, show_info};

pub const RELEASES_PAGE: &str = "https://github.com/KrunchMuffin/JSONinja/releases/latest";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateSettings {
    pub auto_check: bool,
    /// Version the user closed the banner for; it isn't offered again on startup
    pub dismissed_version: Option<String>,
}

impl Default for UpdateSettings {
    fn default() -> Self {
        Self {
            auto_check: true,
            dismissed_version: None,
        }
    }
}

/// Payload for the renderer's `update-available` event.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateAvailable {
    version: String,
    can_install: bool,
}

#[derive(Clone, Serialize)]
struct UpdateProgress {
    downloaded: usize,
    total: Option<u64>,
}

pub fn load_settings(app: &AppHandle) -> UpdateSettings {
    files::data_dir(app)
        .ok()
        .and_then(|dir| fs::read_to_string(dir.join("update.json")).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn save_settings(app: &AppHandle, settings: &UpdateSettings) {
    let saved = files::data_dir(app).and_then(|dir| {
        let text = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
        fs::write(dir.join("update.json"), text).map_err(|e| e.to_string())
    });
    if let Err(e) = saved {
        eprintln!("Failed to save update settings: {e}");
    }
}

pub fn toggle_auto_check(app: &AppHandle) {
    let mut settings = load_settings(app);
    settings.auto_check = !settings.auto_check;
    save_settings(app, &settings);
}

pub fn dismiss(app: &AppHandle, version: String) {
    let mut settings = load_settings(app);
    settings.dismissed_version = Some(version);
    save_settings(app, &settings);
}

/// Whether this copy can replace itself. The Windows portable exe and Linux
/// deb/rpm installs can't, so they get a link to the download page instead.
fn can_self_update() -> bool {
    #[cfg(windows)]
    {
        // The NSIS installer puts its uninstaller next to the exe
        std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(|dir| dir.join("uninstall.exe").exists()))
            .unwrap_or(false)
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var_os("APPIMAGE").is_some()
    }
    #[cfg(target_os = "macos")]
    {
        true
    }
}

/// Startup checks stay quiet unless there's an update the user hasn't
/// dismissed; manual checks always report the result.
pub async fn check(app: AppHandle, manual: bool) {
    let result = match app.updater() {
        Ok(updater) => updater.check().await,
        Err(e) => Err(e),
    };

    match result {
        Ok(Some(update)) => {
            let dismissed = load_settings(&app).dismissed_version;
            if !manual && dismissed.as_deref() == Some(update.version.as_str()) {
                return;
            }
            let _ = app.emit(
                "update-available",
                UpdateAvailable {
                    version: update.version,
                    can_install: can_self_update(),
                },
            );
        }
        Ok(None) if manual => show_info(
            &app,
            "No Updates",
            format!(
                "You're running the latest version of JSONinja ({}).",
                app.package_info().version
            ),
        ),
        Ok(None) => {}
        Err(e) if manual => show_error(&app, format!("Couldn't check for updates: {e}")),
        Err(e) => eprintln!("Update check failed: {e}"),
    }
}

/// Downloads and installs the latest release, then restarts. On Windows the
/// installer takes over and relaunches the app itself.
pub async fn install(app: AppHandle) -> Result<(), String> {
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No update is available")?;

    let mut downloaded = 0;
    let progress_app = app.clone();
    update
        .download_and_install(
            move |chunk, total| {
                downloaded += chunk;
                let _ = progress_app.emit("update-progress", UpdateProgress { downloaded, total });
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string())?;

    app.restart();
}

pub fn open_releases_page(app: &AppHandle) {
    if let Err(e) = app.opener().open_url(RELEASES_PAGE, None::<&str>) {
        show_error(app, format!("Couldn't open the download page: {e}"));
    }
}
