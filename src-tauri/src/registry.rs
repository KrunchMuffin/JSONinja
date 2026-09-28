//! Windows file registration. The installer registers JSONinja itself (see
//! windows/hooks.nsh); this does the same for the portable exe, using the same
//! names so both end up as one entry in Settings > Default apps. Everything
//! lives under HKCU, so no admin rights are needed.
//!
//! Windows won't let an app make itself the default: that choice is stored
//! under a hash only Settings can write. Registering makes JSONinja one of the
//! options, and the user picks it in Settings.

use std::io;
use std::path::Path;

use winreg::enums::{HKEY_CURRENT_USER, KEY_ALL_ACCESS};
use winreg::RegKey;

/// The value name under RegisteredApplications, which Settings links take
pub const REGISTERED_APP: &str = "JSONinja";

/// Extension, ProgID and file type description. Keep in sync with
/// fileAssociations in tauri.conf.json and windows/hooks.nsh.
const ASSOCIATIONS: [(&str, &str, &str); 5] = [
    ("json", "JSONinja.json", "JavaScript Object Notation File"),
    ("jsonl", "JSONinja.jsonl", "JSON Lines File"),
    ("ndjson", "JSONinja.jsonl", "JSON Lines File"),
    ("jsonc", "JSONinja.jsonc", "JSON with Comments File"),
    ("json5", "JSONinja.json5", "JSON5 File"),
];
/// Whoever this ProgID's command points at owns the shared registration
const MAIN_PROG_ID: &str = "JSONinja.json";
/// Used by the 1.x and 2.0 "Register as JSON Handler" menu item
const LEGACY_PROG_ID: &str = "JSONinja.Document";
const CAPABILITIES: &str = r"Software\JSONinja\Capabilities";

fn hkcu() -> RegKey {
    RegKey::predef(HKEY_CURRENT_USER)
}

fn classes() -> io::Result<RegKey> {
    hkcu().open_subkey_with_flags(r"Software\Classes", KEY_ALL_ACCESS)
}

fn exe_name(exe: &Path) -> String {
    exe.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "jsoninja.exe".to_string())
}

fn context_menu(ext: &str) -> String {
    format!(r"SystemFileAssociations\.{ext}\shell\Open with JSONinja")
}

/// Whether this exe was installed by the NSIS installer, which puts its
/// uninstaller alongside. Otherwise it's the portable exe.
pub fn is_installed() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|dir| dir.join("uninstall.exe").exists()))
        .unwrap_or(false)
}

fn set(root: &RegKey, key: &str, name: &str, value: &str) -> io::Result<()> {
    let (key, _) = root.create_subkey(key)?;
    key.set_value(name, &value.to_string())
}

pub fn register(exe: &Path) -> io::Result<()> {
    let classes = classes()?;
    let hkcu = hkcu();
    let command = format!("\"{}\" \"%1\"", exe.display());
    let icon = format!("\"{}\",0", exe.display());

    for (ext, prog_id, description) in ASSOCIATIONS {
        set(&classes, prog_id, "", description)?;
        set(&classes, &format!(r"{prog_id}\DefaultIcon"), "", &icon)?;
        set(
            &classes,
            &format!(r"{prog_id}\shell\open"),
            "FriendlyAppName",
            "JSONinja",
        )?;
        set(
            &classes,
            &format!(r"{prog_id}\shell\open\command"),
            "",
            &command,
        )?;
        set(&classes, &format!(r".{ext}\OpenWithProgids"), prog_id, "")?;

        let menu = context_menu(ext);
        set(&classes, &menu, "", "Open with JSONinja")?;
        set(&classes, &menu, "Icon", &icon)?;
        set(&classes, &format!(r"{menu}\command"), "", &command)?;

        set(
            &hkcu,
            &format!(r"{CAPABILITIES}\FileAssociations"),
            &format!(".{ext}"),
            prog_id,
        )?;
    }
    set(
        &classes,
        &format!(r"Applications\{}\shell\open\command", exe_name(exe)),
        "",
        &command,
    )?;

    set(&hkcu, CAPABILITIES, "ApplicationName", "JSONinja")?;
    set(
        &hkcu,
        CAPABILITIES,
        "ApplicationDescription",
        "A small, fast viewer for JSON, JSON Lines, JSONC and JSON5",
    )?;
    set(
        &hkcu,
        r"Software\RegisteredApplications",
        REGISTERED_APP,
        CAPABILITIES,
    )?;

    remove_legacy(&classes);
    Ok(())
}

pub fn unregister(exe: &Path) -> io::Result<()> {
    let classes = classes()?;
    let command = format!("\"{}\" \"%1\"", exe.display());

    // The installed copy uses the same names, so only remove what points at
    // this exe; otherwise an installed JSONinja would disappear from Default
    // apps. Missing keys and values are fine: they may never have been registered.
    let app_key = format!(r"Applications\{}", exe_name(exe));
    if points_to(
        &classes,
        &format!(r"{app_key}\shell\open\command"),
        &command,
    ) {
        let _ = classes.delete_subkey_all(&app_key);
    }
    for (ext, _, _) in ASSOCIATIONS {
        let menu = context_menu(ext);
        if points_to(&classes, &format!(r"{menu}\command"), &command) {
            let _ = classes.delete_subkey_all(&menu);
        }
    }

    if points_to(
        &classes,
        &format!(r"{MAIN_PROG_ID}\shell\open\command"),
        &command,
    ) {
        for (ext, prog_id, _) in ASSOCIATIONS {
            let _ = classes.delete_subkey_all(prog_id);
            if let Ok(progids) =
                classes.open_subkey_with_flags(format!(r".{ext}\OpenWithProgids"), KEY_ALL_ACCESS)
            {
                let _ = progids.delete_value(prog_id);
            }
        }

        let hkcu = hkcu();
        let _ = hkcu.delete_subkey_all(r"Software\JSONinja");
        if let Ok(apps) =
            hkcu.open_subkey_with_flags(r"Software\RegisteredApplications", KEY_ALL_ACCESS)
        {
            let _ = apps.delete_value(REGISTERED_APP);
        }
    }

    remove_legacy(&classes);
    Ok(())
}

/// Whether the command under `key` runs `command`. A missing key counts as
/// ours, since there's nothing another copy of JSONinja could lose.
fn points_to(classes: &RegKey, key: &str, command: &str) -> bool {
    match classes.open_subkey(key) {
        Ok(key) => key
            .get_value::<String, _>("")
            .map(|current| current.eq_ignore_ascii_case(command))
            .unwrap_or(true),
        Err(_) => true,
    }
}

/// Older versions registered a different ProgID and pointed .json straight at it
fn remove_legacy(classes: &RegKey) {
    let _ = classes.delete_subkey_all(LEGACY_PROG_ID);
    if let Ok(json) = classes.open_subkey_with_flags(".json", KEY_ALL_ACCESS) {
        if json.get_value::<String, _>("").ok().as_deref() == Some(LEGACY_PROG_ID) {
            let _ = json.delete_value("");
        }
        if let Ok(list) = json.open_subkey_with_flags("OpenWithList", KEY_ALL_ACCESS) {
            let _ = list.delete_subkey_all("JSONinja.exe");
        }
    }
}
