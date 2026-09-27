//! "Open with JSONinja" registration for the portable Windows build. The
//! installer registers the file association itself; this covers users who
//! just run the exe. Everything lives under HKCU, so no admin rights needed.

use std::io;
use std::path::Path;

use winreg::enums::{HKEY_CURRENT_USER, KEY_ALL_ACCESS};
use winreg::RegKey;

const PROG_ID: &str = "JSONinja.Document";
const CONTEXT_MENU: &str = r"SystemFileAssociations\.json\shell\Open with JSONinja";

fn classes() -> io::Result<RegKey> {
    RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(r"Software\Classes", KEY_ALL_ACCESS)
}

fn exe_name(exe: &Path) -> String {
    exe.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "JSONinja.exe".to_string())
}

pub fn register(exe: &Path) -> io::Result<()> {
    let classes = classes()?;
    let exe_name = exe_name(exe);
    let command = format!("\"{}\" \"%1\"", exe.display());
    let icon = format!("\"{}\",0", exe.display());

    let set = |key: &str, name: &str, value: &str| -> io::Result<()> {
        let (key, _) = classes.create_subkey(key)?;
        key.set_value(name, &value.to_string())
    };

    set(
        &format!(r"Applications\{exe_name}\shell\open\command"),
        "",
        &command,
    )?;
    set(&format!(r".json\OpenWithList\{exe_name}"), "", "")?;
    set(CONTEXT_MENU, "", "Open with JSONinja")?;
    set(CONTEXT_MENU, "Icon", &icon)?;
    set(&format!(r"{CONTEXT_MENU}\command"), "", &command)?;
    set(".json", "", PROG_ID)?;
    set(PROG_ID, "", "JSON Document")?;
    set(&format!(r"{PROG_ID}\DefaultIcon"), "", &icon)?;
    set(&format!(r"{PROG_ID}\shell\open\command"), "", &command)?;
    Ok(())
}

pub fn unregister(exe: &Path) -> io::Result<()> {
    let classes = classes()?;
    let exe_name = exe_name(exe);

    // Missing keys are fine: they may never have been registered
    let _ = classes.delete_subkey_all(format!(r"Applications\{exe_name}"));
    let _ = classes.delete_subkey_all(format!(r".json\OpenWithList\{exe_name}"));
    let _ = classes.delete_subkey_all(CONTEXT_MENU);
    let _ = classes.delete_subkey_all(PROG_ID);

    // Only clear the default handler if it still points at us
    if let Ok(json) = classes.open_subkey_with_flags(".json", KEY_ALL_ACCESS) {
        if json.get_value::<String, _>("").ok().as_deref() == Some(PROG_ID) {
            json.delete_value("")?;
        }
    }
    Ok(())
}
