# JSONinja - Advanced JSON Viewer

A fast, lightweight viewer for **JSON, JSON Lines, JSONC and JSON5**, built with Tauri. Installers are about 2-5 MB. Open huge files, search for values within the keys you care about, and fix broken files in place.

Website: [jsoninja.dabworx.com](https://jsoninja.dabworx.com)

## Features

### 🚀 Core Features
- **Multi-tab Interface** - Work with multiple JSON files simultaneously
- **Large File Support** - Handle massive JSON files with 1+ million lines efficiently
- **File Operations** - Load JSON files, paste content, or use recent files menu
- **Real-time Validation** - Instant JSON syntax validation and error reporting
- **JSON Lines, JSONC and JSON5** - Opens `.jsonl`/`.ndjson` (one record per line, each labeled with its line, with unreadable lines flagged individually), JSON with comments (`.jsonc`, and `.json` files like `tsconfig.json` that contain comments), and JSON5. Saving keeps the original format, comments included
- **Fix Broken Files** - Invalid JSON opens as text with the exact line and column of the problem highlighted. Fix it, watch it re-check as you type, and save it back
- **Edit and Save** - Edit any document with **Edit JSON** and save with `Ctrl/Cmd + S`; the file keeps its original line endings
- **Format & Minify** - Pretty-print or minify JSON with one click
- **Search & Navigation** - Powerful search with key/value filtering and highlighting
- **Tree View** - Collapsible JSON structure with state-preserving expand/collapse controls
- **Array Index Display** - Shows `[0]`, `[1]`, `[2]` indices for easy array navigation (toggleable)
- **String Length Badges** - Character count display for long strings with configurable threshold
- **Full-Screen Mode** - Distraction-free viewing with F11 toggle
- **Recent Files** - Quick access to your last 10 opened JSON files
- **Character Encoding Detection** - Automatic detection and handling of files with special characters (Latin-1/ISO-8859-1)
- **Windows Context Menu** - Right-click any .json file to open directly in JSONinja
- **Automatic Updates** - Offers new releases when they come out and installs them in one click (Help > Check for Updates Automatically to turn off)

### 🎨 Customization
- **4 Built-in Themes** - Dark, Light, GitHub, and Monokai with theme-aware rainbow brackets
- **Font Customization** - Choose from 5 coding fonts (Fira Code, Monaco, Source Code Pro, JetBrains Mono, Cascadia Code) with adjustable sizes
- **Color Coding** - Individual color controls for keys, strings, numbers, booleans, null values, and brackets
- **Rainbow Brackets** - 8-color cycling bracket system for visual nesting clarity
- **Display Options** - Toggle array indices, string length badges, line numbers, word wrap
- **Smart Settings** - Configurable string length threshold (10-100 characters)
- **State Preservation** - Tree expansion state maintained when toggling display options

### 🔍 Advanced Search
- **Multi-mode Search** - Search keys, values, or both
- **Search Within Keys** - Limit a value search to certain keys, e.g. find "okafor" only in `name` and `email` fields. See [Searching Within Keys](#searching-within-keys)
- **Real-time Highlighting** - Instant visual feedback
- **Navigation Controls** - Previous/next result navigation with keyboard shortcuts
- **Match Counter** - See total matches and current position

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + T` - New tab
- `Ctrl/Cmd + W` - Close tab
- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + S` - Save
- `Ctrl/Cmd + F` - Find/Search
- `Ctrl/Cmd + E` - Expand all
- `Ctrl/Cmd + Shift + E` - Collapse all
- `Ctrl/Cmd + ,` - Settings
- `F11` - Toggle full-screen mode
- `Esc` - Close dialogs/panels

## 📦 Downloads

Get the latest version from the **[Releases page](../../releases/latest)**:

| Platform | File |
|---|---|
| Windows installer | `JSONinja_<version>_x64-setup.exe` |
| Windows portable (no install) | `JSONinja-Portable-v<version>-x64.exe` |
| macOS (Intel + Apple Silicon) | `JSONinja_<version>_universal.dmg` |
| Linux | `.AppImage`, `.deb` or `.rpm` |

### Quick Install

**Windows:**
1. Run the installer, or just run the portable exe
2. Windows 11 already has everything needed. On Windows 10, the installer adds the WebView2 runtime if it's missing; the portable exe needs WebView2 to already be installed (it usually is, via Edge)

**macOS:**
1. Open the DMG and drag JSONinja to Applications
2. The app isn't notarized yet, so the first time, right-click it and choose **Open**

**Linux:**
1. Download the AppImage
2. Make executable: `chmod +x JSONinja*.AppImage`
3. Run it: `./JSONinja*.AppImage`

[View All Releases](../../releases) | [Report Issues](../../issues)

## Building from Source

### Prerequisites
- Node.js (v18 or higher)
- [Rust](https://rustup.rs/) (stable)
- The [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS (MSVC build tools on Windows, Xcode tools on macOS, WebKitGTK on Linux)
- Git

### Step 1: Clone the repository
```bash
git clone https://github.com/KrunchMuffin/JSONinja.git
cd JSONinja
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Run in development mode
```bash
npm run dev
```

### Step 4: Build (optional)
```bash
npm run build
```

Installers end up in `src-tauri/target/release/bundle/`, and the standalone exe/binary in `src-tauri/target/release/`.

### Build Targets
- **Windows**: NSIS installer + portable exe (x64)
- **macOS**: DMG (universal: Intel + Apple Silicon)
- **Linux**: AppImage + DEB + RPM (x64)

Releases are built by GitHub Actions when a `v*.*.*` tag is pushed. The workflow creates a draft release with notes from `CHANGELOG.md`.

## Usage Guide

### Getting Started
1. **Launch the app** - Start with the welcome screen
2. **Load JSON** - Click "Load JSON File" or "Paste JSON"
3. **Multi-tab** - Use Ctrl+T to open new tabs for multiple files
4. **Navigate** - Use the tree view to explore JSON structure

### Supported Formats

| Format | Extensions | How it's shown |
|---|---|---|
| JSON | `.json` | A collapsible tree |
| JSON Lines | `.jsonl`, `.ndjson` | One entry per record, labeled with its line in the file (`"line 12": {...}`). Lines that can't be read are listed in a banner and shown as text, so one bad line doesn't hide the rest |
| JSON with comments | `.jsonc`, and `.json` files with comments or trailing commas (`tsconfig.json`, VS Code settings) | The data as a tree. Edit JSON shows the comments, and saving keeps them |
| JSON5 | `.json5` | The data as a tree. `NaN` and `Infinity` are shown in quotes, since plain JSON has no way to write them |

A `.json` file (or pasted text) that isn't plain JSON is tried as JSON Lines, JSON with comments and JSON5 before it's reported as invalid.

### Loading JSON Data
- **From File**: Click "Load JSON File" or use Ctrl+O
- **Right-Click**: Right-click any JSON, JSON Lines, JSONC or JSON5 file and select "Open with JSONinja"
- **Recent Files**: Quick access to your last 10 opened files via menu
- **Paste**: Click "Paste JSON" and paste your content
- **Drag & Drop**: Drag JSON files directly onto the application

### Customizing Appearance
1. **Open Settings** - Click settings button or press Ctrl+,
2. **Choose Theme** - Select from Dark, Light, GitHub, or Monokai
3. **Adjust Fonts** - Pick font family and size
4. **Customize Colors** - Set colors for each JSON data type
5. **Configure Behavior** - Toggle features like auto-expand, data types, etc.

### Search Functionality
1. **Open Search** - Press Ctrl+F or click the search icon
2. **Choose Mode** - Select Keys, Values, or Both. With **Values**, you can also [search within keys](#searching-within-keys)
3. **Navigate Results** - Use arrow buttons or Enter/Shift+Enter
4. **Visual Feedback** - Matches are highlighted in yellow, current match in orange

### Searching Within Keys

Find a value only where it appears under certain keys, anywhere in the file:

1. Press **Ctrl+F** and select **Values**. An **in keys** box appears next to the search box.
2. In **in keys**, type the key names to search, separated by commas: `name, email`
3. Type what you're looking for in the search box: `okafor`

```json
"name": "Maya Okafor",               <- found
"email": "maya.okafor@example.com",  <- found
"notes": "Call Okafor first"         <- skipped: "notes" isn't listed
```

- Key names match exactly, ignoring case: `name` finds `name` and `Name`, not `username`
- The search text matches anywhere in the value, ignoring case
- Array items count under the array's key: `in keys: tags` searches every item in `"tags": [...]`
- In JSON Lines files it works across every record, e.g. `in keys: level` with `error` finds every error in a log
- Leave **in keys** empty to search all values

### Fixing and Editing Files
- **Broken files** open as text instead of just an error. The bar at the top says what's wrong and where (e.g. *expected `,` or `}` (line 5, column 3)*), that line is highlighted, and **Go to error** jumps to it. It re-checks as you type, and **View formatted** shows the tree once it's valid
- **Edit JSON** in the sidebar edits any document, and **Ctrl+S** saves it. Saving only writes to files you opened (or picked with Save As), keeps the file's line endings and permissions, and asks before you close a tab with unsaved changes
- **Very large files** (over 20,000 lines or 2 MB) are too big to edit in JSONinja; if one is broken, it shows the lines around the problem so you can fix it in a text editor

### View Controls
- **Expand/Collapse** - Click arrows next to objects/arrays (state preserved when toggling settings)
- **Expand All** - Ctrl+E expands everything
- **Collapse All** - Ctrl+Shift+E collapses everything
- **Array Indices** - Toggle `[0]`, `[1]`, `[2]` display for arrays (default: on)
- **String Length** - Show character count for long strings with configurable threshold
- ~~**Stats Bar**~~ - *Coming back soon!*
- ~~**Path Display**~~ - *Coming back soon!*
- **Rainbow Brackets** - Color-coded bracket nesting with 8-color cycle
- **Full Screen** - F11 for distraction-free viewing
- **Line Numbers** - Toggle in quick settings

## File Structure

```
JSONinja/
├── package.json             # Version number and the Tauri CLI
├── src/                     # The viewer (plain HTML/CSS/JS, no build step)
│   ├── index.html
│   ├── styles.css           # All application styles including themes
│   ├── renderer.js          # Application logic & state management
│   └── native-bridge.js     # Connects renderer.js to the Rust backend
├── src-tauri/               # Native side
│   ├── tauri.conf.json      # Window, security policy, bundling, file associations
│   ├── capabilities/        # What the page is allowed to call
│   └── src/
│       ├── main.rs          # Menus, commands, single instance, opening files
│       ├── files.rs         # Encoding detection, settings, recent files
│       └── registry.rs      # Windows "Open with JSONinja" registration
├── CHANGELOG.md
└── README.md
```

## Development

### Adding New Themes
1. Edit the CSS custom properties in `styles.css`
2. Add new theme option in `renderer.js`
3. Update theme selector in settings panel

### Adding New Features
1. **UI Components** - Add to `index.html` and style in `styles.css`
2. **Logic** - Implement in `renderer.js`
3. **Settings** - Add to settings object and persistence
4. **Keyboard Shortcuts** - Add to `handleKeyboardShortcuts` method

### Customizing Colors
The app uses CSS custom properties for theming:
- `--json-key` - Object keys
- `--json-string` - String values
- `--json-number` - Number values
- `--json-boolean` - Boolean values
- `--json-null` - Null values
- `--json-bracket` - Brackets and punctuation
- `--json-object` - Object bracket colors
- `--json-array` - Array bracket colors
- `.bracket-level-0` through `.bracket-level-7` - Rainbow bracket colors

## Troubleshooting

### Common Issues

**App won't start**
- Windows: make sure the Microsoft Edge WebView2 runtime is installed
- Linux: make sure WebKitGTK 4.1 is installed (`libwebkit2gtk-4.1-0` on Debian/Ubuntu)
- Building from source: run `npm install` and check the terminal for Rust errors

**.json files still open in another app (Windows)**
- Windows only lets you choose a default app yourself: use **File > System Integration > Make JSONinja the Default for JSON Files...** and pick JSONinja in Settings
- If they still open in the app you used before, it's a known issue on Windows 11 25H2: Settings saves your new choice, but an older saved choice from a previous Windows version can take priority. Go to **Settings > Apps > Default apps**, click **Reset** at the bottom, then make JSONinja the default again. Resetting also clears your choices for other file types

**JSON won't load**
- Verify JSON syntax is valid
- Check file encoding (should be UTF-8)
- Try pasting content instead of file loading

**Search not working**
- Ensure JSON is loaded and valid
- Check search mode (keys/values/both)
- Clear search and try again

**Settings not saving**
- Check file permissions in app data directory
- Try resetting to defaults
- Restart the application

### Performance
- Handles JSON files up to ~10-20MB (performance depends on structure complexity)
- Use "Collapse All" and disable array indices for better performance with large files
- String length badges can be disabled to reduce visual clutter
- Tree state preservation maintains performance during setting changes
- Search may be slower on very large files

### Platform-Specific Notes

**Windows**
- The installer registers JSONinja for `.json`, `.jsonl`, `.ndjson`, `.jsonc` and `.json5` files and lists it in **Settings > Default apps**. Windows only lets you choose a default app yourself, so if these files still open in something else, use **File > System Integration > Make JSONinja the Default for JSON Files...**, which opens JSONinja's page in Settings. The portable exe registers itself the same way when you use that menu item
- Uses the system WebView2 (Chromium-based Edge) engine

**macOS**
- Uses the system WebKit engine
- Not yet code-signed or notarized

**Linux**
- Uses WebKitGTK

## Contributing

Bug reports, ideas, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to build the app and what to include in a pull request. Please report security problems privately, as described in [SECURITY.md](SECURITY.md).

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

[MIT License](LICENSE) - feel free to use and modify as needed.

## Credits

Built with ❤️ using:
- Tauri - Small, secure cross-platform desktop apps
- [json5](https://github.com/json5/json5) - JSON5 parsing (MIT License, bundled in `src/vendor/`)
- Modern CSS - Custom properties and grid
- Vanilla JavaScript - No frameworks needed
