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
- `src/formats.js` - Reads JSON, JSON Lines, JSONC and JSON5, and finds where a document fails to parse
- `src/vendor/` - Bundled third-party code (the `json5` parser), with its license
- `src/native-bridge.js` - Connects the viewer to the Rust backend
- `src-tauri/src/main.rs` - Menus, commands, single instance, opening files
- `src-tauri/src/files.rs` - Encoding detection, settings, recent files
- `src-tauri/src/registry.rs` - Windows "Open with JSONinja" registration
- `src-tauri/src/updates.rs` - Update checks and installs
- `src-tauri/tauri.conf.json` - Window, Content-Security-Policy, bundling, file associations, updater public key
- `src-tauri/tauri.release.conf.json` - Release-only settings; release builds sign their update files, which needs the project's private key, so building from source leaves it out
- `src-tauri/tauri.signing.conf.json` - Windows release builds only: signs the Windows files with the project's certificate (see [Signing](#signing))
- `packaging/windows/` - The Windows signing script and its settings
- `docs/` - The website at [jsoninja.dabworx.com](https://jsoninja.dabworx.com), served by GitHub Pages
- `src-tauri/capabilities/` - What the page is allowed to call

### Guidelines

- Keep pull requests focused on one change, and match the style of the surrounding code.
- There are no automated tests yet, so describe how you tested your change: which files you opened and what you checked. Screenshots help for anything visual.
- JSON content and file names are untrusted. Put them in the page with `textContent` or escape them; never build HTML from them directly.
- Scripts must keep working under the Content-Security-Policy: no inline `<script>` blocks or `onclick=` attributes.
- Keep the page's permissions minimal. File access goes through commands in `main.rs`, not Tauri plugins exposed to the page.
- Windows gets the most testing. macOS and Linux fixes are very welcome.

Every pull request is built automatically on Windows, macOS, and Linux; please make sure those builds pass.

## Signing

For maintainers. The Windows files are signed with DAB Worx's certificate in Microsoft's Azure Artifact Signing (called Trusted Signing until 2025), so Windows names DAB Worx Inc. as the publisher. In [`release.yml`](.github/workflows/release.yml), Tauri signs `jsoninja.exe`, the uninstaller and the installer while it builds, through the `signCommand` in [`src-tauri/tauri.signing.conf.json`](src-tauri/tauri.signing.conf.json), and then signs the update file over the signed installer. Tauri puts the unsigned exe back afterwards, so the workflow signs the portable exe itself. All of it goes through [`packaging/windows/sign.ps1`](packaging/windows/sign.ps1), which uses Microsoft's `ArtifactSigning` PowerShell module and checks that each file ends up with a valid, timestamped signature. The macOS and Linux builds aren't signed this way.

Which certificate is set in [`packaging/windows/signing.json`](packaging/windows/signing.json): the account's endpoint ("Account URI"), the account name and the certificate profile name. None of them is a secret. `pwsh packaging/windows/sign.ps1 -Check` says whether signing is set up.

GitHub signs in to Azure as an app registration that holds only the **Artifact Signing Certificate Profile Signer** role on the signing account. To set it up, run this once on your computer after `Connect-AzAccount`:

```powershell
pwsh packaging/windows/setup-github-signing.ps1
```

It makes the app registration "JSONinja GitHub signing" (or reuses it), gives it the role, makes a client secret good for two years, and stores `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` as the repository's Actions secrets with the GitHub CLI. The secret is never printed or saved to a file. Run it again before the date it prints to give GitHub a new secret.

Every run of `release.yml` is a release, so the Windows build stops if those secrets are missing rather than publish unsigned files. Builds from source and the pull request builds are unsigned.

To sign on your own computer, install the .NET 8 runtime (`winget install Microsoft.DotNet.Runtime.8`), sign in once with `az login` or `Connect-AzAccount` as an account that has the signer role, then run `pwsh packaging/windows/sign.ps1 <file>`. To build signed files locally, add `--config src-tauri/tauri.signing.conf.json` to `npx tauri build`.

Signed files can still get a SmartScreen warning at first; SmartScreen also goes by how many people have run a program, and that builds up after each release.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
