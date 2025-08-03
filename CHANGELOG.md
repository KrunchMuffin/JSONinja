# Changelog

All notable changes to JSONinja will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 🔍 **Enter Key Navigation for Search** - Press Enter to go to next search result, Shift+Enter for previous
- 📋 **Dynamic Version Display** - About dialog and settings now show version from package.json instead of hardcoded value

### Fixed
- 🔄 **Search Navigation** - Fixed issue where clicking next/previous buttons would scroll to top instead of navigating to search results
- 🔍 **Search Highlighting for Partial Matches** - Fixed highlighting not working for partial matches within values (e.g., searching "sarah" in "383555SMITH,SARAH")
- 📜 **Virtual Scrolling Search Navigation** - Fixed "line element not found" error when searching in very large JSON files (>50,000 lines)
- 👁️ **Show Whitespace Toggle** - Fixed whitespace visualization not appearing when toggled (now properly triggers re-render)

### Improved
- 🎨 **Modern Select Box Styling** - Updated select dropdowns in settings with custom styling, proper dark mode support, and smooth transitions
- 🌙 **Select Dropdown Dark Mode** - Fixed dropdown options showing with poor contrast (white background with light gray text) in dark mode

## [1.3.1] - 2025-08-02

### Fixed
- 🔢 **Line Number Synchronization** - Fixed critical issue where line numbers would get out of sync with content
  - Removed word wrap feature that was causing line numbers to misalign with wrapped content
  - Line numbers now always stay perfectly aligned with their corresponding JSON lines
- 📜 **Virtual Scrolling White Space** - Fixed excessive white space appearing after content in large files
  - Virtual scrolling now correctly calculates viewport height based on actual content
  - Line numbers container no longer extends scrollable area beyond content
  - Files with 400k+ lines now scroll smoothly without phantom white space
- ⚡ **Performance Improvements** - Significant speed improvements when loading files
  - Removed word wrap processing overhead for faster initial rendering
  - Optimized virtual scrolling calculations for better performance

### Removed
- 📝 **Word Wrap Feature** - Removed word wrap option to ensure line number accuracy
  - Word wrap was causing line numbers to get out of sync with content
  - All files now display with horizontal scrolling for long lines


## [1.3.0] - 2025-07-26

### Added
- 🌍 **Character Encoding Detection** - Automatic detection and handling of files with special characters
  - Auto-detects Latin-1 (ISO-8859-1) encoded files
  - Shows encoding notification with options to switch between UTF-8, Latin-1, and Windows-1252
  - Encoding warnings for files with unreadable characters
  - Seamless file reloading with different encodings
- 🖱️ **OS Context Menu Integration** - "Open with JSONinja" right-click support
  - Installer version automatically registers file associations
  - Portable version includes menu options for manual registration/unregistration
  - Single instance enforcement - opening files launches existing window
  - Command-line file argument support for external file managers
- 🔢 **Enhanced Line Number Display** - Improved handling for files with 3-4+ digit line numbers
  - Increased gutter width to accommodate large line numbers
  - Fixed vertical alignment issues between line numbers and content
  - Better fold button integration in the gutter
- 🌈 **Improved Rainbow Brackets** - Better color alternation for array elements
  - Each object within an array now gets different bracket colors
  - Proper color matching for opening and closing brackets
  - Array element index tracking for consistent coloring
- 🚀 **Large File Performance** - Three-tier optimization system for files of any size
  - Normal rendering for files under 5,000 lines
  - Progressive rendering with idle callbacks for 5,000-50,000 lines
  - Virtual scrolling for 50,000+ lines (only renders visible content)
  - File size warnings for files over 10MB
  - Can easily handle over 1 million lines.

### Changed
- 🏗️ **Complete Rendering Engine Rewrite** - Rebuilt the entire JSON rendering system from scratch
  - The new engine provides better performance and more reliable line number handling
  - Note: Array index display and string length badges from 1.2.0 were removed (to be reimplemented)

### Fixed
- 📝 **Word Wrap CSS** - Fixed word wrap not working due to CSS specificity issues
- 🔄 **Encoding Metadata Preservation** - Fixed file metadata being lost during tab updates
- 📁 **Sidebar File Loading** - "Load JSON" button now uses same encoding detection as File menu
- 🎨 **Theme Consistency** - Fixed encoding warning/success message colors for all themes
- 🖼️ **Icon References** - Fixed missing icon file references in build configuration

### Improved
- 🎯 **Consistent File Opening** - Both File menu and sidebar button use identical file handling
- 📊 **Better Error Handling** - Clear error messages for encoding issues
- 🔧 **Registry Integration** - More robust Windows registry entries for file associations
- 🎨 **UI Polish** - Better spacing and layout for encoding notifications

### Technical Improvements
- 🔐 **Single Instance Lock** - Prevents multiple app instances and handles file arguments
- 📝 **Encoding Library** - Integrated iconv-lite for comprehensive encoding support
- 🏗️ **Build Configuration** - Added file associations to electron-builder config
- 🧹 **Code Cleanup** - Removed all debug console.log statements for production

## [1.2.0] - 2025-07-23

### Added
- 🔢 **Array Index Display** - Shows `[0]`, `[1]`, `[2]` indices for all array items with optional toggle (default: on)
- 📏 **String Length Badges** - Character count display for long strings with configurable threshold (default: >20 chars)
- 🖥️ **Full-Screen Mode** - Toggle with `F11` key or sidebar button to hide UI chrome for maximum JSON viewing space
- 📁 **Recent Files Menu** - Quick access to last 10 opened files with persistent storage across sessions
- ⌨️ **Enhanced Keyboard Support** - Added `F11` full-screen toggle to existing keyboard shortcuts
- ⚙️ **Configurable Settings** - Selectable character count threshold for string length badges
- 🔄 **State-Preserving Toggles** - Tree expansion state maintained when toggling display options

### Fixed
- 🔢 **Line Numbers Display** - Fixed line numbers showing in pairs (1 2, 3 4) by adding proper CSS whitespace handling
- 🖱️ **Click-to-Expand** - Fixed individual JSON node expand/collapse functionality that wasn't working due to CSS selector mismatch
- 📝 **JSON Property Formatting** - Each key-value pair now displays on separate lines instead of being cramped on single lines
- 🔗 **Nested Object Commas** - Fixed malformed HTML where commas appeared outside nested object structures
- 🎛️ **Font Size UI Stability** - Sidebar and settings panels now maintain fixed font sizes, preventing layout overflow when JSON font size increases
- 🏗️ **Build Configuration** - Added missing icon specification in package.json for proper app icons in built executables
- ⚠️ **Code Modernization** - Replaced deprecated `substr()` with `slice()` method
- 🌈 **Rainbow Brackets Sync** - Fixed synchronization between sidebar and settings panel rainbow bracket toggles
- 🌳 **Tree State Preservation** - Tree no longer collapses when toggling rainbow brackets or other display settings

### Improved
- 🎨 **Visual Navigation** - Array indices and string lengths make large JSON structures easier to browse
- 🚀 **Workflow Efficiency** - Recent files menu speeds up access to frequently used JSON files
- 📺 **Viewing Experience** - Full-screen mode provides distraction-free environment for large data sets
- 🎛️ **UI Organization** - Cleaner sidebar layout with logical grouping of controls
- 🔧 **Settings Management** - Better synchronization between quick controls and detailed settings

### Technical Improvements
- 🎨 **CSS Architecture** - Improved separation between UI font sizes and JSON content font sizes
- 🔧 **HTML Structure** - Better handling of nested JSON elements with proper div wrapping for consistent line breaks
- 📐 **Layout Stability** - Added flex constraints to prevent UI elements from growing with content font size changes
- 🆔 **Deterministic Node IDs** - Tree nodes now use path-based IDs for reliable state preservation
- 🔄 **Deep Settings Merge** - Proper handling of nested settings when loading from storage

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
