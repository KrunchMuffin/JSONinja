use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};

const UTF8_BOM: &[u8] = b"\xEF\xBB\xBF";
const MAX_RECENT_FILES: usize = 10;

/// Payload for the renderer's `file-opened` event and encoding reloads.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedFile {
    pub content: String,
    pub file_name: String,
    pub file_path: String,
    pub encoding: String,
    pub has_encoding_issues: bool,
    pub was_auto_detected: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub path: String,
    pub name: String,
    pub timestamp: u64,
}

fn strip_bom(bytes: &[u8]) -> &[u8] {
    bytes.strip_prefix(UTF8_BOM).unwrap_or(bytes)
}

// ISO-8859-1 maps every byte to the code point with the same value
fn decode_latin1(bytes: &[u8]) -> String {
    bytes.iter().map(|&b| b as char).collect()
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn opened_file(
    path: &Path,
    content: String,
    encoding: &str,
    has_encoding_issues: bool,
    was_auto_detected: bool,
) -> OpenedFile {
    OpenedFile {
        content,
        file_name: file_name(path),
        file_path: path.to_string_lossy().into_owned(),
        encoding: encoding.to_string(),
        has_encoding_issues,
        was_auto_detected,
    }
}

/// Reads a file as UTF-8. If that produces replacement characters, falls back
/// to Latin-1 when the Latin-1 text is valid JSON; otherwise keeps UTF-8 and
/// flags the problem so the renderer can offer other encodings.
pub fn read_detected(path: &Path) -> std::io::Result<OpenedFile> {
    let bytes = fs::read(path)?;
    let bytes = strip_bom(&bytes);
    let utf8 = String::from_utf8_lossy(bytes);

    if !utf8.contains('\u{FFFD}') {
        return Ok(opened_file(path, utf8.into_owned(), "utf-8", false, false));
    }

    let latin1 = decode_latin1(bytes);
    if serde_json::from_str::<serde::de::IgnoredAny>(&latin1).is_ok() {
        return Ok(opened_file(path, latin1, "latin1", false, true));
    }

    Ok(opened_file(path, utf8.into_owned(), "utf-8", true, false))
}

pub fn read_with_encoding(path: &Path, encoding: &str) -> Result<OpenedFile, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let content = match encoding {
        "utf-8" => String::from_utf8_lossy(strip_bom(&bytes)).into_owned(),
        "latin1" => decode_latin1(&bytes),
        "cp1252" | "windows-1252" | "win1252" => encoding_rs::WINDOWS_1252
            .decode_without_bom_handling(&bytes)
            .0
            .into_owned(),
        _ => return Err(format!("Unsupported encoding: {encoding}")),
    };
    Ok(opened_file(path, content, encoding, false, false))
}

/// Same folder the Electron builds used, so settings and recent files carry over.
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .config_dir()
        .map_err(|e| e.to_string())?
        .join("jsoninja");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn load_settings(app: &AppHandle) -> Result<Option<Value>, String> {
    let path = data_dir(app)?.join("settings.json");
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&text)
        .map(Some)
        .map_err(|e| e.to_string())
}

pub fn save_settings(app: &AppHandle, settings: &Value) -> Result<(), String> {
    let text = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(data_dir(app)?.join("settings.json"), text).map_err(|e| e.to_string())
}

pub fn load_recent(app: &AppHandle) -> Vec<RecentFile> {
    data_dir(app)
        .ok()
        .and_then(|dir| fs::read_to_string(dir.join("recent-files.json")).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

pub fn add_recent(app: &AppHandle, path: &Path) -> Result<(), String> {
    let path_str = path.to_string_lossy().into_owned();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or_default();

    let mut recent = load_recent(app);
    recent.retain(|file| file.path != path_str);
    recent.insert(
        0,
        RecentFile {
            path: path_str,
            name: file_name(path),
            timestamp,
        },
    );
    recent.truncate(MAX_RECENT_FILES);

    let text = serde_json::to_string_pretty(&recent).map_err(|e| e.to_string())?;
    fs::write(data_dir(app)?.join("recent-files.json"), text).map_err(|e| e.to_string())
}
