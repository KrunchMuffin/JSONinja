const test = require('node:test');
const assert = require('node:assert');
const { loadViewer } = require('./harness');

// window.nativeAPI with every method answering "nothing happened", apart
// from the ones a test provides. Calls are recorded by name.
function native(overrides = {}) {
    const calls = [];
    const api = new Proxy(overrides, {
        get(target, name) {
            return (...args) => {
                calls.push({ name, args });
                return name in target ? target[name](...args) : Promise.resolve({ success: false });
            };
        }
    });
    return { api, calls };
}

async function viewerWith(overrides) {
    const { api, calls } = native(overrides);
    const loaded = loadViewer(api);
    // Let init() finish binding its events
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { ...loaded, calls };
}

async function openFile(viewer, filePath, content) {
    viewer.createNewTab();
    const tab = viewer.getActiveTab();
    tab.filePath = filePath;
    await viewer.loadJsonContent(content, filePath.split('/').pop());
    return tab;
}

test('pasting opens a new tab and leaves the open file and its edits alone', async () => {
    const { viewer, byId } = await viewerWith();
    const file = await openFile(viewer, '/data/a.json', '{"a":1}');
    file.content = '{"a":2}';
    viewer.markDirty(file);

    byId('jsonInput').value = '{"pasted":true}';
    await viewer.loadJsonFromInput();

    const pasted = viewer.getActiveTab();
    assert.notStrictEqual(pasted, file);
    assert.strictEqual(pasted.filePath, null);
    assert.strictEqual(pasted.baseTitle, 'Pasted JSON');
    // Never saved anywhere, so closing it asks first
    assert.strictEqual(pasted.dirty, true);
    assert.strictEqual(file.content, '{"a":2}');
    assert.strictEqual(file.dirty, true);
    assert.strictEqual(file.filePath, '/data/a.json');
});

test('pasting into an empty Untitled tab uses it', async () => {
    const { viewer, byId } = await viewerWith();
    viewer.createNewTab();
    byId('jsonInput').value = '[1]';
    await viewer.loadJsonFromInput();
    assert.strictEqual(viewer.tabs.length, 1);
    assert.strictEqual(viewer.tabs[0].content, '[1]');
});

test('Format and Minify keep numbers JavaScript cannot hold exactly', async () => {
    const { viewer } = await viewerWith();
    const tab = await openFile(viewer, '/data/n.json', '{"id": 9007199254740993, "big": 1e400}');

    await viewer.formatCurrentTab();
    assert.strictEqual(tab.content, '{\n  "id": 9007199254740993,\n  "big": 1e400\n}');
    assert.strictEqual(tab.dirty, true);

    await viewer.minifyCurrentTab();
    assert.strictEqual(tab.content, '{"id":9007199254740993,"big":1e400}');
});

test('Format converts JSON5 keeping its numbers and repeated keys', async () => {
    const { viewer, answers } = await viewerWith();
    const tab = await openFile(viewer, '/data/n.json5', '{id: 9007199254740993, id: 0x1F, // note\n}');
    answers.confirm = true; // removing the comment
    await viewer.minifyCurrentTab();
    assert.strictEqual(tab.content, '{"id":9007199254740993,"id":31}');
});

test('an encoding reload updates the tab it came from, even after switching tabs', async () => {
    let finish;
    const { viewer } = await viewerWith({
        reloadWithEncoding: () => new Promise((resolve) => { finish = resolve; })
    });
    const a = await openFile(viewer, '/data/a.json', '{"a":"cafÃ©"}');
    const reload = viewer.reloadWithEncoding(a, 'latin1');
    const b = await openFile(viewer, '/data/b.json', '{"b":1}');
    b.content = '{"b":2}';
    viewer.markDirty(b);

    finish({ success: true, content: '{"a":"café"}', fileName: 'a.json' });
    await reload;

    assert.strictEqual(a.content, '{"a":"café"}');
    assert.strictEqual(a.encoding, 'latin1');
    assert.strictEqual(b.content, '{"b":2}');
    assert.strictEqual(b.dirty, true);
    assert.strictEqual(b.filePath, '/data/b.json');
});

test('an encoding reload asks before discarding unsaved edits', async () => {
    const { viewer, dialogs, answers } = await viewerWith({
        reloadWithEncoding: async () => ({ success: true, content: '{"a":1}', fileName: 'a.json' })
    });
    const a = await openFile(viewer, '/data/a.json', '{"a":0}');
    a.content = '{"a":2}';
    viewer.markDirty(a);

    answers.confirm = false;
    await viewer.reloadWithEncoding(a, 'latin1');
    assert.match(dialogs.at(-1).confirm, /unsaved changes/);
    assert.strictEqual(a.content, '{"a":2}');
    assert.strictEqual(a.dirty, true);
});

test('closing a tab with unsaved changes asks first', async () => {
    const { viewer, dialogs, answers } = await viewerWith();
    const tab = await openFile(viewer, '/data/a.json', '{}');
    viewer.markDirty(tab);

    answers.confirm = false;
    await viewer.closeTab(tab.id);
    assert.match(dialogs.at(-1).confirm, /unsaved changes/);
    assert.ok(viewer.tabs.includes(tab));

    answers.confirm = true;
    await viewer.closeTab(tab.id);
    assert.ok(!viewer.tabs.includes(tab));
});

test('the backend is told whenever unsaved changes come and go', async () => {
    const { viewer, calls } = await viewerWith();
    const reports = () => calls.filter((call) => call.name === 'setUnsaved').map((call) => call.args[0]);
    const tab = await openFile(viewer, '/data/a.json', '{}');
    viewer.markDirty(tab);
    tab.dirty = false;
    await viewer.closeTab(tab.id);
    assert.deepStrictEqual(reports(), [false, true, false]);
});

test('closing the window with unsaved changes can be cancelled', async () => {
    const { viewer, calls } = await viewerWith({ confirmClose: async () => 'cancel' });
    const tab = await openFile(viewer, '/data/a.json', '{}');
    viewer.markDirty(tab);
    await viewer.confirmQuit();
    assert.deepStrictEqual([...calls.find((call) => call.name === 'confirmClose').args[0]], ['a.json']);
    assert.ok(!calls.some((call) => call.name === 'quit'));
});

test('closing the window can save every unsaved tab first', async () => {
    const saved = [];
    const { viewer, calls } = await viewerWith({
        confirmClose: async () => 'save',
        saveFile: async ({ filePath }) => { saved.push(filePath); return { success: true }; },
        quit: async () => {}
    });
    for (const name of ['a', 'b']) viewer.markDirty(await openFile(viewer, `/data/${name}.json`, '{}'));
    await viewer.confirmQuit();
    assert.deepStrictEqual(saved, ['/data/a.json', '/data/b.json']);
    assert.ok(calls.some((call) => call.name === 'quit'));
});

test('closing the window stays open if a Save As is cancelled', async () => {
    const { viewer, calls } = await viewerWith({
        confirmClose: async () => 'save',
        saveFileAs: async () => ({ success: true, saved: null })
    });
    await viewer.openInNewTab('{}', 'Pasted JSON');
    viewer.markDirty(viewer.getActiveTab());
    await viewer.confirmQuit();
    assert.ok(!calls.some((call) => call.name === 'quit'));
});

test('closing the window stays open if a tab is edited while it saves', async () => {
    let tab;
    const { viewer, calls } = await viewerWith({
        confirmClose: async () => 'save',
        saveFile: async () => {
            tab.content = '{"typed":"during the save"}';
            return { success: true };
        },
        quit: async () => {}
    });
    tab = await openFile(viewer, '/data/a.json', '{}');
    viewer.markDirty(tab);
    await viewer.confirmQuit();
    assert.strictEqual(tab.dirty, true);
    assert.ok(!calls.some((call) => call.name === 'quit'));
});

test('an encoding reload reads again if the tab changed during the read', async () => {
    let reads = 0;
    let tab;
    const { viewer } = await viewerWith({
        reloadWithEncoding: async () => {
            reads++;
            // The first time, the tab is edited and saved while the file is read
            if (reads === 1) tab.content = '{"saved":"meanwhile"}';
            return { success: true, content: reads === 1 ? '{"stale":1}' : '{"saved":"meanwhile"}', fileName: 'a.json' };
        }
    });
    tab = await openFile(viewer, '/data/a.json', '{}');
    await viewer.reloadWithEncoding(tab, 'latin1');
    assert.strictEqual(reads, 2);
    assert.strictEqual(tab.content, '{"saved":"meanwhile"}');
});

test('closing the window asks again about a tab edited while others saved', async () => {
    let other;
    const asked = [];
    const { viewer, calls } = await viewerWith({
        confirmClose: async (names) => {
            asked.push([...names]);
            return asked.length === 1 ? 'save' : 'cancel';
        },
        saveFile: async () => {
            other.content = '{"typed":"during the save"}';
            viewer.markDirty(other);
            return { success: true };
        }
    });
    const first = await openFile(viewer, '/data/a.json', '{}');
    other = await openFile(viewer, '/data/b.json', '{}');
    viewer.markDirty(first);
    await viewer.confirmQuit();
    assert.deepStrictEqual(asked, [['a.json'], ['b.json']]);
    assert.ok(!calls.some((call) => call.name === 'quit'));
});

test('installing an update settles edits made during the download', async () => {
    let tab;
    const { viewer, calls, byId } = await viewerWith({
        downloadUpdate: async () => {
            viewer.markDirty(tab);
            return { success: true };
        },
        confirmClose: async () => 'cancel'
    });
    tab = await openFile(viewer, '/data/a.json', '{}');
    let install;
    byId('updateInstallBtn').addEventListener = (type, listener) => { install = listener; };
    viewer.bindUpdateBanner();
    const announce = calls.filter((call) => call.name === 'onUpdateAvailable').at(-1).args[0];
    announce(null, { version: '9.9.9', canInstall: true });
    await install();
    assert.ok(calls.some((call) => call.name === 'confirmClose'));
    assert.ok(!calls.some((call) => call.name === 'installUpdate'));
});

test('closing the window can discard unsaved changes', async () => {
    const { viewer, calls } = await viewerWith({ confirmClose: async () => 'discard', quit: async () => {} });
    viewer.markDirty(await openFile(viewer, '/data/a.json', '{}'));
    await viewer.confirmQuit();
    assert.ok(!calls.some((call) => call.name === 'saveFile'));
    assert.ok(calls.some((call) => call.name === 'quit'));
});

test('the path of each displayed line follows the formatted document', async () => {
    const { viewer } = await viewerWith();
    const data = { users: [{ name: 'Maya', tags: [] }, 7], 'odd key': { 'a"b': null }, empty: {} };
    const lines = JSON.stringify(data, null, 2).split('\n');
    const expected = {
        '"users": [': '$.users',
        '"name": "Maya",': '$.users[0].name',
        '"tags": []': '$.users[0].tags',
        '7': '$.users[1]',
        '"odd key": {': '$["odd key"]',
        '"a\\"b": null': '$["odd key"]["a\\"b"]',
        '"empty": {}': '$.empty'
    };
    lines.forEach((line, i) => {
        const want = expected[line.trim()] ?? expected[line.trim().replace(/,$/, '')];
        if (want) assert.strictEqual(viewer.pathForLine(data, i + 1), want, line);
    });
    assert.strictEqual(viewer.pathForLine(data, 1), '$');
    // A closing bracket belongs to its container, and nothing is past the end
    assert.strictEqual(viewer.pathForLine(data, lines.indexOf('  ],') + 1), '$.users');
    assert.strictEqual(viewer.pathForLine(data, lines.length), '$');
    assert.strictEqual(viewer.pathForLine(data, lines.length + 1), null);
});

test('stats count what the document holds', async () => {
    const { viewer } = await viewerWith();
    const data = { a: 1, b: [true, null, { c: 'x' }], d: {} };
    const stats = viewer.jsonStats(data);
    assert.strictEqual(stats.lines, JSON.stringify(data, null, 2).split('\n').length);
    assert.strictEqual(stats.keys, 4);
    assert.strictEqual(stats.objects, 3);
    assert.strictEqual(stats.arrays, 1);
    assert.strictEqual(stats.values, 4);
    assert.strictEqual(stats.depth, 3);
    assert.strictEqual(viewer.jsonStats([]).depth, 1);
});

test('file sizes read naturally', async () => {
    const { viewer } = await viewerWith();
    assert.strictEqual(viewer.formatBytes(512), '512 B');
    assert.strictEqual(viewer.formatBytes(1536), '1.5 KB');
    assert.strictEqual(viewer.formatBytes(5 * 1024 * 1024), '5.0 MB');
});

test('the status bar shows the document and forgets the line when it changes', async () => {
    const { viewer, byId } = await viewerWith();
    const tab = await openFile(viewer, '/data/a.json', '{"a":{"b":1}}');
    viewer.updateStatusBar();
    assert.strictEqual(byId('statusBar').hidden, false);
    assert.match(byId('statusBarStats').textContent, /2 keys/);
    assert.match(byId('statusBarStats').textContent, /13 B/);
    assert.strictEqual(byId('statusBarPathText').textContent, 'Click a line to see its path');

    viewer.selectLine(tab, 3);
    assert.strictEqual(tab.selectedLine, 3);
    assert.strictEqual(byId('statusBarPathText').textContent, '$.a.b');

    tab.jsonData = { other: true };
    viewer.updateStatusBar();
    assert.strictEqual(tab.selectedLine, null);
    assert.strictEqual(byId('statusBarPathText').textContent, 'Click a line to see its path');
});

test('the status bar follows its settings and hides while editing', async () => {
    const { viewer, byId } = await viewerWith();
    const tab = await openFile(viewer, '/data/a.json', '{"a":1}');
    viewer.settings.behavior.showStatsBar = false;
    viewer.updateStatusBar();
    assert.strictEqual(byId('statusBarStats').hidden, true);
    assert.strictEqual(byId('statusBarPath').hidden, false);

    viewer.settings.behavior.showPathDisplay = false;
    viewer.updateStatusBar();
    assert.strictEqual(byId('statusBar').hidden, true);

    viewer.settings.behavior.showStatsBar = true;
    viewer.settings.behavior.showPathDisplay = true;
    tab.editing = true;
    viewer.updateStatusBar();
    assert.strictEqual(byId('statusBar').hidden, true);
});

test('both status bar settings default to on, including for saved settings from before', async () => {
    const { viewer } = await viewerWith({
        loadSettings: async () => ({ success: true, settings: { behavior: { showLineNumbers: false } } })
    });
    assert.strictEqual(viewer.settings.behavior.showStatsBar, true);
    assert.strictEqual(viewer.settings.behavior.showPathDisplay, true);
    assert.strictEqual(viewer.settings.behavior.showLineNumbers, false);
});

// { a: { b: { c: 1 }, d: 2 }, e: [ 3 ] } as displayed:
// 1 {  2 "a": {  3 "b": {  4 "c": 1  5 },  6 "d": 2  7 },  8 "e": [  9 3  10 ]  11 }
const NESTED_LINES = JSON.stringify({ a: { b: { c: 1 }, d: 2 }, e: [3] }, null, 2).split('\n');

test('opening a region keeps the regions closed inside it closed', async () => {
    const { viewer } = await viewerWith();
    viewer.collapsibleRegions = viewer.buildCollapsibleMap(NESTED_LINES);
    const regions = viewer.collapsibleRegions;
    Object.values(regions).forEach(region => { region.collapsed = true; });

    assert.deepStrictEqual([...viewer.linesToShow(regions[1])], [2, 8, 11]);
    assert.deepStrictEqual([...viewer.linesToShow(regions[2])], [3, 6, 7]);

    regions[2].collapsed = false;
    assert.deepStrictEqual([...viewer.linesToShow(regions[1])], [2, 3, 6, 7, 8, 11]);
});

test('hidden lines follow the outermost closed region', async () => {
    const { viewer } = await viewerWith();
    viewer.collapsibleRegions = viewer.buildCollapsibleMap(NESTED_LINES);
    const hiddenLines = () => [...viewer.hiddenLineFlags(NESTED_LINES.length)]
        .flatMap((flag, line) => (flag ? [line] : []));
    assert.deepStrictEqual(hiddenLines(), []);

    viewer.collapsibleRegions[3].collapsed = true;
    assert.deepStrictEqual(hiddenLines(), [4, 5]);

    viewer.collapsibleRegions[2].collapsed = true;
    assert.deepStrictEqual(hiddenLines(), [3, 4, 5, 6, 7]);
});

test('closed regions belong to their own tab and document', async () => {
    const { viewer } = await viewerWith();
    const lines = ['{', '  "a": {', '    "b": 1', '  }', '}'];
    const first = await openFile(viewer, '/data/a.json', '{"a":{"b":1}}');
    viewer.prepareRegions(lines);
    viewer.collapsibleRegions[2].collapsed = true;

    viewer.prepareRegions(lines);
    assert.strictEqual(viewer.collapsibleRegions[2].collapsed, true, 'kept on redraw');

    await openFile(viewer, '/data/b.json', '{"a":{"b":1}}');
    viewer.prepareRegions(lines);
    assert.strictEqual(viewer.collapsibleRegions[2].collapsed, false, 'not carried to another tab');

    viewer.switchToTab(first.id);
    viewer.prepareRegions(lines);
    assert.strictEqual(viewer.collapsibleRegions[2].collapsed, true, 'still closed back on its tab');

    first.jsonData = { a: { b: 2 } };
    viewer.prepareRegions(lines);
    assert.strictEqual(viewer.collapsibleRegions[2].collapsed, false, 'not carried to a new document');
});

test('search reports only the closed regions around its match', async () => {
    const { viewer } = await viewerWith();
    viewer.collapsibleRegions = viewer.buildCollapsibleMap(NESTED_LINES);
    const regions = viewer.collapsibleRegions;
    regions[2].collapsed = true;
    regions[8].collapsed = true;

    const opened = viewer.expandToShowLine(4);
    assert.deepStrictEqual([...opened], [regions[2]]);
    assert.strictEqual(regions[8].collapsed, true);
    assert.strictEqual(viewer.expandToShowLine(4).length, 0);
});

test('very large files scroll through the lines left after folding', async () => {
    const { viewer } = await viewerWith();
    viewer.collapsibleRegions = viewer.buildCollapsibleMap(NESTED_LINES);
    viewer.collapsibleRegions[3].collapsed = true;
    viewer.collapsibleRegions[8].collapsed = true;

    const shown = viewer.shownLineNumbers(NESTED_LINES.length);
    assert.deepStrictEqual([...shown], [1, 2, 3, 6, 7, 8, 11]);
    assert.strictEqual(viewer.rowOfLine(shown, 1), 0);
    assert.strictEqual(viewer.rowOfLine(shown, 6), 3);
    assert.strictEqual(viewer.rowOfLine(shown, 11), 6);
});
