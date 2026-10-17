const test = require('node:test');
const assert = require('node:assert');
const { loadFormats } = require('./harness');

const { JsonFormats } = loadFormats();

test('Format keeps numbers JavaScript cannot hold exactly', () => {
    const text = '{"id":9007199254740993,"big":1e400,"precise":0.10000000000000000001}';
    assert.strictEqual(
        JsonFormats.toPlainJson(text, 'json', 2),
        '{\n  "id": 9007199254740993,\n  "big": 1e400,\n  "precise": 0.10000000000000000001\n}'
    );
});

test('Minify keeps numbers, escapes, key order and repeated keys', () => {
    const text = '{\n  "b": 1,\n  "2": "caf\\u00e9 \\"q\\" , : { [",\n  "1": [ 9007199254740993 , -0.0 ],\n  "b": 2\n}';
    assert.strictEqual(
        JsonFormats.toPlainJson(text, 'json', 0),
        '{"b":1,"2":"caf\\u00e9 \\"q\\" , : { [","1":[9007199254740993,-0.0],"b":2}'
    );
});

test('Format writes empty containers and nesting like JSON.stringify', () => {
    const text = '[ {}, [ ], {"a": [1, {"b": null}]}, true, "x" ]';
    assert.strictEqual(JsonFormats.toPlainJson(text, 'json', 2), JSON.stringify(JSON.parse(text), null, 2));
    assert.strictEqual(JsonFormats.toPlainJson('  7 ', 'json', 2), '7');
});

test('JSON with comments loses its comments and trailing commas, nothing else', () => {
    const text = '{\n  // note\n  "n": 12345678901234567890, /* more */\n  "s": "// not a comment",\n}';
    assert.strictEqual(
        JsonFormats.toPlainJson(text, 'jsonc', 0),
        '{"n":12345678901234567890,"s":"// not a comment"}'
    );
});

test('JSON5 numbers that change as plain JSON are found', () => {
    // Copied out of the sandbox, whose objects have their own prototypes
    const change = (text) => {
        const found = JsonFormats.json5NumberChange(text);
        return found && { ...found };
    };
    assert.deepStrictEqual(change('{a: 9007199254740993}'), { written: '9007199254740993', becomes: '9007199254740992' });
    assert.deepStrictEqual(change('[1e400]'), { written: '1e400', becomes: 'null' });
    assert.deepStrictEqual(change('[-0.0]'), { written: '-0.0', becomes: '0' });
    assert.deepStrictEqual(change('[0x20000000000001]'), { written: '0x20000000000001', becomes: '9007199254740992' });
    assert.strictEqual(change('{a: .5, b: 5., c: +1, d: -0x1F, e: 1.50e3, f: 1e21, g: 0.1, h: 0.0}'), null);
    // Numbers inside strings, comments and names don't count
    assert.strictEqual(change("{'x': '9007199254740993', // 1e400\n key9007199254740993: 1}"), null);
});

test('JSON5 converts to plain JSON when its numbers survive', () => {
    assert.strictEqual(JsonFormats.toPlainJson("{a: 0x1F, b: 'x', c: [.5,],}", 'json5', 0), '{"a":31,"b":"x","c":[0.5]}');
});
