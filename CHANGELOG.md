# Changelog

All notable changes to JSONinja will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-07-22

## [1.1.0] - 2025-07-22

### Added
- 🌈 **Rainbow Brackets** - Visual nesting enhancement with 8-color cycling bracket system
- 🎨 Theme-aware rainbow colors that adapt to Dark, Light, GitHub, and Monokai themes
- ⚙️ Toggle option for rainbow brackets in both quick settings and main settings panel

### Fixed
- 🔧 JSON formatting now properly displays on separate lines with correct indentation
- 💻 Improved CSS `white-space` handling for better text rendering

## [1.0.0] - 2025-07-22 🎉

### Added
- 🚀 **Initial Release** - Complete JSON viewer application
- 📑 **Multi-tab Interface** - Work with multiple JSON files simultaneously
- 📁 **File Operations** - Load JSON files via file dialog or drag & drop
- 📋 **Paste Support** - Direct JSON content pasting with dedicated modal
- ✅ **Real-time Validation** - Instant JSON syntax validation and error reporting
- 🎨 **Format & Minify** - Pretty-print or compress JSON with one click
- 🔍 **Advanced Search** - Multi-mode search (keys, values, or both) with highlighting
- 🌳 **Tree View** - Collapsible JSON structure with expand/collapse controls
- 🎭 **4 Built-in Themes** - Dark, Light, GitHub, and Monokai color schemes
- 🔤 **Font Customization** - 5 coding fonts (Fira Code, Monaco, Source Code Pro, JetBrains Mono, Cascadia Code)
- 🎨 **Color Customization** - Individual color controls for all JSON data types
- 📏 **Line Numbers** - Optional line numbering with toggle
- 📝 **Word Wrap** - Configurable text wrapping for long lines
- 📊 **Data Type Badges** - Optional badges showing array/object sizes
- ⚙️ **Settings Persistence** - All preferences saved automatically
- ⌨️ **Keyboard Shortcuts** - Full keyboard navigation and control
- 🖥️ **Cross-platform** - Windows, macOS, and Linux support

### Technical Features
- 🏗️ **Electron Framework** - Native desktop application
- 🔒 **Secure Architecture** - Context isolation and no node integration
- 💾 **Local Settings** - Settings stored in user data directory
- 🎯 **Performance Optimized** - Efficient rendering for large JSON files

### UI/UX Features
- 🎨 **Modern Interface** - Clean, professional design
- 📱 **Responsive Design** - Adapts to different window sizes
- 🖱️ **Interactive Elements** - Hover effects and smooth transitions
- 🎯 **Context Menus** - Right-click operations (via system menu)
- 🔄 **Auto-expand Options** - Configurable object/array expansion behavior

### Keyboard Shortcuts
- `Ctrl/Cmd + T` - New tab
- `Ctrl/Cmd + W` - Close tab
- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + F` - Find/Search
- `Ctrl/Cmd + E` - Expand all
- `Ctrl/Cmd + Shift + E` - Collapse all
- `Ctrl/Cmd + ,` - Settings
- `Esc` - Close dialogs/panels

### Build & Distribution
- 📦 **Multiple Formats** - NSIS installer, portable executable, DMG, AppImage, DEB, RPM, Snap
- 🏷️ **Proper Versioning** - Semantic versioning with auto-generated file names
- 🔧 **Build Scripts** - Comprehensive npm scripts for all platforms
- 📖 **Documentation** - Complete README with setup and usage instructions

---

## Planned Features (Future Releases)

### 🔮 Coming Soon
- 🔄 **Auto-refresh** - Watch files for changes and reload automatically
- 📤 **Export Options** - Save formatted JSON, export as CSV/XML
- 🔍 **JSONPath Support** - Query JSON using JSONPath expressions
- 📊 **JSON Schema Validation** - Validate against JSON Schema files
- 🎨 **Custom Themes** - User-created theme support
- 🔗 **URL Loading** - Load JSON directly from web URLs
- 📈 **Statistics Panel** - JSON structure analysis and metrics
- 🔄 **Diff View** - Compare two JSON files side by side
- 📋 **Copy Path** - Copy JSONPath to specific values
- 🎯 **Bookmarks** - Save and navigate to specific JSON paths

### 🚀 Advanced Features
- 🔌 **Plugin System** - Extensible architecture for custom functionality
- 🌐 **Web Version** - Browser-based version of the viewer
- 📱 **Mobile Apps** - iOS and Android applications
- ☁️ **Cloud Sync** - Synchronize settings across devices
- 🤝 **Collaboration** - Share JSON files with comments and annotations

---

## Development Notes

### Architecture
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Electron with Node.js
- **Build**: electron-builder with cross-platform support
- **Security**: Context isolation, no node integration in renderer

### Performance
- Optimized for JSON files up to 50MB
- Lazy loading for large nested structures
- Efficient search algorithms with debouncing
- Memory-conscious rendering for deep nesting

### Compatibility
- **Electron**: v37+
- **Node.js**: v18+
- **Windows**: 7, 8, 10, 11 (x64, x86)
- **macOS**: 10.15+ (Intel & Apple Silicon)
- **Linux**: Ubuntu 18.04+, Fedora 32+, Debian 10+

---

## Support & Feedback

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/KrunchMuffin/jsoninja/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/KrunchMuffin/jsoninja/discussions)
- 📧 **Contact**: support@dabworx.com
- 🌟 **Reviews**: We'd love your feedback!

---

*JSONinja is developed with ❤️ by DAB Worx*
