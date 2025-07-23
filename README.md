# JSONinja - Advanced JSON Viewer

A powerful, customizable JSON viewer built with Electron. Features multi-tab support, extensive customization options, and advanced search capabilities.

## Features

### 🚀 Core Features
- **Multi-tab Interface** - Work with multiple JSON files simultaneously
- **File Operations** - Load JSON files or paste content directly
- **Real-time Validation** - Instant JSON syntax validation and error reporting
- **Format & Minify** - Pretty-print or minify JSON with one click
- **Search & Navigation** - Powerful search with key/value filtering
- **Tree View** - Collapsible JSON structure with expand/collapse all

### 🎨 Customization
- **4 Built-in Themes** - Dark, Light, GitHub, and Monokai
- **Font Customization** - Choose from 5 coding fonts and adjustable sizes
- **Color Coding** - Customize colors for keys, strings, numbers, booleans, null values, and brackets
- **Behavior Settings** - Auto-expand, data type badges, line numbers, word wrap
- **Layout Options** - Resizable sidebar, customizable interface

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
- `Esc` - Close dialogs/panels

## 📦 Downloads

### Latest Release (v1.0.0)

- **Windows**: [JSONinja.exe](../../releases/latest/download/JSONinja.exe)
- **Linux**: [JSONinja.AppImage](../../releases/latest/download/JSONinja-1.0.0.AppImage)

### Quick Install

**Windows:**
1. Download and run the installer
2. Follow the setup wizard

**Linux:**
1. Download the AppImage
2. Make executable: `chmod +x JSONinja.AppImage`
3. Run: `./JSONinja.AppImage`

> 📋 **Note**: macOS builds coming soon! For now, you can build from source.

[View All Releases](../../releases) | [Report Issues](../../issues)

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Step 1: Set up the project
```bash
# Create project directory
mkdir jsoninja
cd jsoninja

# Copy all the files from the artifacts into this directory
# - package.json
# - main.js
# - preload.js
# - index.html
# - styles.css
# - renderer.js
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Run the application
```bash
# Development mode
npm start

# Or with dev flag
npm run dev
```

## Building an Executable

### Create Windows .exe
```bash
npm run build
```

### Create for all platforms
```bash
npm run build --all
```

The built executable will be in the `dist` folder.

### Build Configuration
The app uses `electron-builder` for packaging. Key features:
- **Single-file installer** - NSIS installer for Windows
- **No installation required** - Can be run as portable
- **Auto-updater ready** - Prepared for future auto-update features
- **Code signing ready** - Can be configured for code signing

## Usage Guide

### Getting Started
1. **Launch the app** - Start with the welcome screen
2. **Load JSON** - Click "Load JSON File" or "Paste JSON"
3. **Multi-tab** - Use Ctrl+T to open new tabs for multiple files
4. **Navigate** - Use the tree view to explore JSON structure

### Loading JSON Data
- **From File**: Click "Load JSON File" or use Ctrl+O
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
- **Expand/Collapse** - Click arrows next to objects/arrays
- **Expand All** - Ctrl+E expands everything
- **Collapse All** - Ctrl+Shift+E collapses everything
- **Line Numbers** - Toggle in sidebar or settings
- **Word Wrap** - Enable for long lines

## File Structure

```
jsoninja/
├── package.json          # Project configuration & dependencies
├── main.js               # Electron main process
├── preload.js            # Secure IPC bridge
├── index.html            # Main application UI
├── styles.css            # All application styles
├── renderer.js           # Application logic & functionality
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
- Large JSON files (>10MB) may load slowly
- Consider using "Collapse All" for better performance
- Search in large files may take time

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
