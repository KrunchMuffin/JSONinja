# JSONinja - Advanced JSON Viewer

A powerful, feature-rich JSON viewer built with Electron. Navigate large JSON structures with ease using array indices, string length indicators, full-screen mode, and advanced customization options.

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

### Latest Release (v1.3.2)

- **Windows Installer**: [JSONinja-Setup.exe](../../releases/latest/download/JSONinja-Setup-v1.3.2-x64.exe)
- **Windows Portable**: [JSONinja-Portable.exe](../../releases/latest/download/JSONinja-Portable-v1.3.2-x64.exe)
- **macOS**: [JSONinja.dmg](../../releases/latest/download/JSONinja-v1.3.2.dmg)
- **Linux AppImage**: [JSONinja.AppImage](../../releases/latest/download/JSONinja-v1.3.2-x64.AppImage)
- **Others**: [View All Releases](../../releases)

### Quick Install

**Windows:**
1. Download and run the installer setup or portable version
2. Optional: Follow the setup wizard if running the installer

**Linux:**
1. Download the AppImage
2. Make executable: `chmod +x JSONinja.AppImage`
3. Run: `./JSONinja.AppImage`

> 📋 **Note**: macOS builds coming soon! For now, you can build from source.

[View All Releases](../../releases) | [Report Issues](../../issues)

## Building from Source

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
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
# Start the application
npm start

# Or with development features
npm run dev
```

### Step 4: Build executable (optional)

```bash
# Build for current platform only
npm run build

# Build for specific platforms
npm run build-win    # Windows (x64 only)
npm run build-mac    # macOS (Intel + Apple Silicon)
npm run build-linux  # Linux (x64 only)

# Build for all platforms
npm run build-all
```

Built files will be in the `dist/` folder.

### Build Targets
- **Windows**: NSIS installer + Portable executable (x64 only)
- **macOS**: DMG installer + ZIP archive (Intel + Apple Silicon)
- **Linux**: AppImage + DEB + RPM packages (x64 only)

### Build Configuration
The app uses `electron-builder` with these features:
- **64-bit only** - No 32-bit builds for better performance
- **Portable options** - No installation required versions available
- **Multiple formats** - Choose the package format that works for you
- **Optimized packaging** - Only includes necessary files

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
├── package.json          # Project configuration & dependencies
├── main.js               # Electron main process with recent files
├── preload.js            # Secure IPC bridge
├── index.html            # Main application UI with new controls
├── styles.css            # All application styles including themes
├── renderer.js           # Application logic & state management
├── CHANGELOG.md          # Version history and features
└── README.md            # This file
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
- Ensure Node.js v16+ is installed
- Run `npm install` to install dependencies
- Check for error messages in terminal

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
- Uses NSIS installer by default
- Executable created in `dist/` folder
- May require Windows Defender exclusion

**macOS**
- Requires code signing for distribution
- Uses standard .app bundle format

**Linux**
- Builds as AppImage by default
- Can also build .deb and .rpm packages

## Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use and modify as needed.

## Credits

Built with ❤️ using:
- Electron - Cross-platform desktop apps
- Modern CSS - Custom properties and grid
- Vanilla JavaScript - No frameworks needed
- electron-builder - Packaging and distribution
