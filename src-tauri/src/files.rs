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

/// Where and why a document fails to parse, for the editor.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonProblem {
    pub message: String,
    pub line: usize,
    pub column: usize,
    /// Position in the text in UTF-16 code units, which is how JavaScript counts
    pub offset: usize,
}

/// serde_json reports exact positions on every platform, unlike the error
/// messages from the web engines' JSON.parse. Returns None for valid JSON.
pub fn json_problem(text: &str) -> Option<JsonProblem> {
    let err = serde_json::from_str::<serde::de::IgnoredAny>(text).err()?;
    let full = err.to_string();
    let message = match full.rfind(" at line ") {
        Some(end) => full[..end].to_string(),
        None => full,
    };

    // serde_json counts columns in bytes; convert to characters for the editor
    let line = err.line().max(1);
    let line_start: usize = text
        .split_inclusive('\n')
        .take(line - 1)
        .map(str::len)
        .sum();
    let mut byte_offset = (line_start + err.column().saturating_sub(1)).min(text.len());
    while !text.is_char_boundary(byte_offset) {
        byte_offset -= 1;
    }
    Some(JsonProblem {
        message,
        line,
        column: text[line_start..byte_offset].encode_utf16().count() + 1,
        offset: text[..byte_offset].encode_utf16().count(),
    })
}

/// Writes next to the file first and then swaps it in, so a failed save
/// never leaves a half-written file behind.
pub fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
    let file_name = path
        .file_name()
        .ok_or("Not a file path")?
        .to_string_lossy()
        .into_owned();
    let temp = path.with_file_name(format!(".{file_name}.jsoninja-save"));
    let original = fs::metadata(path).ok();

    write_private(&temp, content).map_err(|e| e.to_string())?;
    // The swapped-in file keeps the original's permissions, so saving a
    // private file (say, mode 0600) never makes it readable by others
    if let Some(original) = original {
        if let Err(e) = fs::set_permissions(&temp, original.permissions()) {
            let _ = fs::remove_file(&temp);
            return Err(e.to_string());
        }
    }
    fs::rename(&temp, path).map_err(|e| {
        let _ = fs::remove_file(&temp);
        e.to_string()
    })
}

/// Creates the file readable only by the current user until its final
/// permissions are set.
fn write_private(path: &Path, content: &str) -> std::io::Result<()> {
    use std::io::Write;

    let mut options = fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    file.write_all(content.as_bytes())?;
    file.sync_all()
}

/// Same folder the Electron builds used, so settings and recent files carry over.
pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_json_has_no_problem() {
        assert!(json_problem(r#"{"a": [1, 2], "b": null}"#).is_none());
    }

    #[test]
    fn missing_comma_points_at_the_next_key() {
        let text = "{\n  \"a\": [1]\n  \"b\": 2\n}";
        let problem = json_problem(text).unwrap();
        assert_eq!((problem.line, problem.column), (3, 3));
        assert_eq!(&text[problem.offset..problem.offset + 3], "\"b\"");
        assert_eq!(problem.message, "expected `,` or `}`");
    }

    #[test]
    fn positions_count_characters_not_bytes() {
        // The curly apostrophe is three bytes in UTF-8 but one character in the editor
        let text = "{\"overview\": \"Canada\u{2019}s largest\" \"x\": 1}";
        let problem = json_problem(text).unwrap();
        let error_at = text.find("\"x\"").unwrap();
        assert_eq!(problem.offset, text[..error_at].encode_utf16().count());
        assert_eq!(problem.column, problem.offset + 1);
    }

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("jsoninja-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn saving_replaces_the_file_and_leaves_no_temp_file() {
        let dir = temp_dir("save");
        let path = dir.join("data.json");
        fs::write(&path, "old").unwrap();
        write_atomic(&path, "{\"new\": true}").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "{\"new\": true}");
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn saving_keeps_restrictive_permissions() {
        use std::os::unix::fs::PermissionsExt;
        let dir = temp_dir("perms");
        let path = dir.join("secret.json");
        fs::write(&path, "{}").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();
        write_atomic(&path, "{\"token\": \"x\"}").unwrap();
        let mode = fs::metadata(&path).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o600);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn non_json_is_reported_at_the_start() {
        let problem = json_problem("PUT _ingest/pipeline/x\n{}").unwrap();
        assert_eq!((problem.line, problem.column, problem.offset), (1, 1, 0));
    }
}
