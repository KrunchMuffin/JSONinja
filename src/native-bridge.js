// Connects renderer.js to the Tauri backend. Result shapes match what the
// renderer expects ({ success, ... }), so the viewer code stays backend-agnostic.
(() => {
    if (!window.__TAURI__) return;

    const { invoke } = window.__TAURI__.core;
    const { listen } = window.__TAURI__.event;

    const onEvent = (name) => (callback) => listen(name, (event) => callback(event, event.payload));

    window.nativeAPI = {
        getVersion: () => window.__TAURI__.app.getVersion(),

        saveSettings: async (settings) => {
            try {
                await invoke('save_settings', { settings });
                return { success: true };
            } catch (error) {
                return { success: false, error: String(error) };
            }
        },
        loadSettings: async () => {
            try {
                return { success: true, settings: await invoke('load_settings') };
            } catch (error) {
                return { success: false, error: String(error) };
            }
        },

        // Files opened before this listener exists (command line, double-click)
        // are queued by the backend until we say we're ready
        onFileOpened: async (callback) => {
            await listen('file-opened', (event) => callback(event, event.payload));
            await invoke('frontend_ready');
        },
        reloadWithEncoding: async ({ filePath, encoding }) => {
            try {
                const result = await invoke('reload_with_encoding', { filePath, encoding });
                return { success: true, ...result };
            } catch (error) {
                return { success: false, error: String(error) };
            }
        },
        showOpenDialog: () => invoke('open_file_dialog'),

        onNewTab: onEvent('new-tab'),
        onCloseTab: onEvent('close-tab'),
        onToggleSettings: onEvent('toggle-settings'),
        onToggleSearch: onEvent('toggle-search'),
        onExpandAll: onEvent('expand-all'),
        onCollapseAll: onEvent('collapse-all'),

        onUpdateAvailable: onEvent('update-available'),
        onUpdateProgress: onEvent('update-progress'),
        // Only settles if the install fails; a successful install restarts the app
        installUpdate: async () => {
            try {
                await invoke('install_update');
                return { success: true };
            } catch (error) {
                return { success: false, error: String(error) };
            }
        },
        dismissUpdate: (version) => invoke('dismiss_update', { version }),
        openReleasesPage: () => invoke('open_releases_page')
    };
})();
