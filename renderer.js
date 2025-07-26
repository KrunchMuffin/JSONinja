class JSONViewer {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.tabCounter = 0;
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.settings = this.getDefaultSettings();

        this.init();
    }

    getDefaultSettings() {
        return {
            theme: 'dark',
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontSize: 14,
            colors: {
                key: '#9cdcfe',
                string: '#ce9178',
                number: '#b5cea8',
                boolean: '#569cd6',
                null: '#808080',
                bracket: '#d4d4d4',
                object: '#ffd700',
                array: '#ff6b6b'
            },
            behavior: {
                autoExpand: false,
                showDataTypes: true,
                highlightMatches: true,
                showLineNumbers: true,
                wordWrap: false,
                rainbowBrackets: false,
                showStringLength: false,  // Show character count for long strings
                showArrayIndices: true,   // Show [0], [1] indices for array items
                stringLengthThreshold: 20, // Character threshold for showing length badges
                indentSize: 2,  // Number of spaces for JSON indentation
                showWhitespace: false  // Show whitespace characters like spaces and tabs
            }
        };
    }

    async init() {
        await this.loadSettings();
        this.applySettings();
        this.bindEvents();
        this.bindElectronEvents();
        this.updateUI();
    }

    bindEvents() {
        // Tab management
        document.getElementById('newTabBtn').addEventListener('click', () => this.createNewTab());

        // File operations
        document.getElementById('loadFileBtn').addEventListener('click', () => this.showFileDialog());
        document.getElementById('pasteJsonBtn').addEventListener('click', () => this.showPasteModal());
        document.getElementById('validateBtn').addEventListener('click', () => this.validateCurrentTab());
        document.getElementById('formatBtn').addEventListener('click', () => this.formatCurrentTab());
        document.getElementById('minifyBtn').addEventListener('click', () => this.minifyCurrentTab());

        // View controls
        document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAll());
        document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAll());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('showLineNumbers').addEventListener('change', (e) => {
            this.settings.behavior.showLineNumbers = e.target.checked;
            // Just toggle the body class - no re-render needed!
            document.body.classList.toggle('show-line-numbers', e.target.checked);
            
            // Also update the viewer classes
            const viewer = document.querySelector('.json-viewer');
            if (viewer) {
                viewer.classList.toggle('with-line-numbers', e.target.checked);
                
                // Check if we have collapsible regions
                const hasCollapsible = this.collapsibleRegions && Object.keys(this.collapsibleRegions).length > 0;
                viewer.classList.toggle('has-collapsible-regions', hasCollapsible);
            }
        });
        document.getElementById('wordWrap').addEventListener('change', (e) => {
            this.settings.behavior.wordWrap = e.target.checked;
            // Just toggle the class on the viewer - no re-render needed!
            const viewer = document.querySelector('.json-viewer');
            if (viewer) {
                viewer.classList.toggle('word-wrap', e.target.checked);
            }
        });

        // Quick settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('fontSizeRange').addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.settings.fontSize = size;
            document.getElementById('fontSizeValue').textContent = size + 'px';
            this.applyFontSettings();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', () => this.performSearch());
        document.getElementById('searchPrev').addEventListener('click', () => this.previousSearchResult());
        document.getElementById('searchNext').addEventListener('click', () => this.nextSearchResult());
        document.getElementById('closeSearch').addEventListener('click', () => this.hideSearch());
        document.querySelectorAll('input[name="searchType"]').forEach(radio => {
            radio.addEventListener('change', () => this.performSearch());
        });

        // Settings panel
        document.getElementById('closeSettings').addEventListener('click', () => this.hideSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettings').addEventListener('click', () => this.resetSettings());

        // Settings controls
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.applyTheme();
        });

        document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
            this.settings.fontFamily = e.target.value;
            this.applyFontSettings();
        });

        document.getElementById('settingsFontSize').addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.settings.fontSize = size;
            document.getElementById('settingsFontSizeValue').textContent = size + 'px';
            this.applyFontSettings();
        });

        // Color settings
        Object.keys(this.settings.colors).forEach(colorType => {
            const colorInput = document.getElementById(colorType + 'Color');
            if (colorInput) {
                colorInput.addEventListener('change', (e) => {
                    this.settings.colors[colorType] = e.target.value;
                    this.applyColorSettings();
                    this.updateActiveTabView(); // Refresh the view to show new colors
                });
            }
        });

        // Behavior settings
        document.getElementById('autoExpand').addEventListener('change', (e) => {
            this.settings.behavior.autoExpand = e.target.checked;
        });
        document.getElementById('showDataTypes').addEventListener('change', (e) => {
            this.settings.behavior.showDataTypes = e.target.checked;
            this.updateActiveTabView();
        });
        document.getElementById('highlightMatches').addEventListener('change', (e) => {
            this.settings.behavior.highlightMatches = e.target.checked;
        });

        // Rainbow Brackets (settings panel)
        const settingsRainbowBrackets = document.querySelector('.settings-panel #rainbowBrackets');
        if (settingsRainbowBrackets) {
            settingsRainbowBrackets.addEventListener('change', (e) => {
                this.settings.behavior.rainbowBrackets = e.target.checked;
                this.updateActiveTabViewPreservingState();
                this.updateSettingsUI(); // Sync with sidebar
            });
        }

        // JSON input modal
        document.getElementById('closeJsonModal').addEventListener('click', () => this.hidePasteModal());
        document.getElementById('cancelJsonInput').addEventListener('click', () => this.hidePasteModal());
        document.getElementById('loadJsonInput').addEventListener('click', () => this.loadJsonFromInput());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Rainbow Brackets (sidebar)
        document.getElementById('rainbowBrackets').addEventListener('change', (e) => {
            this.settings.behavior.rainbowBrackets = e.target.checked;
            this.updateActiveTabViewPreservingState();
            this.updateSettingsUI(); // Sync with settings panel
        });
        
        // Show Whitespace (sidebar)
        document.getElementById('showWhitespace').addEventListener('change', (e) => {
            this.settings.behavior.showWhitespace = e.target.checked;
            // Just toggle the body class - no re-render needed!
            document.body.classList.toggle('show-whitespace', e.target.checked);
            this.updateSettingsUI(); // Sync with settings panel
        });

        // Array Indices (settings panel)
        document.getElementById('showArrayIndices').addEventListener('change', (e) => {
            this.settings.behavior.showArrayIndices = e.target.checked;
            this.updateActiveTabViewPreservingState();
            this.updateSettingsUI(); // Sync with sidebar
        });

        // String Length (settings panel)
        document.getElementById('showStringLength').addEventListener('change', (e) => {
            this.settings.behavior.showStringLength = e.target.checked;
            this.updateActiveTabViewPreservingState();
            this.updateSettingsUI(); // Sync with sidebar
        });

        // String Length Threshold (settings panel)
        document.getElementById('stringLengthThreshold').addEventListener('input', (e) => {
            const threshold = parseInt(e.target.value);
            this.settings.behavior.stringLengthThreshold = threshold;
            document.getElementById('stringLengthThresholdValue').textContent = threshold + ' chars';
            if (this.settings.behavior.showStringLength) {
                this.updateActiveTabViewPreservingState();
            }
        });
    }

    bindElectronEvents() {
        if (window.electronAPI) {
            window.electronAPI.onFileOpened((event, data) => {
                this.loadJsonFromFile(data.content, data.fileName);
            });

            window.electronAPI.onNewTab(() => this.createNewTab());
            window.electronAPI.onCloseTab(() => this.closeCurrentTab());
            window.electronAPI.onToggleSettings(() => this.toggleSettings());
            window.electronAPI.onToggleSearch(() => this.toggleSearch());
            window.electronAPI.onExpandAll(() => this.expandAll());
            window.electronAPI.onCollapseAll(() => this.collapseAll());
        }
    }

    handleKeyboardShortcuts(e) {
        // F11 for fullscreen (without ctrl/cmd)
        if (e.key === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 't':
                    e.preventDefault();
                    this.createNewTab();
                    break;
                case 'w':
                    e.preventDefault();
                    this.closeCurrentTab();
                    break;
                case 'f':
                    e.preventDefault();
                    this.toggleSearch();
                    break;
                case ',':
                    e.preventDefault();
                    this.toggleSettings();
                    break;
                case 'e':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.collapseAll();
                    } else {
                        this.expandAll();
                    }
                    break;
            }
        }

        if (e.key === 'Escape') {
            this.hideSearch();
            this.hideSettings();
            this.hidePasteModal();
        }
    }

    createNewTab() {
        const tabId = `tab-${++this.tabCounter}`;
        const tab = {
            id: tabId,
            title: 'Untitled',
            content: null,
            jsonData: null,
            isValid: null,
            filePath: null
        };

        this.tabs.push(tab);
        this.activeTabId = tabId;
        this.updateTabsUI();
        this.updateContentUI();
        this.hideWelcome();
    }

    closeTab(tabId) {
        const index = this.tabs.findIndex(tab => tab.id === tabId);
        if (index === -1) return;

        this.tabs.splice(index, 1);

        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
                const newActiveIndex = Math.min(index, this.tabs.length - 1);
                this.activeTabId = this.tabs[newActiveIndex].id;
            } else {
                this.activeTabId = null;
                this.showWelcome();
            }
        }

        this.updateTabsUI();
        this.updateContentUI();
    }

    closeCurrentTab() {
        if (this.activeTabId) {
            this.closeTab(this.activeTabId);
        }
    }

    switchToTab(tabId) {
        this.activeTabId = tabId;
        this.updateTabsUI();
        this.updateContentUI();
    }

    updateTabsUI() {
        const tabsContainer = document.getElementById('tabs');
        tabsContainer.innerHTML = '';

        this.tabs.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = `tab ${tab.id === this.activeTabId ? 'active' : ''}`;
            tabElement.innerHTML = `
                <span class="tab-title" title="${tab.title}">${tab.title}</span>
                <button class="tab-close" onclick="app.closeTab('${tab.id}')">&times;</button>
            `;
            tabElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tab-close')) {
                    this.switchToTab(tab.id);
                }
            });
            tabsContainer.appendChild(tabElement);
        });
    }

    // Update the updateContentUI method to include word wrap class
    updateContentUI() {
        const tabContent = document.getElementById('tabContent');
        tabContent.innerHTML = '';

        if (!this.activeTabId) return;

        const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (!activeTab) return;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'tab-content active';

        if (activeTab.jsonData) {
            // Check file size and use appropriate rendering method
            const jsonText = JSON.stringify(activeTab.jsonData, null, this.settings.behavior.indentSize || 2);
            const lineCount = jsonText.split('\n').length;
            const isLargeFile = lineCount > 5000; // Threshold for progressive rendering
            const isVeryLargeFile = lineCount > 50000; // Threshold for virtual scrolling

            if (isVeryLargeFile) {
                this.renderVirtualJSON(activeTab, contentDiv, jsonText);
            } else if (isLargeFile) {
                this.renderLargeJSON(activeTab, contentDiv, jsonText);
            } else {
                this.renderNormalJSON(activeTab, contentDiv);
            }
        } else if (activeTab.content) {
            // Show error for invalid JSON
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-display';
            errorDiv.textContent = 'Invalid JSON: ' + (activeTab.error || 'Unknown error');
            contentDiv.appendChild(errorDiv);
        }

        tabContent.appendChild(contentDiv);
    }

    renderNormalJSON(activeTab, contentDiv) {
        const viewer = document.createElement('div');
        // Add word-wrap class based on settings
        const wrapClass = this.settings.behavior.wordWrap ? 'word-wrap' : '';
        viewer.className = `json-viewer ${this.settings.behavior.showLineNumbers ? 'with-line-numbers' : ''} ${wrapClass}`;

        const jsonContent = document.createElement('div');
        jsonContent.className = 'json-content';
        jsonContent.innerHTML = this.renderJSON(activeTab.jsonData, 0, true, '');
        viewer.appendChild(jsonContent);

        // Always render line numbers, CSS will control visibility
        const hasCollapsibleRegions = this.collapsibleRegions && Object.keys(this.collapsibleRegions).length > 0;
        const lineNumbers = this.generateLineNumbers(activeTab.jsonData, false);
        const lineNumbersDiv = document.createElement('div');
        lineNumbersDiv.className = 'line-numbers';
        lineNumbersDiv.innerHTML = lineNumbers;
        viewer.appendChild(lineNumbersDiv);
        
        // Set initial viewer classes
        viewer.classList.toggle('with-line-numbers', this.settings.behavior.showLineNumbers);
        viewer.classList.toggle('has-collapsible-regions', hasCollapsibleRegions);

        // Status indicator
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-indicator ${activeTab.isValid ? 'status-valid' : 'status-invalid'}`;
        statusDiv.textContent = activeTab.isValid ? 'Valid JSON' : 'Invalid JSON';
        viewer.appendChild(statusDiv);

        contentDiv.appendChild(viewer);
    }


    renderLargeJSON(activeTab, contentDiv, jsonText) {
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Processing large file...</p>';
        contentDiv.appendChild(loadingDiv);

        // Use requestIdleCallback for progressive rendering
        const renderCallback = () => {
            const viewer = document.createElement('div');
            const wrapClass = this.settings.behavior.wordWrap ? 'word-wrap' : '';
            viewer.className = `json-viewer ${this.settings.behavior.showLineNumbers ? 'with-line-numbers' : ''} ${wrapClass}`;

            // Create containers
            const jsonContent = document.createElement('div');
            jsonContent.className = 'json-content';
            
            const lineNumbersDiv = document.createElement('div');
            lineNumbersDiv.className = 'line-numbers';

            // Process in chunks
            const lines = jsonText.split('\n');
            const CHUNK_SIZE = 1000;
            let currentIndex = 0;

            // Build collapsible regions and bracket levels once
            if (lines.length > 0) {
                this.collapsibleRegions = this.buildCollapsibleMap(lines);
                if (this.settings.behavior.rainbowBrackets) {
                    this.bracketLevels = this.calculateBracketLevels(lines);
                }
            }

            const processChunk = () => {
                const fragment = document.createDocumentFragment();
                const lineNumberFragment = document.createDocumentFragment();
                
                const endIndex = Math.min(currentIndex + CHUNK_SIZE, lines.length);
                
                // Process lines in this chunk
                for (let i = currentIndex; i < endIndex; i++) {
                    const lineNumber = i + 1;
                    const line = lines[i];
                    
                    // Create line element
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'json-line';
                    lineDiv.setAttribute('data-line', lineNumber);
                    lineDiv.innerHTML = this.highlightJsonLine(line, lineNumber);
                    fragment.appendChild(lineDiv);
                    
                    // Create line number element with toggle if needed
                    const isCollapsible = this.collapsibleRegions && this.collapsibleRegions[lineNumber];
                    if (isCollapsible) {
                        const lineNumDiv = document.createElement('div');
                        lineNumDiv.className = 'line-number-with-toggle';
                        lineNumDiv.setAttribute('data-line', lineNumber);
                        lineNumDiv.innerHTML = `
                            <button class="gutter-toggle" data-line="${lineNumber}" onclick="app.toggleRegion(${lineNumber})">▼</button>
                            <span class="line-num">${lineNumber}</span>
                        `;
                        lineNumberFragment.appendChild(lineNumDiv);
                    } else {
                        const lineNumDiv = document.createElement('div');
                        lineNumDiv.className = 'line-number';
                        lineNumDiv.setAttribute('data-line', lineNumber);
                        lineNumDiv.innerHTML = `<span class="line-num">${lineNumber}</span>`;
                        lineNumberFragment.appendChild(lineNumDiv);
                    }
                }
                
                // Append chunks to DOM
                jsonContent.appendChild(fragment);
                lineNumbersDiv.appendChild(lineNumberFragment);
                
                currentIndex = endIndex;
                
                // Update progress
                const progress = Math.round((currentIndex / lines.length) * 100);
                loadingDiv.querySelector('p').textContent = `Processing large file... ${progress}%`;
                
                // Continue processing or finish
                if (currentIndex < lines.length) {
                    requestIdleCallback(processChunk);
                } else {
                    // Remove loading indicator and add viewer
                    contentDiv.removeChild(loadingDiv);
                    
                    viewer.appendChild(jsonContent);
                    viewer.appendChild(lineNumbersDiv);
                    
                    // Set viewer classes
                    const hasCollapsibleRegions = this.collapsibleRegions && Object.keys(this.collapsibleRegions).length > 0;
                    viewer.classList.toggle('with-line-numbers', this.settings.behavior.showLineNumbers);
                    viewer.classList.toggle('has-collapsible-regions', hasCollapsibleRegions);
                    
                    // Status indicator
                    const statusDiv = document.createElement('div');
                    statusDiv.className = `status-indicator ${activeTab.isValid ? 'status-valid' : 'status-invalid'}`;
                    statusDiv.textContent = activeTab.isValid ? 'Valid JSON' : 'Invalid JSON';
                    viewer.appendChild(statusDiv);
                    
                    contentDiv.appendChild(viewer);
                }
            };
            
            // Start processing
            processChunk();
        };

        // Use requestIdleCallback with fallback
        if (window.requestIdleCallback) {
            requestIdleCallback(renderCallback);
        } else {
            setTimeout(renderCallback, 0);
        }
    }

    renderVirtualJSON(activeTab, contentDiv, jsonText) {
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Preparing virtual scrolling for very large file...</p>';
        contentDiv.appendChild(loadingDiv);

        setTimeout(() => {
            const lines = jsonText.split('\n');
            const totalLines = lines.length;
            const VISIBLE_LINES = 100; // Number of lines to render at once
            
            // Get actual computed line height from CSS
            const computedStyle = getComputedStyle(document.documentElement);
            const fontSize = parseFloat(computedStyle.getPropertyValue('--font-size')) || 14;
            const lineHeightRatio = parseFloat(computedStyle.getPropertyValue('--line-height')) || 1.4;
            const LINE_HEIGHT = Math.ceil(fontSize * lineHeightRatio);
            
            // Build collapsible regions and bracket levels once
            this.collapsibleRegions = this.buildCollapsibleMap(lines);
            if (this.settings.behavior.rainbowBrackets) {
                this.bracketLevels = this.calculateBracketLevels(lines);
            }

            // Create viewer with virtual scrolling
            const viewer = document.createElement('div');
            const wrapClass = this.settings.behavior.wordWrap ? 'word-wrap' : '';
            viewer.className = `json-viewer ${this.settings.behavior.showLineNumbers ? 'with-line-numbers' : ''} ${wrapClass} virtual-scroll`;
            viewer.style.position = 'relative';
            viewer.style.height = '100%';
            viewer.style.overflow = 'auto';

            // Create viewport container with correct height
            const viewport = document.createElement('div');
            const totalHeight = totalLines * LINE_HEIGHT;
            viewport.style.height = `${totalHeight}px`;
            viewport.style.position = 'relative';

            // Create content container that will hold visible lines
            const jsonContent = document.createElement('div');
            jsonContent.className = 'json-content';
            jsonContent.style.position = 'absolute';
            jsonContent.style.width = '100%';

            // Create line numbers container
            const lineNumbersDiv = document.createElement('div');
            lineNumbersDiv.className = 'line-numbers';
            lineNumbersDiv.style.position = 'absolute';
            lineNumbersDiv.style.width = '85px';

            let currentStartLine = 0;
            let renderTimeout;

            const renderVisibleLines = () => {
                clearTimeout(renderTimeout);
                renderTimeout = setTimeout(() => {
                    const scrollTop = viewer.scrollTop;
                    const viewportHeight = viewer.clientHeight;
                    
                    // Calculate visible range with some buffer
                    const startLine = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - 10);
                    const visibleLines = Math.ceil(viewportHeight / LINE_HEIGHT) + 20; // Add buffer
                    const endLine = Math.min(startLine + visibleLines, totalLines);

                    // Clear current content
                    jsonContent.innerHTML = '';
                    lineNumbersDiv.innerHTML = '';

                    // Set position based on scroll
                    jsonContent.style.top = `${startLine * LINE_HEIGHT}px`;
                    lineNumbersDiv.style.top = `${startLine * LINE_HEIGHT}px`;

                    // Render visible lines
                    const fragment = document.createDocumentFragment();
                    const lineNumberFragment = document.createDocumentFragment();

                    for (let i = startLine; i < endLine; i++) {
                        const lineNumber = i + 1;
                        const line = lines[i];

                        // Create line element
                        const lineDiv = document.createElement('div');
                        lineDiv.className = 'json-line';
                        lineDiv.setAttribute('data-line', lineNumber);
                        lineDiv.style.height = `${LINE_HEIGHT}px`;
                        lineDiv.style.lineHeight = `${LINE_HEIGHT}px`;
                        lineDiv.style.margin = '0';
                        lineDiv.style.padding = '0';
                        lineDiv.innerHTML = this.highlightJsonLine(line, lineNumber);
                        fragment.appendChild(lineDiv);

                        // Create line number element
                        const isCollapsible = this.collapsibleRegions && this.collapsibleRegions[lineNumber];
                        if (isCollapsible) {
                            const lineNumDiv = document.createElement('div');
                            lineNumDiv.className = 'line-number-with-toggle';
                            lineNumDiv.setAttribute('data-line', lineNumber);
                            lineNumDiv.style.height = `${LINE_HEIGHT}px`;
                            lineNumDiv.innerHTML = `
                                <button class="gutter-toggle" data-line="${lineNumber}" onclick="app.toggleRegion(${lineNumber})">▼</button>
                                <span class="line-num">${lineNumber}</span>
                            `;
                            lineNumberFragment.appendChild(lineNumDiv);
                        } else {
                            const lineNumDiv = document.createElement('div');
                            lineNumDiv.className = 'line-number';
                            lineNumDiv.setAttribute('data-line', lineNumber);
                            lineNumDiv.style.height = `${LINE_HEIGHT}px`;
                            lineNumDiv.innerHTML = `<span class="line-num">${lineNumber}</span>`;
                            lineNumberFragment.appendChild(lineNumDiv);
                        }
                    }

                    jsonContent.appendChild(fragment);
                    lineNumbersDiv.appendChild(lineNumberFragment);
                }, 10); // Small debounce
            };

            // Set up scroll listener
            viewer.addEventListener('scroll', renderVisibleLines);

            // Assemble the viewer
            viewport.appendChild(jsonContent);
            viewport.appendChild(lineNumbersDiv);
            viewer.appendChild(viewport);

            // Remove loading and add viewer
            contentDiv.removeChild(loadingDiv);
            
            // Set viewer classes
            const hasCollapsibleRegions = this.collapsibleRegions && Object.keys(this.collapsibleRegions).length > 0;
            viewer.classList.toggle('with-line-numbers', this.settings.behavior.showLineNumbers);
            viewer.classList.toggle('has-collapsible-regions', hasCollapsibleRegions);
            
            // Status indicator
            const statusDiv = document.createElement('div');
            statusDiv.className = `status-indicator ${activeTab.isValid ? 'status-valid' : 'status-invalid'}`;
            statusDiv.textContent = `${activeTab.isValid ? 'Valid' : 'Invalid'} JSON (${totalLines.toLocaleString()} lines)`;
            viewer.appendChild(statusDiv);
            
            contentDiv.appendChild(viewer);

            // Initial render
            renderVisibleLines();
        }, 0);
    }

    renderJSON(data, level = 0, isRoot = true, path = '') {
        // Generate clean JSON text with proper indentation
        const indentSize = this.settings.behavior.indentSize || 2;
        const jsonText = JSON.stringify(data, null, indentSize);
        const lines = jsonText.split('\n');
        console.log('renderJSON: Processing', lines.length, 'lines');
        
        
        // Build map of collapsible regions (preserve existing state)
        const newRegions = this.buildCollapsibleMap(lines);
        if (this.collapsibleRegions) {
            // Preserve collapsed state from existing regions
            Object.keys(newRegions).forEach(lineNumber => {
                if (this.collapsibleRegions[lineNumber]) {
                    newRegions[lineNumber].collapsed = this.collapsibleRegions[lineNumber].collapsed;
                }
            });
        }
        this.collapsibleRegions = newRegions;
        console.log('Found', Object.keys(this.collapsibleRegions).length, 'collapsible regions');
        
        // Calculate bracket levels for rainbow brackets
        if (this.settings.behavior.rainbowBrackets) {
            this.bracketLevels = this.calculateBracketLevels(lines);
        }
        
        // Convert each line to HTML with syntax highlighting
        const htmlLines = lines.map((line, index) => {
            const lineNumber = index + 1;
            const highlighted = this.highlightJsonLine(line, lineNumber);
            
            // Check if this line should be hidden due to collapsed region
            let isHidden = false;
            for (const startLine in this.collapsibleRegions) {
                const region = this.collapsibleRegions[startLine];
                if (region.collapsed && lineNumber > parseInt(startLine) && lineNumber <= region.endLine) {
                    isHidden = true;
                    break;
                }
            }
            
            const hiddenClass = isHidden ? ' json-line-hidden' : '';
            
            // Check if this is a collapsed region start line
            let collapsedIndicator = '';
            if (this.collapsibleRegions && this.collapsibleRegions[lineNumber] && this.collapsibleRegions[lineNumber].collapsed) {
                collapsedIndicator = ' collapsed-region';
            }
            
            const result = `<div class="json-line${hiddenClass}${collapsedIndicator}" data-line="${lineNumber}">${highlighted}</div>`;
            if (lineNumber === 6) {
                console.log('Line 6 HTML:', result);
                console.log('Line 6 raw:', line);
            }
            return result;
        });
        
        return htmlLines.join('');
    }

    calculateBracketLevels(lines) {
        const bracketLevels = {};
        let currentLevel = 0;
        const bracketStack = []; // Stack to track opening brackets and their colors
        let arrayElementIndices = []; // Track element index at each array level
        
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();
            
            // Store bracket info for this line
            const brackets = [];
            
            // Check if this line starts a new array element (excluding the array opening line itself)
            if (arrayElementIndices.length > 0 && 
                (trimmedLine.startsWith('{') || trimmedLine.startsWith('[') || 
                 /^"/.test(trimmedLine) || /^\d+/.test(trimmedLine) ||
                 trimmedLine.startsWith('true') || trimmedLine.startsWith('false') || 
                 trimmedLine.startsWith('null'))) {
                
                // Look at previous line to see if it ended with a comma (new element) or was the array opening
                if (index > 0) {
                    const prevLine = lines[index - 1].trim();
                    if (prevLine.endsWith(',')) {
                        // Increment the element index for the current array
                        arrayElementIndices[arrayElementIndices.length - 1]++;
                    }
                }
            }
            
            // Process each character in the line
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '{' || char === '[') {
                    // Calculate color level
                    let colorLevel = currentLevel;
                    
                    // If we're inside an array, add the current element index
                    if (arrayElementIndices.length > 0) {
                        const currentElementIndex = arrayElementIndices[arrayElementIndices.length - 1];
                        colorLevel = currentLevel + currentElementIndex;
                    }
                    
                    brackets.push({ char, level: colorLevel, position: i });
                    
                    // Push bracket info to stack for matching closing bracket
                    bracketStack.push({
                        char: char,
                        level: colorLevel,
                        depth: currentLevel,
                        isArray: char === '['
                    });
                    
                    // If opening an array, add a new element index counter
                    if (char === '[') {
                        arrayElementIndices.push(0);
                    }
                    
                    currentLevel++;
                    
                } else if (char === '}' || char === ']') {
                    currentLevel = Math.max(0, currentLevel - 1);
                    
                    // Pop the matching opening bracket to get the same color
                    if (bracketStack.length > 0) {
                        const matchingBracket = bracketStack.pop();
                        brackets.push({ char, level: matchingBracket.level, position: i });
                        
                        // If closing an array, remove its element index counter
                        if (char === ']' && arrayElementIndices.length > 0) {
                            arrayElementIndices.pop();
                        }
                    } else {
                        // Fallback if stack is empty (shouldn't happen with valid JSON)
                        brackets.push({ char, level: currentLevel, position: i });
                    }
                }
            }
            
            if (brackets.length > 0) {
                bracketLevels[lineNumber] = brackets;
            }
        });
        
        return bracketLevels;
    }

    buildCollapsibleMap(lines) {
        const collapsibleRegions = {};
        const bracketStack = [];
        
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();
            
            // More robust bracket detection
            // Check for opening brackets that start a new object/array
            const hasOpeningObject = trimmedLine.includes('{') && !this.isInlineObject(trimmedLine);
            const hasOpeningArray = trimmedLine.includes('[') && !this.isInlineArray(trimmedLine);
            
            if (hasOpeningObject) {
                bracketStack.push({
                    lineNumber: lineNumber,
                    char: '{',
                    indentLevel: line.length - line.trimStart().length
                });
            }
            
            if (hasOpeningArray) {
                bracketStack.push({
                    lineNumber: lineNumber,
                    char: '[',
                    indentLevel: line.length - line.trimStart().length
                });
            }
            
            // Check for closing brackets
            const hasClosingObject = (trimmedLine === '}' || trimmedLine === '},');
            const hasClosingArray = (trimmedLine === ']' || trimmedLine === '],');
            
            if (hasClosingObject || hasClosingArray) {
                const closingChar = hasClosingObject ? '}' : ']';
                
                // Find the most recent matching opening bracket
                for (let i = bracketStack.length - 1; i >= 0; i--) {
                    const opening = bracketStack[i];
                    
                    if ((opening.char === '{' && closingChar === '}') ||
                        (opening.char === '[' && closingChar === ']')) {
                        
                        // Only create collapsible region if there's content between brackets
                        if (lineNumber > opening.lineNumber + 1) {
                            // Count items between start and end
                            let itemCount = 0;
                            const isArray = opening.char === '[';
                            
                            if (isArray) {
                                // For arrays, count direct child items
                                let depth = 0;
                                for (let i = opening.lineNumber; i < lineNumber - 1; i++) {
                                    const line = lines[i].trim();
                                    
                                    // Track depth to only count direct children
                                    if (line.includes('{') || line.includes('[')) depth++;
                                    if (line.includes('}') || line.includes(']')) depth--;
                                    
                                    // Count items at depth 1 (direct children of this array)
                                    if (depth === 1) {
                                        // Count opening brackets of direct child objects/arrays
                                        if (line === '{' || line === '[' || line.startsWith('{') || line.startsWith('[')) {
                                            itemCount++;
                                        }
                                        // Count primitive values (strings, numbers, etc) that are direct children
                                        else if (depth === 0 && line.match(/^["'\d\-true\false\null]/)) {
                                            itemCount++;
                                        }
                                    }
                                }
                            } else {
                                // For objects, count properties (lines with colons at the right depth)
                                let depth = 0;
                                for (let i = opening.lineNumber; i < lineNumber - 1; i++) {
                                    const line = lines[i].trim();
                                    
                                    // Count lines with colons at depth 0 (direct properties)
                                    if (depth === 0 && line.includes('":')) {
                                        itemCount++;
                                    }
                                    
                                    // Track depth
                                    if (line.includes('{') || line.includes('[')) depth++;
                                    if (line.includes('}') || line.includes(']')) depth--;
                                }
                            }
                            
                            collapsibleRegions[opening.lineNumber] = {
                                startLine: opening.lineNumber,
                                endLine: lineNumber,
                                type: opening.char === '{' ? 'object' : 'array',
                                collapsed: false,
                                indentLevel: opening.indentLevel,
                                itemCount: itemCount
                            };
                        }
                        
                        // Remove this opening from stack
                        bracketStack.splice(i, 1);
                        break;
                    }
                }
            }
        });
        
        return collapsibleRegions;
    }

    // Helper function to detect inline objects like { "key": "value" }
    isInlineObject(line) {
        const trimmed = line.trim();
        return trimmed.includes('{') && trimmed.includes('}') && 
               trimmed.indexOf('{') < trimmed.indexOf('}');
    }

    // Helper function to detect inline arrays like [ "item1", "item2" ]
    isInlineArray(line) {
        const trimmed = line.trim();
        return trimmed.includes('[') && trimmed.includes(']') && 
               trimmed.indexOf('[') < trimmed.indexOf(']');
    }

    highlightJsonLine(line, lineNumber) {
        let highlighted = this.escapeHtml(line);
        
        
        // First apply syntax highlighting
        // Process all quoted strings in one pass, determining if they're keys or values
        highlighted = highlighted.replace(/&quot;([^&]+)&quot;(\s*:)?/g, (match, content, colon) => {
            if (colon) {
                // This is a key
                return `<span class="json-key">&quot;${content}&quot;</span>${colon}`;
            } else {
                // This is a value
                return `<span class="json-string">&quot;${content}&quot;</span>`;
            }
        });
        
        // Highlight numbers
        highlighted = highlighted.replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>');
        
        // Highlight booleans and null
        highlighted = highlighted.replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>');
        highlighted = highlighted.replace(/\bnull\b/g, '<span class="json-null">null</span>');
        
        // Highlight brackets
        if (this.settings.behavior.rainbowBrackets && this.bracketLevels && this.bracketLevels[lineNumber]) {
            // Rainbow brackets - replace each bracket with its level color
            const brackets = this.bracketLevels[lineNumber];
            let bracketIndex = 0;
            
            highlighted = highlighted.replace(/[{}\[\]]/g, (match) => {
                if (bracketIndex < brackets.length) {
                    const bracket = brackets[bracketIndex];
                    const bracketClass = match === '{' || match === '}' ? 'json-object-bracket' : 'json-array-bracket';
                    const levelClass = `bracket-level-${bracket.level % 8}`;
                    bracketIndex++;
                    return `<span class="${bracketClass} ${levelClass}">${match}</span>`;
                }
                return match;
            });
        } else {
            // Standard bracket highlighting
            highlighted = highlighted.replace(/[\[\]]/g, '<span class="json-array-bracket">$&</span>');
            highlighted = highlighted.replace(/[{}]/g, '<span class="json-object-bracket">$&</span>');
        }
        
        // Add type badges for collapsed regions
        if (this.collapsibleRegions && this.collapsibleRegions[lineNumber] && this.collapsibleRegions[lineNumber].collapsed) {
            const region = this.collapsibleRegions[lineNumber];
            const badgeClass = region.type === 'array' ? 'array-badge' : 'object-badge';
            const badgeText = region.type === 'array' ? `[${region.itemCount}]` : `{${region.itemCount}}`;
            
            // Insert badge after the opening bracket
            const bracketChar = region.type === 'array' ? '\\[' : '\\{';
            highlighted = highlighted.replace(new RegExp(`(<span[^>]*>${bracketChar}</span>)`), `$1<span class="type-badge ${badgeClass}">${badgeText}</span>`);
        }
        
        // Then apply search highlighting on top
        if (this.currentSearchQuery && this.searchResults) {
            const lineMatches = this.searchResults.filter(result => result.lineNumber === lineNumber);
            
            if (lineMatches.length > 0) {
                const searchRegex = new RegExp(`(${this.escapeRegex(this.currentSearchQuery)})`, 'gi');
                
                if (this.currentSearchType === 'key') {
                    // Only highlight within json-key spans
                    highlighted = highlighted.replace(/<span class="json-key">([^<]+)<\/span>/g, (match, keyContent) => {
                        const highlightedKey = keyContent.replace(searchRegex, '<span class="search-highlight">$1</span>');
                        return `<span class="json-key">${highlightedKey}</span>`;
                    });
                } else if (this.currentSearchType === 'value') {
                    // Highlight in all spans except json-key
                    const patterns = [
                        { regex: /<span class="json-string">([^<]+)<\/span>/g, class: 'json-string' },
                        { regex: /<span class="json-number">([^<]+)<\/span>/g, class: 'json-number' },
                        { regex: /<span class="json-boolean">([^<]+)<\/span>/g, class: 'json-boolean' },
                        { regex: /<span class="json-null">([^<]+)<\/span>/g, class: 'json-null' }
                    ];
                    
                    patterns.forEach(pattern => {
                        highlighted = highlighted.replace(pattern.regex, (match, content) => {
                            const highlightedContent = content.replace(searchRegex, '<span class="search-highlight">$1</span>');
                            return `<span class="${pattern.class}">${highlightedContent}</span>`;
                        });
                    });
                } else {
                    // Both - highlight in all content
                    const allPatterns = [
                        { regex: /<span class="json-key">([^<]+)<\/span>/g, class: 'json-key' },
                        { regex: /<span class="json-string">([^<]+)<\/span>/g, class: 'json-string' },
                        { regex: /<span class="json-number">([^<]+)<\/span>/g, class: 'json-number' },
                        { regex: /<span class="json-boolean">([^<]+)<\/span>/g, class: 'json-boolean' },
                        { regex: /<span class="json-null">([^<]+)<\/span>/g, class: 'json-null' }
                    ];
                    
                    allPatterns.forEach(pattern => {
                        highlighted = highlighted.replace(pattern.regex, (match, content) => {
                            const highlightedContent = content.replace(searchRegex, '<span class="search-highlight">$1</span>');
                            return `<span class="${pattern.class}">${highlightedContent}</span>`;
                        });
                    });
                }
            }
        }
        
        return highlighted;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    applyBasicSyntaxHighlighting(jsonText) {
        // For now, just return the plain JSON with minimal highlighting
        let highlighted = this.escapeHtml(jsonText);
        
        // Simple highlighting without complex regex
        highlighted = highlighted.replace(/&quot;([^&]+)&quot;\s*:/g, '<span class="json-key">&quot;$1&quot;</span>:');
        highlighted = highlighted.replace(/&quot;([^&]+)&quot;/g, '<span class="json-string">&quot;$1&quot;</span>');
        highlighted = highlighted.replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>');
        highlighted = highlighted.replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>');
        highlighted = highlighted.replace(/\bnull\b/g, '<span class="json-null">null</span>');
        highlighted = highlighted.replace(/[\[\]]/g, '<span class="json-array-bracket">$&</span>');
        highlighted = highlighted.replace(/[{}]/g, '<span class="json-object-bracket">$&</span>');
        
        return highlighted;
    }

    generateLineNumbers(jsonData, hideNumbers = false) {
        if (!jsonData) return '';
        // Generate line numbers based on actual JSON lines
        const jsonText = JSON.stringify(jsonData, null, this.settings.behavior.indentSize || 2);
        const lines = jsonText.split('\n');
        console.log('generateLineNumbers: Processing', lines.length, 'lines');
        
        // Generate line numbers with toggle buttons for collapsible regions
        const lineNumbersHtml = lines.map((_, index) => {
            const lineNumber = index + 1;
            const hasToggle = this.collapsibleRegions && this.collapsibleRegions[lineNumber];
            
            // Check if this line number should be hidden due to collapsed region
            let isHidden = false;
            for (const startLine in this.collapsibleRegions) {
                const region = this.collapsibleRegions[startLine];
                if (region.collapsed && lineNumber > parseInt(startLine) && lineNumber <= region.endLine) {
                    isHidden = true;
                    break;
                }
            }
            
            const hiddenClass = isHidden ? ' json-line-hidden' : '';
            
            if (hasToggle) {
                const region = this.collapsibleRegions[lineNumber];
                const toggleIcon = region.collapsed ? '▶' : '▼';
                const collapsedClass = region.collapsed ? ' collapsed-region' : '';
                const numberDisplay = hideNumbers ? '' : `<span class="line-num">${lineNumber}</span>`;
                return `<div class="line-number-with-toggle${hiddenClass}${collapsedClass}" data-line="${lineNumber}">
                    <button class="gutter-toggle" data-line="${lineNumber}" onclick="app.toggleRegion(${lineNumber})">${toggleIcon}</button>
                    ${numberDisplay}
                </div>`;
            } else {
                const numberDisplay = hideNumbers ? '' : `<span class="line-num">${lineNumber}</span>`;
                return `<div class="line-number${hiddenClass}" data-line="${lineNumber}">${numberDisplay}</div>`;
            }
        }).join('');
        
        return lineNumbersHtml;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        // textContent/innerHTML doesn't escape quotes, so we need to do it manually
        let escaped = div.innerHTML.replace(/"/g, '&quot;');
        
        // Always add whitespace spans, CSS controls visibility
        escaped = escaped
            .replace(/ /g, '<span class="whitespace-dot"></span>')  // Replace spaces with spans
            .replace(/\t/g, '<span class="whitespace-tab"></span>'); // Replace tabs with spans
        
        return escaped;
    }

    loadJsonFromFile(content, fileName) {
        this.loadJsonContent(content, fileName);
    }

    loadJsonContent(content, title = 'Untitled') {
        if (!this.activeTabId) {
            this.createNewTab();
        }

        const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (!activeTab) return;

        // Check file size
        const sizeInMB = new Blob([content]).size / (1024 * 1024);
        if (sizeInMB > 10) {
            const proceed = confirm(`This file is ${sizeInMB.toFixed(2)} MB. Large files may take time to process. Continue?`);
            if (!proceed) return;
        }

        try {
            const jsonData = JSON.parse(content);
            activeTab.content = content;
            activeTab.jsonData = jsonData;
            activeTab.title = title;
            activeTab.isValid = true;
            activeTab.error = null;
        } catch (error) {
            activeTab.content = content;
            activeTab.jsonData = null;
            activeTab.title = title + ' (Invalid)';
            activeTab.isValid = false;
            activeTab.error = error.message;
        }

        this.updateTabsUI();
        this.updateContentUI();
    }

    showFileDialog() {
        // This would typically be handled by Electron's main process
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.loadJsonContent(e.target.result, file.name);
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    showPasteModal() {
        document.getElementById('jsonInputModal').classList.add('active');
        document.getElementById('jsonInput').focus();
    }

    hidePasteModal() {
        document.getElementById('jsonInputModal').classList.remove('active');
        document.getElementById('jsonInput').value = '';
    }

    loadJsonFromInput() {
        const content = document.getElementById('jsonInput').value.trim();
        if (content) {
            this.loadJsonContent(content, 'Pasted JSON');
            this.hidePasteModal();
        }
    }

    validateCurrentTab() {
        const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (!activeTab || !activeTab.content) return;

        try {
            JSON.parse(activeTab.content);
            alert('✓ Valid JSON');
        } catch (error) {
            alert('✗ Invalid JSON: ' + error.message);
        }
    }

    formatCurrentTab() {
        const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (!activeTab || !activeTab.jsonData) return;

        const formatted = JSON.stringify(activeTab.jsonData, null, 2);
        this.loadJsonContent(formatted, activeTab.title.replace(' (Invalid)', ''));
    }

    minifyCurrentTab() {
        const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (!activeTab || !activeTab.jsonData) return;

        const minified = JSON.stringify(activeTab.jsonData);
        this.loadJsonContent(minified, activeTab.title.replace(' (Invalid)', ''));
    }

    toggleRegion(lineNumber) {
        if (!this.collapsibleRegions || !this.collapsibleRegions[lineNumber]) {
            console.log('No collapsible region found for line:', lineNumber);
            return;
        }
        
        const region = this.collapsibleRegions[lineNumber];
        region.collapsed = !region.collapsed;
        
        console.log('Toggled region at line', lineNumber, 'collapsed:', region.collapsed);
        
        // Update only the affected lines without full re-render
        this.updateCollapsedRegion(lineNumber, region);
    }
    
    updateCollapsedRegion(lineNumber, region) {
        // Update the toggle button icon
        const toggleButton = document.querySelector(`button.gutter-toggle[data-line="${lineNumber}"]`);
        if (toggleButton) {
            toggleButton.textContent = region.collapsed ? '▶' : '▼';
        }
        
        // Update the collapsed indicator on the line
        const jsonLine = document.querySelector(`.json-line[data-line="${lineNumber}"]`);
        const lineNumberDiv = document.querySelector(`.line-number[data-line="${lineNumber}"], .line-number-with-toggle[data-line="${lineNumber}"]`);
        
        if (region.collapsed) {
            // Add collapsed indicators
            if (jsonLine) jsonLine.classList.add('collapsed-region');
            if (lineNumberDiv) lineNumberDiv.classList.add('collapsed-region');
            
            // Hide lines in the collapsed region
            for (let i = region.startLine + 1; i <= region.endLine; i++) {
                const hideLine = document.querySelector(`.json-line[data-line="${i}"]`);
                const hideLineNumber = document.querySelector(`.line-number[data-line="${i}"], .line-number-with-toggle[data-line="${i}"]`);
                if (hideLine) hideLine.classList.add('json-line-hidden');
                if (hideLineNumber) {
                    hideLineNumber.classList.add('json-line-hidden');
                }
            }
            
            // Update type badge if needed
            if (jsonLine && this.settings.behavior.showDataTypes !== false) {
                const badgeClass = region.type === 'array' ? 'array-badge' : 'object-badge';
                const badgeText = region.type === 'array' ? `[${region.itemCount}]` : `{${region.itemCount}}`;
                
                // Check if badge already exists
                let badge = jsonLine.querySelector('.type-badge');
                if (!badge) {
                    // Find the opening bracket and add badge after it
                    const bracketClass = region.type === 'array' ? 'json-array-bracket' : 'json-object-bracket';
                    const bracket = jsonLine.querySelector(`.${bracketClass}`);
                    if (bracket) {
                        badge = document.createElement('span');
                        badge.className = `type-badge ${badgeClass}`;
                        badge.textContent = badgeText;
                        bracket.insertAdjacentElement('afterend', badge);
                    }
                }
            }
        } else {
            // Remove collapsed indicators
            if (jsonLine) jsonLine.classList.remove('collapsed-region');
            if (lineNumberDiv) lineNumberDiv.classList.remove('collapsed-region');
            
            // Show lines in the expanded region
            for (let i = region.startLine + 1; i <= region.endLine; i++) {
                const showLine = document.querySelector(`.json-line[data-line="${i}"]`);
                const showLineNumber = document.querySelector(`.line-number[data-line="${i}"], .line-number-with-toggle[data-line="${i}"]`);
                if (showLine) showLine.classList.remove('json-line-hidden');
                if (showLineNumber) {
                    showLineNumber.classList.remove('json-line-hidden');
                }
            }
            
            // Remove type badge
            if (jsonLine) {
                const badge = jsonLine.querySelector('.type-badge');
                if (badge) badge.remove();
            }
        }
    }


    expandAll() {
        if (!this.collapsibleRegions) {
            console.log('No collapsible regions available');
            return;
        }
        
        // Expand all regions
        let hasChanges = false;
        Object.keys(this.collapsibleRegions).forEach(lineNumber => {
            const region = this.collapsibleRegions[lineNumber];
            if (region.collapsed) {
                region.collapsed = false;
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            console.log('Expanded all regions');
            this.updateActiveTabView();
        } else {
            console.log('All regions already expanded');
        }
    }

    collapseAll() {
        if (!this.collapsibleRegions) {
            console.log('No collapsible regions available');
            return;
        }
        
        // Collapse all regions
        let hasChanges = false;
        Object.keys(this.collapsibleRegions).forEach(lineNumber => {
            const region = this.collapsibleRegions[lineNumber];
            if (!region.collapsed) {
                region.collapsed = true;
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            console.log('Collapsed all regions');
            this.updateActiveTabView();
        } else {
            console.log('All regions already collapsed');
        }
    }

    toggleFullscreen() {
        const app = document.getElementById('app');
        app.classList.toggle('app-fullscreen');

        // Update button text
        const btn = document.getElementById('fullscreenBtn');
        if (app.classList.contains('app-fullscreen')) {
            btn.textContent = 'Exit Full Screen (F11)';
        } else {
            btn.textContent = 'Full Screen (F11)';
        }
    }

    toggleSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer.classList.contains('active')) {
            this.hideSearch();
        } else {
            this.showSearch();
        }
    }

    showSearch() {
        document.getElementById('searchContainer').classList.add('active');
        document.getElementById('searchInput').focus();
    }

    hideSearch() {
        document.getElementById('searchContainer').classList.remove('active');
        this.clearSearchHighlights();
    }

    performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        const searchType = document.querySelector('input[name="searchType"]:checked').value;

        if (!query) {
            this.clearSearchHighlights();
            this.updateSearchResults(0, 0);
            return;
        }

        const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (!activeTab || !activeTab.jsonData) return;

        // Store search query for highlighting during render
        this.currentSearchQuery = query;
        this.currentSearchType = searchType;
        
        this.searchResults = this.findMatchesInLines(activeTab.jsonData, query, searchType);
        this.updateSearchResults(this.searchResults.length, this.searchResults.length > 0 ? 1 : 0);

        if (this.searchResults.length > 0) {
            this.currentSearchIndex = 0;
            this.scrollToSearchResult(0);
        }
        
        // Re-render to apply search highlighting
        this.updateActiveTabView();
    }

    findMatchesInLines(data, query, searchType) {
        const matches = [];
        const searchQuery = query.toLowerCase();
        const jsonText = JSON.stringify(data, null, 2);
        const lines = jsonText.split('\n');
        
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const lineLower = line.toLowerCase();
            
            if (searchType === 'key' || searchType === 'both') {
                // Look for keys (strings followed by colon)
                const keyMatch = line.match(/"([^"]+)":/);
                if (keyMatch && keyMatch[1].toLowerCase().includes(searchQuery)) {
                    matches.push({
                        lineNumber: lineNumber,
                        type: 'key',
                        value: keyMatch[1],
                        column: line.indexOf(keyMatch[0])
                    });
                }
            }
            
            if (searchType === 'value' || searchType === 'both') {
                // Look for string values
                const valueMatches = line.matchAll(/"([^"]+)"/g);
                for (const match of valueMatches) {
                    // Skip if this is a key (followed by colon)
                    const afterMatch = line.substring(match.index + match[0].length);
                    if (!afterMatch.match(/^\s*:/)) {
                        if (match[1].toLowerCase().includes(searchQuery)) {
                            matches.push({
                                lineNumber: lineNumber,
                                type: 'value',
                                value: match[1],
                                column: match.index
                            });
                        }
                    }
                }
                
                // Look for non-string values (numbers, booleans, null)
                const nonStringMatch = line.match(/:\s*([^,\s\]\}]+)/);
                if (nonStringMatch && nonStringMatch[1].toLowerCase().includes(searchQuery)) {
                    matches.push({
                        lineNumber: lineNumber,
                        type: 'value',
                        value: nonStringMatch[1],
                        column: line.indexOf(nonStringMatch[1])
                    });
                }
            }
        });
        
        return matches;
    }

    findMatches(data, query, searchType, path = '') {
        const matches = [];
        const searchQuery = query.toLowerCase();

        const traverse = (obj, currentPath) => {
            if (obj === null || typeof obj === 'undefined') return;

            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    traverse(item, `${currentPath}[${index}]`);
                });
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach(key => {
                    const newPath = currentPath ? `${currentPath}.${key}` : key;

                    // Check key match
                    if ((searchType === 'key' || searchType === 'both') && key.toLowerCase().includes(searchQuery)) {
                        matches.push({ path: newPath, type: 'key', value: key });
                    }

                    traverse(obj[key], newPath);
                });
            } else {
                // Check value match
                const valueStr = String(obj).toLowerCase();
                if ((searchType === 'value' || searchType === 'both') && valueStr.includes(searchQuery)) {
                    matches.push({ path: currentPath, type: 'value', value: obj });
                }
            }
        };

        traverse(data, '');
        return matches;
    }

    highlightSearchResults() {
        // This is a simplified version - in a real implementation,
        // you'd need to traverse the DOM and highlight matching text
        this.clearSearchHighlights();

        if (!this.settings.behavior.highlightMatches) return;

        const jsonContent = document.querySelector('.json-content');
        if (!jsonContent) return;

        // Simple text-based highlighting (could be improved)
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            this.highlightText(jsonContent, query);
        }
    }

    highlightText(element, query) {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const parent = textNode.parentNode;
            if (parent.classList.contains('search-highlight')) return;

            const text = textNode.textContent;
            if (regex.test(text)) {
                const highlightedText = text.replace(regex, '<span class="search-highlight">$1</span>');
                const wrapper = document.createElement('div');
                wrapper.innerHTML = highlightedText;

                while (wrapper.firstChild) {
                    parent.insertBefore(wrapper.firstChild, textNode);
                }
                parent.removeChild(textNode);
            }
        });
    }

    clearSearchHighlights() {
        this.currentSearchQuery = null;
        this.currentSearchType = null;
        this.searchResults = [];
        this.currentSearchIndex = -1;
        
        // Re-render to remove highlights
        this.updateActiveTabView();
    }

    updateSearchResults(total, current) {
        document.getElementById('searchResults').textContent = `${current}/${total}`;
    }

    previousSearchResult() {
        if (this.searchResults.length === 0) return;
        this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
        this.scrollToSearchResult(this.currentSearchIndex);
        this.updateSearchResults(this.searchResults.length, this.currentSearchIndex + 1);
    }

    nextSearchResult() {
        if (this.searchResults.length === 0) return;
        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
        this.scrollToSearchResult(this.currentSearchIndex);
        this.updateSearchResults(this.searchResults.length, this.currentSearchIndex + 1);
    }

    scrollToSearchResult(index) {
        if (!this.searchResults || index >= this.searchResults.length) return;
        
        const result = this.searchResults[index];
        const lineNumber = result.lineNumber;
        
        // Expand any collapsed regions that contain this result
        this.expandToShowLine(lineNumber);
        
        // Mark current search result
        this.currentSearchIndex = index;
        
        // Re-render to update highlighting
        this.updateActiveTabView();
        
        // Scroll to the line after render
        setTimeout(() => {
            const lineElement = document.querySelector(`.json-line[data-line="${lineNumber}"]`);
            if (lineElement) {
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Find and highlight the current match within the line
                const highlights = lineElement.querySelectorAll('.search-highlight');
                if (highlights.length > 0) {
                    // Remove previous current highlight
                    document.querySelectorAll('.search-highlight.current').forEach(el => {
                        el.classList.remove('current');
                    });
                    
                    // Add current highlight to the first match in this line
                    highlights[0].classList.add('current');
                }
            }
        }, 0);
    }
    
    expandToShowLine(targetLine) {
        // Expand any collapsed regions that contain this line
        Object.keys(this.collapsibleRegions).forEach(startLine => {
            const region = this.collapsibleRegions[startLine];
            if (region.collapsed && 
                targetLine > parseInt(startLine) && 
                targetLine <= region.endLine) {
                region.collapsed = false;
            }
        });
    }



    showWelcome() {
        document.getElementById('welcome').style.display = 'flex';
        document.getElementById('tabContent').style.display = 'none';
    }

    hideWelcome() {
        document.getElementById('welcome').style.display = 'none';
        document.getElementById('tabContent').style.display = 'block';
    }

    toggleSettings() {
        const settingsOverlay = document.getElementById('settingsOverlay');
        if (settingsOverlay.classList.contains('active')) {
            this.hideSettings();
        } else {
            this.showSettings();
        }
    }

    showSettings() {
        this.updateSettingsUI();
        document.getElementById('settingsOverlay').classList.add('active');
    }

    hideSettings() {
        document.getElementById('settingsOverlay').classList.remove('active');
    }

    updateSettingsUI() {
        document.getElementById('themeSelect').value = this.settings.theme;
        document.getElementById('fontFamilySelect').value = this.settings.fontFamily;
        document.getElementById('settingsFontSize').value = this.settings.fontSize;
        document.getElementById('settingsFontSizeValue').textContent = this.settings.fontSize + 'px';

        // Update color inputs
        Object.keys(this.settings.colors).forEach(colorType => {
            const colorInput = document.getElementById(colorType + 'Color');
            if (colorInput) {
                colorInput.value = this.settings.colors[colorType];
            }
        });

        // Update behavior checkboxes
        document.getElementById('autoExpand').checked = this.settings.behavior.autoExpand;
        document.getElementById('showDataTypes').checked = this.settings.behavior.showDataTypes;
        document.getElementById('highlightMatches').checked = this.settings.behavior.highlightMatches;
        document.getElementById('rainbowBrackets').checked = this.settings.behavior.rainbowBrackets;
        document.getElementById('showWhitespace').checked = this.settings.behavior.showWhitespace;

        // Sync settings panel checkboxes
        const settingsArrayIndices = document.getElementById('showArrayIndices');
        if (settingsArrayIndices) settingsArrayIndices.checked = this.settings.behavior.showArrayIndices;

        const settingsStringLength = document.getElementById('showStringLength');
        if (settingsStringLength) settingsStringLength.checked = this.settings.behavior.showStringLength;

        // Update character count threshold
        const thresholdSlider = document.getElementById('stringLengthThreshold');
        const thresholdValue = document.getElementById('stringLengthThresholdValue');
        if (thresholdSlider) thresholdSlider.value = this.settings.behavior.stringLengthThreshold || 20;
        if (thresholdValue) thresholdValue.textContent = (this.settings.behavior.stringLengthThreshold || 20) + ' chars';

        // Sync settings panel rainbow brackets
        const settingsRainbowBrackets = document.querySelector('.settings-panel #rainbowBrackets');
        if (settingsRainbowBrackets) settingsRainbowBrackets.checked = this.settings.behavior.rainbowBrackets;
    }

    async saveSettings() {
        if (window.electronAPI) {
            await window.electronAPI.saveSettings(this.settings);
        } else {
            localStorage.setItem('jsonViewerSettings', JSON.stringify(this.settings));
        }
        this.hideSettings();
    }

    async loadSettings() {
        try {
            let settings = null;

            if (window.electronAPI) {
                const result = await window.electronAPI.loadSettings();
                if (result.success && result.settings) {
                    settings = result.settings;
                }
            } else {
                const stored = localStorage.getItem('jsonViewerSettings');
                if (stored) {
                    settings = JSON.parse(stored);
                }
            }

            if (settings) {
                // Deep merge to preserve nested behavior settings
                this.settings = {
                    ...this.getDefaultSettings(),
                    ...settings,
                    behavior: {
                        ...this.getDefaultSettings().behavior,
                        ...settings.behavior
                    }
                };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    resetSettings() {
        this.settings = this.getDefaultSettings();
        this.applySettings();
        this.updateSettingsUI();
    }

    applySettings() {
        this.applyTheme();
        this.applyFontSettings();
        this.applyColorSettings();
        this.applyBehaviorSettings();
        this.updateUI();
    }
    
    applyBehaviorSettings() {
        // Apply whitespace visibility
        document.body.classList.toggle('show-whitespace', this.settings.behavior.showWhitespace);
        
        // Apply line numbers visibility
        document.body.classList.toggle('show-line-numbers', this.settings.behavior.showLineNumbers);
        
        // Apply word wrap
        const viewers = document.querySelectorAll('.json-viewer');
        viewers.forEach(viewer => {
            viewer.classList.toggle('word-wrap', this.settings.behavior.wordWrap);
            viewer.classList.toggle('with-line-numbers', this.settings.behavior.showLineNumbers);
        });
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.settings.theme);
    }

    applyFontSettings() {
        document.documentElement.style.setProperty('--font-family', this.settings.fontFamily);
        document.documentElement.style.setProperty('--font-size', this.settings.fontSize + 'px');

        // Update quick controls
        document.getElementById('fontSizeRange').value = this.settings.fontSize;
        document.getElementById('fontSizeValue').textContent = this.settings.fontSize + 'px';
    }

    applyColorSettings() {
        Object.keys(this.settings.colors).forEach(colorType => {
            document.documentElement.style.setProperty(`--json-${colorType}`, this.settings.colors[colorType]);
        });
    }

    updateUI() {
        // Update behavior-related UI elements
        document.getElementById('showLineNumbers').checked = this.settings.behavior.showLineNumbers;
        document.getElementById('wordWrap').checked = this.settings.behavior.wordWrap;
        document.getElementById('rainbowBrackets').checked = this.settings.behavior.rainbowBrackets;

        this.updateActiveTabView();
    }

    updateActiveTabView() {
        if (this.activeTabId) {
            this.updateContentUI();
        }
    }


    updateActiveTabViewPreservingState() {
        if (this.activeTabId) {
            // Save current scroll position
            const viewer = document.querySelector('.json-viewer');
            const scrollTop = viewer ? viewer.scrollTop : 0;
            const scrollLeft = viewer ? viewer.scrollLeft : 0;
            
            // Temporarily disable smooth scrolling
            viewer.style.scrollBehavior = 'auto';
            
            // Update the content
            this.updateContentUI();
            
            // Force immediate scroll restoration
            const updatedViewer = document.querySelector('.json-viewer');
            if (updatedViewer) {
                updatedViewer.scrollTop = scrollTop;
                updatedViewer.scrollLeft = scrollLeft;
                
                // Re-enable smooth scrolling after a moment
                setTimeout(() => {
                    updatedViewer.style.scrollBehavior = '';
                }, 100);
            }
        }
    }
}

// Initialize the application
const app = new JSONViewer();

// Make app globally accessible for onclick handlers
window.app = app;
