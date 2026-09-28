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

const PROG_ID: &str = "JSONinja.json";
/// Used by the 1.x and 2.0 "Register as JSON Handler" menu item
const LEGACY_PROG_ID: &str = "JSONinja.Document";
const CAPABILITIES: &str = r"Software\JSONinja\Capabilities";
const CONTEXT_MENU: &str = r"SystemFileAssociations\.json\shell\Open with JSONinja";

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
    let exe_name = exe_name(exe);
    let command = format!("\"{}\" \"%1\"", exe.display());
    let icon = format!("\"{}\",0", exe.display());

    set(&classes, PROG_ID, "", "JavaScript Object Notation File")?;
    set(&classes, &format!(r"{PROG_ID}\DefaultIcon"), "", &icon)?;
    set(
        &classes,
        &format!(r"{PROG_ID}\shell\open"),
        "FriendlyAppName",
        "JSONinja",
    )?;
    set(
        &classes,
        &format!(r"{PROG_ID}\shell\open\command"),
        "",
        &command,
    )?;
    set(&classes, r".json\OpenWithProgids", PROG_ID, "")?;
    set(
        &classes,
        &format!(r"Applications\{exe_name}\shell\open\command"),
        "",
        &command,
    )?;
    set(&classes, CONTEXT_MENU, "", "Open with JSONinja")?;
    set(&classes, CONTEXT_MENU, "Icon", &icon)?;
    set(&classes, &format!(r"{CONTEXT_MENU}\command"), "", &command)?;

    let hkcu = hkcu();
    set(&hkcu, CAPABILITIES, "ApplicationName", "JSONinja")?;
    set(
        &hkcu,
        CAPABILITIES,
        "ApplicationDescription",
        "A small, fast JSON viewer",
    )?;
    set(
        &hkcu,
        &format!(r"{CAPABILITIES}\FileAssociations"),
        ".json",
        PROG_ID,
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
    let exe_name = exe_name(exe);

    // Missing keys and values are fine: they may never have been registered
    let _ = classes.delete_subkey_all(PROG_ID);
    let _ = classes.delete_subkey_all(format!(r"Applications\{exe_name}"));
    let _ = classes.delete_subkey_all(CONTEXT_MENU);
    if let Ok(progids) = classes.open_subkey_with_flags(r".json\OpenWithProgids", KEY_ALL_ACCESS) {
        let _ = progids.delete_value(PROG_ID);
    }

    let hkcu = hkcu();
    let _ = hkcu.delete_subkey_all(r"Software\JSONinja");
    if let Ok(apps) =
        hkcu.open_subkey_with_flags(r"Software\RegisteredApplications", KEY_ALL_ACCESS)
    {
        let _ = apps.delete_value(REGISTERED_APP);
    }

    remove_legacy(&classes);
    Ok(())
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
