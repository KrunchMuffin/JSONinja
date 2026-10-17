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

test('Format refuses a JSON5 number that would change', async () => {
    const { viewer, dialogs } = await viewerWith();
    const tab = await openFile(viewer, '/data/n.json5', '{id: 9007199254740993}');
    await viewer.formatCurrentTab();
    assert.strictEqual(tab.content, '{id: 9007199254740993}');
    assert.strictEqual(tab.dirty, false);
    assert.match(dialogs.at(-1).alert, /9007199254740993.*9007199254740992/);
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

test('installing an update offers to save unsaved changes first', async () => {
    const { viewer, calls } = await viewerWith({ confirmClose: async () => 'cancel' });
    viewer.markDirty(await openFile(viewer, '/data/a.json', '{}'));
    assert.strictEqual(await viewer.settleUnsaved(), false);
    assert.ok(calls.some((call) => call.name === 'confirmClose'));
});

test('closing the window can discard unsaved changes', async () => {
    const { viewer, calls } = await viewerWith({ confirmClose: async () => 'discard', quit: async () => {} });
    viewer.markDirty(await openFile(viewer, '/data/a.json', '{}'));
    await viewer.confirmQuit();
    assert.ok(!calls.some((call) => call.name === 'saveFile'));
    assert.ok(calls.some((call) => call.name === 'quit'));
});
