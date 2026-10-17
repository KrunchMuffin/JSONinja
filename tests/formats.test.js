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

test('JSON5 converts to plain JSON keeping every value exactly', () => {
    const json = (text) => JsonFormats.toPlainJson(text, 'json5', 0);
    assert.strictEqual(json("{a: 0x1F, b: 'x', c: [.5, 5., +1, -.5e3,],}"), '{"a":31,"b":"x","c":[0.5,5,1,-0.5e3]}');
    // Too long or too large for JavaScript, negative zero, and hex past 2^53
    assert.strictEqual(json('[9007199254740993, 1e400, -0.0, 0x20000000000001]'), '[9007199254740993,1e400,-0.0,9007199254740993]');
    // Repeated keys and key order
    assert.strictEqual(json('{b: 1, a: 1, a: 2}'), '{"b":1,"a":1,"a":2}');
    // Names that look like other things, and quotes and escapes in strings
    assert.strictEqual(json(`{Infinity: 1, true: 2, $_x9: "it's", 'say "hi"': '\x41'}`), '{"Infinity":1,"true":2,"$_x9":"it\'s","say \\"hi\\"":"A"}');
});

test('JSON5 comments end at every line terminator', () => {
    for (const code of [0x0d, 0x2028, 0x2029]) {
        const text = '{// note' + String.fromCharCode(code) + ' a: 9007199254740993 /* 1e400 */}';
        assert.strictEqual(JsonFormats.toPlainJson(text, 'json5', 0), '{"a":9007199254740993}');
    }
});
