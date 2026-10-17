// Loads the page's scripts into a sandbox with just enough of a DOM for the
// viewer's logic to run, so tests can call its methods directly.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = path.join(__dirname, '..', 'src');

// An object that accepts any property access or call, and remembers values
// assigned to it, standing in for DOM elements
function element() {
    const values = new Map();
    const target = function () {};
    return new Proxy(target, {
        get(_, prop) {
            if (values.has(prop)) return values.get(prop);
            if (prop === Symbol.toPrimitive) return () => '';
            if (prop === Symbol.iterator) return function* () {};
            if (prop === 'then') return undefined;
            const child = element();
            values.set(prop, child);
            return child;
        },
        set(_, prop, value) {
            values.set(prop, value);
            return true;
        },
        apply: () => element(),
        construct: () => element()
    });
}

function loadFormats() {
    const context = vm.createContext({});
    context.window = context;
    for (const file of ['vendor/json5.min.js', 'formats.js']) {
        vm.runInContext(fs.readFileSync(path.join(SRC, file), 'utf8'), context, { filename: file });
    }
    return context;
}

// The viewer with its rendering switched off. `native` becomes
// window.nativeAPI; dialogs answer with `answers.confirm`.
function loadViewer(native) {
    const context = loadFormats();
    const elements = {};
    const document = element();
    document.getElementById = (id) => (elements[id] ??= element());
    document.querySelector = () => null;
    document.querySelectorAll = () => [];
    const dialogs = [];
    const answers = { confirm: true };
    Object.assign(context, {
        document,
        nativeAPI: native,
        Blob,
        console,
        setTimeout,
        clearTimeout,
        requestAnimationFrame: () => 0,
        localStorage: { getItem: () => null, setItem() {} },
        navigator: { platform: 'test', clipboard: element() },
        alert: (message) => dialogs.push({ alert: message }),
        // Asynchronous, like the app's (see native-bridge.js)
        confirm: async (message) => {
            dialogs.push({ confirm: message });
            return answers.confirm;
        }
    });
    const source = fs.readFileSync(path.join(SRC, 'renderer.js'), 'utf8');
    vm.runInContext(source, context, { filename: 'renderer.js' });
    const viewer = context.app;
    viewer.updateContentUI = () => {};
    return { viewer, dialogs, answers, byId: (id) => document.getElementById(id) };
}

module.exports = { loadFormats, loadViewer };
