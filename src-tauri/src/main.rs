// Hide the console window on Windows release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod files;
#[cfg(windows)]
mod registry;
mod updates;

use std::collections::HashSet;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde_json::Value;
use tauri::menu::{CheckMenuItemBuilder, Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, DragDropEvent, Emitter, Manager, State, WindowEvent, Wry};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

/// Menu items whose ids double as the event names renderer.js listens for.
const RENDERER_ACTIONS: [&str; 6] = [
    "new-tab",
    "close-tab",
    "toggle-settings",
    "toggle-search",
    "expand-all",
    "collapse-all",
];

#[derive(Default)]
struct AppState(Mutex<Inner>);

#[derive(Default)]
struct Inner {
    /// Files opened before the renderer is listening wait here
    frontend_ready: bool,
    pending: Vec<PathBuf>,
    /// The renderer may only re-read files the user opened, never arbitrary paths
    opened: HashSet<PathBuf>,
    /// Ctrl+O can arrive from both the menu and the page; only show one dialog
    dialog_open: bool,
}

fn show_error(app: &AppHandle, message: String) {
    app.dialog()
        .message(message)
        .title("Error")
        .kind(MessageDialogKind::Error)
        .show(|_| {});
}

fn show_info(app: &AppHandle, title: &str, message: String) {
    app.dialog()
        .message(message)
        .title(title)
        .kind(MessageDialogKind::Info)
        .show(|_| {});
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn open_paths(app: &AppHandle, paths: Vec<PathBuf>) {
    let paths: Vec<PathBuf> = paths.into_iter().filter(|p| p.is_file()).collect();
    if paths.is_empty() {
        return;
    }

    {
        let state = app.state::<AppState>();
        let mut inner = state.0.lock().unwrap();
        if !inner.frontend_ready {
            inner.pending.extend(paths);
            return;
        }
    }

    for path in paths {
        open_path(app, &path);
    }
    focus_main_window(app);
}

fn open_path(app: &AppHandle, path: &Path) {
    let file = match files::read_detected(path) {
        Ok(file) => file,
        Err(e) => return show_error(app, format!("Failed to open file: {e}")),
    };

    app.state::<AppState>()
        .0
        .lock()
        .unwrap()
        .opened
        .insert(path.to_path_buf());
    let _ = app.emit("file-opened", file);

    if files::add_recent(app, path).is_ok() {
        refresh_menu(app);
    }
}

/// Existing files named on a command line, resolved against that process's working directory.
fn file_args(args: impl IntoIterator<Item = OsString>, cwd: &Path) -> Vec<PathBuf> {
    args.into_iter()
        .map(|arg| cwd.join(arg))
        .filter(|path| path.is_file())
        .collect()
}

fn show_open_dialog(app: &AppHandle) {
    {
        let state = app.state::<AppState>();
        let mut inner = state.0.lock().unwrap();
        if inner.dialog_open {
            return;
        }
        inner.dialog_open = true;
    }

    let handle = app.clone();
    let mut dialog = app
        .dialog()
        .file()
        .add_filter("JSON Files", &["json"])
        .add_filter("All Files", &["*"]);
    if let Some(window) = app.get_webview_window("main") {
        dialog = dialog.set_parent(&window);
    }
    dialog.pick_file(move |file| {
        handle.state::<AppState>().0.lock().unwrap().dialog_open = false;
        if let Some(path) = file.and_then(|f| f.into_path().ok()) {
            open_paths(&handle, vec![path]);
        }
    });
}

fn toggle_fullscreen(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let fullscreen = window.is_fullscreen().unwrap_or(false);
        let _ = window.set_fullscreen(!fullscreen);
    }
}

#[cfg(windows)]
fn set_file_handler(app: &AppHandle, register: bool) {
    let result = std::env::current_exe().and_then(|exe| {
        if register {
            registry::register(&exe)
        } else {
            registry::unregister(&exe)
        }
    });
    match (result, register) {
        (Ok(()), true) => show_info(
            app,
            "Success",
            "JSONinja has been registered as a JSON file handler.\n\nYou can now right-click JSON files and select \"Open with JSONinja\".".into(),
        ),
        (Ok(()), false) => show_info(app, "Success", "JSONinja file associations have been removed.".into()),
        (Err(e), _) => show_error(app, format!("Failed to update file association: {e}")),
    }
}

#[cfg(target_os = "macos")]
fn set_file_handler(app: &AppHandle, _register: bool) {
    show_info(
        app,
        "macOS File Association",
        "To associate JSON files with JSONinja:\n\n1. Right-click any .json file\n2. Select \"Get Info\"\n3. Under \"Open with\", select JSONinja\n4. Click \"Change All...\"".into(),
    );
}

#[cfg(target_os = "linux")]
fn set_file_handler(app: &AppHandle, _register: bool) {
    show_info(
        app,
        "Linux File Association",
        "File association on Linux varies by desktop environment.\n\nRight-click a JSON file and look for \"Open With\" or \"Properties\" to set JSONinja as the default handler.".into(),
    );
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let item = |id: &str, text: &str, accelerator: &str| {
        MenuItemBuilder::with_id(id, text)
            .accelerator(accelerator)
            .build(app)
    };

    let recent = files::load_recent(app);
    let mut recent_menu = SubmenuBuilder::new(app, "Recent Files");
    if recent.is_empty() {
        recent_menu = recent_menu.item(
            &MenuItemBuilder::new("No recent files")
                .enabled(false)
                .build(app)?,
        );
    }
    for (index, file) in recent.iter().enumerate() {
        recent_menu = recent_menu.text(format!("recent-{index}"), &file.name);
    }

    let mut file_menu = SubmenuBuilder::new(app, "File")
        .item(&item("open", "Open JSON File...", "CmdOrCtrl+O")?)
        .item(&recent_menu.build()?)
        .separator()
        .item(&item("new-tab", "New Tab", "CmdOrCtrl+T")?)
        .item(&item("close-tab", "Close Tab", "CmdOrCtrl+W")?)
        .separator()
        .item(&item("toggle-settings", "Settings", "CmdOrCtrl+,")?)
        .separator()
        .item(
            &SubmenuBuilder::new(app, "System Integration")
                .text("register-handler", "Register as JSON Handler")
                .text("unregister-handler", "Unregister as JSON Handler")
                .build()?,
        );
    // macOS keeps Quit in the app menu
    if !cfg!(target_os = "macos") {
        file_menu = file_menu.separator().quit();
    }

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .separator()
        .item(&item("toggle-search", "Find", "CmdOrCtrl+F")?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .text("fullscreen", "Toggle Full Screen")
        .separator()
        .item(&item("expand-all", "Expand All", "CmdOrCtrl+E")?)
        .item(&item("collapse-all", "Collapse All", "CmdOrCtrl+Shift+E")?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .text("check-updates", "Check for Updates...")
        .item(
            &CheckMenuItemBuilder::with_id("auto-update", "Check for Updates Automatically")
                .checked(updates::load_settings(app).auto_check)
                .build(app)?,
        )
        .separator()
        .text("about", "About JSONinja")
        .build()?;

    let menu = MenuBuilder::new(app);
    #[cfg(target_os = "macos")]
    let menu = menu.item(
        &SubmenuBuilder::new(app, "JSONinja")
            .text("about", "About JSONinja")
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?,
    );
    menu.item(&file_menu.build()?)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&help_menu)
        .build()
}

fn refresh_menu(app: &AppHandle) {
    match build_menu(app) {
        Ok(menu) => {
            let _ = app.set_menu(menu);
        }
        Err(e) => eprintln!("Failed to rebuild menu: {e}"),
    }
}

fn handle_menu(app: &AppHandle, id: &str) {
    match id {
        "open" => show_open_dialog(app),
        "fullscreen" => toggle_fullscreen(app),
        "register-handler" => set_file_handler(app, true),
        "unregister-handler" => set_file_handler(app, false),
        "check-updates" => {
            tauri::async_runtime::spawn(updates::check(app.clone(), true));
        }
        "auto-update" => {
            updates::toggle_auto_check(app);
            refresh_menu(app);
        }
        "about" => show_info(
            app,
            "About JSONinja",
            format!(
                "JSONinja - Advanced JSON Viewer v{}\n\nA powerful, customizable JSON viewer with multi-tab support.\nBuilt with Tauri.",
                app.package_info().version
            ),
        ),
        action if RENDERER_ACTIONS.contains(&action) => {
            let _ = app.emit(action, ());
        }
        recent => {
            let index = recent.strip_prefix("recent-").and_then(|i| i.parse::<usize>().ok());
            if let Some(file) = index.and_then(|i| files::load_recent(app).into_iter().nth(i)) {
                open_paths(app, vec![PathBuf::from(file.path)]);
            }
        }
    }
}

#[tauri::command]
fn frontend_ready(app: AppHandle) {
    let pending = {
        let state = app.state::<AppState>();
        let mut inner = state.0.lock().unwrap();
        inner.frontend_ready = true;
        std::mem::take(&mut inner.pending)
    };
    open_paths(&app, pending);

    // Checking now means the renderer is listening for the result
    if updates::load_settings(&app).auto_check {
        tauri::async_runtime::spawn(updates::check(app.clone(), false));
    }
}

#[tauri::command]
fn open_file_dialog(app: AppHandle) {
    show_open_dialog(&app);
}

#[tauri::command]
fn reload_with_encoding(
    state: State<AppState>,
    file_path: String,
    encoding: String,
) -> Result<files::OpenedFile, String> {
    let path = PathBuf::from(file_path);
    if !state.0.lock().unwrap().opened.contains(&path) {
        return Err("Reload is only allowed for files opened in JSONinja".into());
    }
    files::read_with_encoding(&path, &encoding)
}

#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    updates::install(app).await
}

#[tauri::command]
fn dismiss_update(app: AppHandle, version: String) {
    updates::dismiss(&app, version);
}

#[tauri::command]
fn open_releases_page(app: AppHandle) {
    updates::open_releases_page(&app);
}

#[tauri::command]
fn load_settings(app: AppHandle) -> Result<Option<Value>, String> {
    files::load_settings(&app)
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: Value) -> Result<(), String> {
    files::save_settings(&app, &settings)
}

fn main() {
    let app = tauri::Builder::default()
        // Must be registered first so a second launch hands its files to this one
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            focus_main_window(app);
            let args = argv.into_iter().skip(1).map(OsString::from);
            open_paths(app, file_args(args, Path::new(&cwd)));
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            let handle = app.handle();
            app.set_menu(build_menu(handle)?)?;
            app.on_menu_event(|app, event| handle_menu(app, event.id().as_ref()));

            let cwd = std::env::current_dir().unwrap_or_default();
            open_paths(handle, file_args(std::env::args_os().skip(1), &cwd));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, .. }) = event {
                open_paths(window.app_handle(), paths.clone());
            }
        })
        .invoke_handler(tauri::generate_handler![
            frontend_ready,
            open_file_dialog,
            reload_with_encoding,
            load_settings,
            save_settings,
            install_update,
            dismiss_update,
            open_releases_page
        ])
        .build(tauri::generate_context!())
        .expect("error while building JSONinja");

    app.run(|_app, _event| {
        // macOS delivers double-clicked files as an event instead of argv
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = _event {
            let paths = urls
                .into_iter()
                .filter_map(|url| url.to_file_path().ok())
                .collect();
            open_paths(_app, paths);
        }
    });
}
