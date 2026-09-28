# Changelog

All notable changes to JSONinja will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.5.0] - 2026-09-28

### Fixed
- 🔢 **Array indices and string lengths are back** - The `[0]`, `[1]` labels on array items and the "(42 chars)" badges on long strings had stopped appearing after the 1.3 rendering rewrite, although their settings were still there. They work again on files of any size, and they're left out when you select and copy text

### Changed
- ℹ️ **About and credits** - The About box and Settings mention the formats JSONinja opens, and credit the bundled json5 library

## [2.4.0] - 2026-09-28

### Added
- 📜 **JSON Lines** - Opens `.jsonl` and `.ndjson` files (one JSON record per line). Each record is labeled with its line in the file, and lines that can't be read are flagged individually and shown as text, so one bad line doesn't hide the rest
- 💬 **JSON with comments and JSON5** - Opens `.jsonc` and `.json5` files, and `.json` files that contain comments or trailing commas (like `tsconfig.json` or VS Code settings). The editor points at problems in these formats too, and saving keeps comments. Format and Minify ask first, since they turn the document into plain JSON. JSON5's `NaN` and `Infinity` are shown in quotes, since plain JSON can't write them
- 🪟 **More file types** - The installer, the Open and Save dialogs and **Make JSONinja the Default for JSON Files...** now cover `.jsonl`, `.ndjson`, `.jsonc` and `.json5`

## [2.3.0] - 2026-09-28

### Added
- 🩹 **Fix broken files** - Invalid JSON now opens as text instead of just an error. The problem is described in plain words with its exact line and column (for example "expected `,` or `}` (line 5, column 3)"), that line is highlighted, and **Go to error** jumps to it. It re-checks as you type
- 💾 **Edit and save** - **Edit JSON** in the sidebar edits any document, and **File > Save** (`Ctrl/Cmd + S`) writes it back. Saving only goes to files you opened or picked with Save As, never leaves a half-written file if something fails, keeps the file's line endings, and asks before closing a tab with unsaved changes. Files are saved as UTF-8, with the original file's permissions
- 📏 **Very large files** - Files over 20,000 lines or 2 MB are too big to edit here, so an invalid one shows the lines around the problem instead, with the error marked

### Fixed
- A document that's just `0`, `false` or `null` is valid JSON, but was shown as "Invalid JSON: Unknown error"

## [2.2.0] - 2026-09-27

### Added
- 🪟 **Make JSONinja the default for .json** - **File > System Integration > Make JSONinja the Default for .json...** opens Windows Settings at JSONinja's Default apps page, the only place Windows lets you change a default app. JSONinja now shows up by name there

### Changed
- 🏷️ **File association ID** - `.json` files are registered as `JSONinja.json` instead of the generic `JSON File`, which other apps could also use. The old entry is removed when you update

### Fixed
- 🪟 **Installer open command** - The command Windows runs to open a `.json` file now puts quotes around JSONinja's path, so it works when the install folder contains a space

## [2.1.0] - 2026-09-27

### Added
- 🔎 **Search Within Keys** - When searching values, list key names in the new **in keys** box (e.g. `name, email`) to only match values under those keys, anywhere in the file. Array items count under the array's key

### Fixed
- 🔢 **Search misses** - Numbers (including exponent forms like `1e-7`), `true`, `false` and `null` are now found when they're array items or the last value in an object

## [2.0.0] - 2026-09-27

### Changed
- 🪶 **Rebuilt on Tauri** - JSONinja now uses the system's built-in web engine instead of bundling Chromium. The Windows installer drops from 84 MB to about 2 MB, and the portable exe is about 5 MB
- ⚙️ **Settings and recent files carry over** - Uses the same data folder as 1.x, so nothing needs to be set up again
- 🪟 **Windows file registration** - "Register as JSON Handler" now writes the registry directly instead of running a batch file in a console window

### Added
- 🔄 **Automatic Updates** - JSONinja checks for new releases at startup and can install them and restart. Updates are signed, and anything not signed by the project is refused. Turn it off under Help > Check for Updates Automatically. The portable exe and Linux deb/rpm packages get a download link instead
- 📂 **Drag & Drop** - Drop JSON files onto the window to open them
- 🔍 **Zoom shortcuts** - Ctrl/Cmd + `=`, `-` and `0` zoom the view on every platform

### Security
- 🔒 **Escaped tab titles** - File names are no longer inserted into the page as HTML
- 🛡️ **Content Security Policy** - Only the app's own scripts can run
- 🚧 **Locked-down file access** - The viewer can only re-read files you opened, and the page has no general file-system access

## [1.3.2] - 2025-08-03

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
