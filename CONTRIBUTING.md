# Contributing

Thanks for your interest in JSONinja! Bug reports, ideas, and pull requests are all welcome.

## Reporting Bugs and Requesting Features

Use the [issue templates](https://github.com/KrunchMuffin/JSONinja/issues/new/choose). For bugs, the app version (Help > About JSONinja), your OS version, and steps to reproduce make a big difference. If a specific file causes the problem, attach it or the smallest part of it that shows the issue.

Security problems should be reported privately; see [SECURITY.md](SECURITY.md).

## Making Changes

For anything bigger than a small fix, please open an issue first so we can agree on the approach before you spend time on it.

### Build and Run

You need [Node.js](https://nodejs.org/) 18+, [Rust](https://rustup.rs/) (stable), and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
npm install
npm run dev     # run with hot reload
npm run build   # build installers into src-tauri/target/release/bundle/
```

### Project Layout

- `src/renderer.js` - The viewer: tabs, rendering, search, settings (plain JavaScript, no build step)
- `src/index.html` / `src/styles.css` - Layout and themes
- `src/native-bridge.js` - Connects the viewer to the Rust backend
- `src-tauri/src/main.rs` - Menus, commands, single instance, opening files
- `src-tauri/src/files.rs` - Encoding detection, settings, recent files
- `src-tauri/src/registry.rs` - Windows "Open with JSONinja" registration
- `src-tauri/tauri.conf.json` - Window, Content-Security-Policy, bundling, file associations
- `src-tauri/capabilities/` - What the page is allowed to call

### Guidelines

- Keep pull requests focused on one change, and match the style of the surrounding code.
- There are no automated tests yet, so describe how you tested your change: which files you opened and what you checked. Screenshots help for anything visual.
- JSON content and file names are untrusted. Put them in the page with `textContent` or escape them; never build HTML from them directly.
- Scripts must keep working under the Content-Security-Policy: no inline `<script>` blocks or `onclick=` attributes.
- Keep the page's permissions minimal. File access goes through commands in `main.rs`, not Tauri plugins exposed to the page.
- Windows gets the most testing. macOS and Linux fixes are very welcome.

Every pull request is built automatically on Windows, macOS, and Linux; please make sure those builds pass.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
