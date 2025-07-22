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
                wordWrap: false
            }
        };
    }

    async init() {
        await this.loadSettings();
        this.applySettings();
        this.bindEvents();
        this.bindElectronEvents();
        this.createNewTab();
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
        document.getElementById('showLineNumbers').addEventListener('change', (e) => {
            this.settings.behavior.showLineNumbers = e.target.checked;
            this.updateActiveTabView();
        });
        document.getElementById('wordWrap').addEventListener('change', (e) => {
            this.settings.behavior.wordWrap = e.target.checked;
            this.updateActiveTabView();
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

        // JSON input modal
        document.getElementById('closeJsonModal').addEventListener('click', () => this.hidePasteModal());
        document.getElementById('cancelJsonInput').addEventListener('click', () => this.hidePasteModal());
        document.getElementById('loadJsonInput').addEventListener('click', () => this.loadJsonFromInput());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
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

    updateContentUI() {
        const tabContent = document.getElementById('tabContent');
        tabContent.innerHTML = '';

        if (!this.activeTabId) return;

        const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (!activeTab) return;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'tab-content active';

        if (activeTab.jsonData) {
            const viewer = document.createElement('div');
            viewer.className = `json-viewer ${this.settings.behavior.showLineNumbers ? 'with-line-numbers' : ''}`;

            if (this.settings.behavior.showLineNumbers) {
                const lineNumbers = this.generateLineNumbers(activeTab.content);
                const lineNumbersDiv = document.createElement('div');
                lineNumbersDiv.className = 'line-numbers';
                lineNumbersDiv.innerHTML = lineNumbers;
                viewer.appendChild(lineNumbersDiv);
            }

            const jsonContent = document.createElement('div');
            jsonContent.className = 'json-content';
            jsonContent.innerHTML = this.renderJSON(activeTab.jsonData);
            viewer.appendChild(jsonContent);

            // Status indicator
            const statusDiv = document.createElement('div');
            statusDiv.className = `status-indicator ${activeTab.isValid ? 'status-valid' : 'status-invalid'}`;
            statusDiv.textContent = activeTab.isValid ? 'Valid JSON' : 'Invalid JSON';
            viewer.appendChild(statusDiv);

            contentDiv.appendChild(viewer);
        } else if (activeTab.content) {
            // Show error for invalid JSON
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-display';
            errorDiv.textContent = 'Invalid JSON: ' + (activeTab.error || 'Unknown error');
            contentDiv.appendChild(errorDiv);
        }

        tabContent.appendChild(contentDiv);
    }

    renderJSON(data, level = 0, isRoot = true) {
        const indent = '  '.repeat(level);
        const nextIndent = '  '.repeat(level + 1);

        if (data === null) {
            return `<span class="json-null">null</span>`;
        }

        if (typeof data === 'boolean') {
            return `<span class="json-boolean">${data}</span>`;
        }

        if (typeof data === 'number') {
            return `<span class="json-number">${data}</span>`;
        }

        if (typeof data === 'string') {
            return `<span class="json-string">"${this.escapeHtml(data)}"</span>`;
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                return '<span class="json-array-bracket">[]</span>';
            }

            const items = data.map((item, index) => {
                return `${nextIndent}${this.renderJSON(item, level + 1, false)}`;
            }).join(',\n');

            const collapsed = !this.settings.behavior.autoExpand && level > 0;
            const toggleIcon = collapsed ? '▶' : '▼';
            const childrenClass = collapsed ? 'json-children json-collapsed' : 'json-children';
            const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;

            return `<div class="json-node ${isRoot ? 'root' : ''}" data-node-id="${nodeId}">
                <span class="json-expandable" onclick="window.app.toggleNode('${nodeId}')">
                    <span class="json-toggle">${toggleIcon}</span>
                    <span class="json-array-bracket">[</span>
                    ${this.settings.behavior.showDataTypes ? `<span class="json-type-badge">Array(${data.length})</span>` : ''}
                </span>
                <div class="${childrenClass}">
${items}
                </div>
                ${indent}<span class="json-array-bracket">]</span>
            </div>`;
        }

        if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length === 0) {
                return '<span class="json-object-bracket">{}</span>';
            }

            const items = keys.map(key => {
                return `${nextIndent}<span class="json-key">"${this.escapeHtml(key)}"</span>: ${this.renderJSON(data[key], level + 1, false)}`;
            }).join(',\n');

            const collapsed = !this.settings.behavior.autoExpand && level > 0;
            const toggleIcon = collapsed ? '▶' : '▼';
            const childrenClass = collapsed ? 'json-children json-collapsed' : 'json-children';
            const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;

            return `<div class="json-node ${isRoot ? 'root' : ''}" data-node-id="${nodeId}">
                <span class="json-expandable" onclick="window.app.toggleNode('${nodeId}')">
                    <span class="json-toggle">${toggleIcon}</span>
                    <span class="json-object-bracket">{</span>
                    ${this.settings.behavior.showDataTypes ? `<span class="json-type-badge">Object(${keys.length})</span>` : ''}
                </span>
                <div class="${childrenClass}">
${items}
                </div>
                ${indent}<span class="json-object-bracket">}</span>
            </div>`;
        }

        return String(data);
    }

    generateLineNumbers(content) {
        if (!content) return '';
        const lines = content.split('\n');
        return lines.map((_, index) => index + 1).join('\n');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    toggleNode(nodeId) {
        const node = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (!node) return;

        const isCollapsed = node.querySelector('.json-children').classList.contains('json-collapsed');
        const toggle = node.querySelector('.json-toggle');
        const children = node.querySelector('.json-children');

        if (isCollapsed) {
            // Expand
            children.classList.remove('json-collapsed');
            toggle.textContent = '▼';
        } else {
            // Collapse
            children.classList.add('json-collapsed');
            toggle.textContent = '▶';
        }
    }

    expandAll() {
        // Remove collapsed class from all children containers
        document.querySelectorAll('.json-children.json-collapsed').forEach(children => {
            children.classList.remove('json-collapsed');
        });

        // Update all toggle icons to expanded state
        document.querySelectorAll('.json-toggle').forEach(toggle => {
            toggle.textContent = '▼';
        });
    }

    collapseAll() {
        // Add collapsed class to all non-root children containers
        document.querySelectorAll('.json-node:not(.root) .json-children').forEach(children => {
            children.classList.add('json-collapsed');
        });

        // Update all non-root toggle icons to collapsed state
        document.querySelectorAll('.json-node:not(.root) .json-toggle').forEach(toggle => {
            toggle.textContent = '▶';
        });
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

        this.searchResults = this.findMatches(activeTab.jsonData, query, searchType);
        this.highlightSearchResults();
        this.updateSearchResults(this.searchResults.length, this.searchResults.length > 0 ? 1 : 0);

        if (this.searchResults.length > 0) {
            this.currentSearchIndex = 0;
            this.scrollToSearchResult(0);
        }
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
        document.querySelectorAll('.search-highlight').forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
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
        // Update current highlight
        document.querySelectorAll('.search-highlight.current').forEach(el => {
            el.classList.remove('current');
        });

        const highlights = document.querySelectorAll('.search-highlight');
        if (highlights[index]) {
            highlights[index].classList.add('current');
            highlights[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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
                this.settings = { ...this.getDefaultSettings(), ...settings };
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
        this.updateUI();
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

        this.updateActiveTabView();
    }

    updateActiveTabView() {
        if (this.activeTabId) {
            this.updateContentUI();
        }
    }
}

// Initialize the application
const app = new JSONViewer();

// Make app globally accessible for onclick handlers
window.app = app;
