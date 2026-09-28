# JSONinja - Advanced JSON Viewer

A powerful, feature-rich JSON viewer built with Tauri. Installers are about 1-10 MB. Navigate large JSON structures with ease using array indices, string length indicators, full-screen mode, and advanced customization options.

## Features

### 🚀 Core Features
- **Multi-tab Interface** - Work with multiple JSON files simultaneously
- **Large File Support** - Handle massive JSON files with 1+ million lines efficiently
- **File Operations** - Load JSON files, paste content, or use recent files menu
- **Real-time Validation** - Instant JSON syntax validation and error reporting
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
- **Real-time Highlighting** - Instant visual feedback
- **Navigation Controls** - Previous/next result navigation with keyboard shortcuts
- **Match Counter** - See total matches and current position

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + T` - New tab
- `Ctrl/Cmd + W` - Close tab
- `Ctrl/Cmd + O` - Open file
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

### Loading JSON Data
- **From File**: Click "Load JSON File" or use Ctrl+O
- **Right-Click**: Right-click any .json file and select "Open with JSONinja"
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
2. **Choose Mode** - Select Keys, Values, or Both
3. **Navigate Results** - Use arrow buttons or Enter/Shift+Enter
4. **Visual Feedback** - Matches are highlighted in yellow, current match in orange

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
- **Word Wrap** - Enable for long lines

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
- The installer registers JSONinja for `.json` files; the portable exe can do the same from **File > System Integration**
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
- Modern CSS - Custom properties and grid
- Vanilla JavaScript - No frameworks needed
