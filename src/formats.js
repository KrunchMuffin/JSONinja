// Reads the JSON-family formats JSONinja opens: JSON, JSON Lines (.jsonl,
// .ndjson), JSON with comments (.jsonc) and JSON5. Each is turned into a plain
// JavaScript value, which the viewer shows as a tree. Error positions are
// reported as { message, line, column, offset }, with offset in UTF-16 units.
(() => {
    const LABELS = {
        json: 'JSON',
        jsonl: 'JSON Lines',
        jsonc: 'JSON with comments',
        json5: 'JSON5'
    };

    // The format a file name declares, or null to decide from the content
    function formatForName(name) {
        const match = /\.([a-z0-9]+)$/i.exec(name || '');
        const ext = match ? match[1].toLowerCase() : '';
        if (ext === 'jsonl' || ext === 'ndjson') return 'jsonl';
        if (ext === 'jsonc' || ext === 'json5') return ext;
        return null;
    }

    // Blanks out // and /* */ comments and trailing commas, leaving strings
    // alone. Every removed character becomes a space (newlines are kept), so
    // positions in the result match the original text.
    function stripJsonc(text) {
        const out = text.split('');
        let i = 0;
        while (i < text.length) {
            const c = text[i];
            if (c === '"') {
                i++;
                while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
                i++;
            } else if (c === '/' && text[i + 1] === '/') {
                while (i < text.length && text[i] !== '\n') out[i++] = ' ';
            } else if (c === '/' && text[i + 1] === '*') {
                const end = text.indexOf('*/', i + 2);
                if (end === -1) return { unclosedComment: i };
                for (; i < end + 2; i++) if (text[i] !== '\n' && text[i] !== '\r') out[i] = ' ';
            } else {
                i++;
            }
        }

        // A comma followed only by whitespace and then } or ] is a trailing comma
        const blanked = out.join('');
        let inString = false;
        for (let j = 0; j < blanked.length; j++) {
            const c = blanked[j];
            if (inString) {
                if (c === '\\') j++;
                else if (c === '"') inString = false;
            } else if (c === '"') {
                inString = true;
            } else if (c === ',') {
                let k = j + 1;
                while (k < blanked.length && /\s/.test(blanked[k])) k++;
                if (blanked[k] === '}' || blanked[k] === ']') out[j] = ' ';
            }
        }
        return { text: out.join('') };
    }

    function parseJsonc(text) {
        const stripped = stripJsonc(text);
        if (stripped.unclosedComment !== undefined) throw new SyntaxError('a /* comment is never closed');
        return JSON.parse(stripped.text);
    }

    // JSON5 allows NaN and Infinity, which plain JSON (and so the tree, which
    // is drawn from JSON.stringify) can't write: they'd silently become null.
    // They're shown as strings instead, and counted so the viewer can say so.
    function parseJson5(text) {
        let count = 0;
        const visit = (value) => {
            if (typeof value === 'number') {
                if (Number.isFinite(value)) return value;
                count++;
                return String(value);
            }
            if (value && typeof value === 'object') {
                for (const key of Object.keys(value)) value[key] = visit(value[key]);
            }
            return value;
        };
        const data = visit(JSON5.parse(text));
        return { format: 'json5', data, nonFinite: count };
    }

    // One JSON value per non-blank line. Each record is keyed by its line in
    // the file; lines that don't parse are kept as text under a marked key.
    // With stopAtFirstError, gives up as soon as a line doesn't parse.
    function parseJsonLines(text, stopAtFirstError = false) {
        const records = {};
        const invalid = [];
        let count = 0;
        let start = 0;
        let lineNumber = 0;
        while (start <= text.length) {
            const end = text.indexOf('\n', start);
            let line = end === -1 ? text.slice(start) : text.slice(start, end);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            lineNumber++;
            if (line.trim()) {
                try {
                    records[`line ${lineNumber}`] = JSON.parse(line);
                    count++;
                } catch (error) {
                    if (stopAtFirstError) return null;
                    invalid.push({ line: lineNumber, message: error.message });
                    records[`line ${lineNumber} (unreadable)`] = line;
                }
            }
            if (end === -1) break;
            start = end + 1;
        }
        return { records, count, invalid };
    }

    // Returns { format, data, records?, invalid? } or { format, error }
    function parseDocument(text, name) {
        const declared = formatForName(name);
        if (declared === 'jsonl') {
            const lines = parseJsonLines(text);
            return { format: 'jsonl', data: lines.records, records: lines.count, invalid: lines.invalid };
        }
        if (declared === 'jsonc' || declared === 'json5') {
            try {
                return declared === 'jsonc' ? { format: 'jsonc', data: parseJsonc(text) } : parseJson5(text);
            } catch (error) {
                return { format: declared, error };
            }
        }

        try {
            return { format: 'json', data: JSON.parse(text) };
        } catch (error) {
            // A .json file or pasted text may really be another JSON-family format
            const lines = parseJsonLines(text, true);
            if (lines && lines.count >= 2) {
                return { format: 'jsonl', data: lines.records, records: lines.count, invalid: [] };
            }
            try {
                return { format: 'jsonc', data: parseJsonc(text) };
            } catch (e) {
                // Not JSON with comments either
            }
            try {
                return parseJson5(text);
            } catch (e) {
                // Report it against plain JSON, the format the name suggests
            }
            return { format: 'json', error };
        }
    }

    const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

    // Rewrites valid JSON text with each value on its own line, indented by
    // `indent` spaces, or all on one line when indent is 0. Only whitespace
    // changes: numbers, string escapes, key order and repeated keys stay
    // exactly as written, which JSON.stringify can't promise.
    function reindentJson(text, indent) {
        const out = [];
        const newline = (depth) => (indent ? '\n' + ' '.repeat(depth * indent) : '');
        let depth = 0;
        let i = 0;
        while (i < text.length) {
            const c = text[i];
            if (isSpace(c)) {
                i++;
            } else if (c === '"') {
                let end = i + 1;
                while (end < text.length && text[end] !== '"') end += text[end] === '\\' ? 2 : 1;
                out.push(text.slice(i, end + 1));
                i = end + 1;
            } else if (c === '{' || c === '[') {
                let next = i + 1;
                while (isSpace(text[next])) next++;
                if (text[next] === '}' || text[next] === ']') {
                    // Empty, written as {} or [] like JSON.stringify does
                    out.push(c + text[next]);
                    i = next + 1;
                } else {
                    out.push(c + newline(++depth));
                    i++;
                }
            } else if (c === '}' || c === ']') {
                out.push(newline(--depth) + c);
                i++;
            } else if (c === ',') {
                out.push(',' + newline(depth));
                i++;
            } else if (c === ':') {
                out.push(indent ? ': ' : ':');
                i++;
            } else {
                // A number, true, false or null, copied as written
                let end = i + 1;
                while (end < text.length && !isSpace(text[end]) && !',:]}'.includes(text[end])) end++;
                out.push(text.slice(i, end));
                i = end;
            }
        }
        return out.join('');
    }

    // JSON5's tokens: whitespace (which includes U+2028, U+2029 and the BOM),
    // comments (// ends at any line terminator), strings, numbers, names and
    // punctuation
    const JSON5_TOKEN = /\s+|\/\/[^\n\r\u2028\u2029]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'|[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|Infinity|NaN)|(?:[$_\p{ID_Start}]|\\u[0-9a-fA-F]{4})(?:[$\u200c\u200d\p{ID_Continue}]|\\u[0-9a-fA-F]{4})*|[{}[\]:,]/uy;

    // A JSON5 number written as JSON with exactly the same value: hex in
    // decimal, and no leading +, bare decimal point or trailing point
    function json5Number(token) {
        const sign = token[0] === '-' ? '-' : '';
        const unsigned = token.replace(/^[+-]/, '');
        if (/^0x/i.test(unsigned)) return sign + BigInt(unsigned).toString();
        if (unsigned === 'Infinity' || unsigned === 'NaN') {
            throw new SyntaxError(`plain JSON can't write ${token}`);
        }
        const [, whole, fraction, exponent = ''] = /^(\d*)(?:\.(\d*))?(.*)$/.exec(unsigned);
        return sign + (whole || '0') + (fraction ? '.' + fraction : '') + exponent;
    }

    // Rewrites valid JSON5 as compact JSON from its tokens, so numbers, key
    // order and repeated keys are kept, which JSON.stringify can't promise.
    // Comments and trailing commas are dropped; strings and names are
    // rewritten with JSON's quotes and escapes.
    function json5ToJson(text) {
        const tokens = [];
        JSON5_TOKEN.lastIndex = 0;
        while (JSON5_TOKEN.lastIndex < text.length) {
            const match = JSON5_TOKEN.exec(text);
            if (!match) throw new SyntaxError('not valid JSON5');
            const token = match[0];
            if (!/^(\s|\/[/*])/.test(token)) tokens.push(token);
        }
        return tokens.map((token, i) => {
            const next = tokens[i + 1];
            if (token === ',') return next === '}' || next === ']' ? '' : ',';
            if ('{}[]:'.includes(token)) return token;
            if (token[0] === '"' || token[0] === "'") return JSON.stringify(JSON5.parse(token));
            if (next === ':') return JSON.stringify(JSON.parse(`"${token}"`)); // a name
            if (token === 'true' || token === 'false' || token === 'null') return token;
            return json5Number(token);
        }).join('');
    }

    // A valid document as plain JSON, indented by `indent` spaces or on one
    // line when indent is 0. Only spacing, comments and trailing commas
    // change (and JSON5's own spellings), never a value.
    function toPlainJson(text, format, indent) {
        if (format === 'json5') text = json5ToJson(text);
        else if (format === 'jsonc') text = stripJsonc(text).text;
        return reindentJson(text, indent);
    }

    function offsetOf(text, line, column) {
        let offset = 0;
        for (let n = 1; n < line; n++) {
            const next = text.indexOf('\n', offset);
            if (next === -1) break;
            offset = next + 1;
        }
        return offset + column - 1;
    }

    function lineAndColumn(text, offset) {
        let line = 1;
        let lineStart = 0;
        for (let i = text.indexOf('\n'); i !== -1 && i < offset; i = text.indexOf('\n', i + 1)) {
            line++;
            lineStart = i + 1;
        }
        return { line, column: offset - lineStart + 1 };
    }

    // The first problem in text read as the given format, or null if there is
    // none. checkJson is the backend's precise JSON checker, when available.
    async function findProblem(text, format, checkJson) {
        const preciseJson = async (source) => {
            try {
                JSON.parse(source);
                return null;
            } catch (error) {
                let problem = { message: error.message };
                if (checkJson) {
                    try {
                        problem = (await checkJson(source)) || problem;
                    } catch (e) {
                        // Keep the web engine's message
                    }
                }
                return problem;
            }
        };

        if (format === 'jsonl') {
            let start = 0;
            let lineNumber = 0;
            while (start <= text.length) {
                const end = text.indexOf('\n', start);
                let line = end === -1 ? text.slice(start) : text.slice(start, end);
                if (line.endsWith('\r')) line = line.slice(0, -1);
                lineNumber++;
                if (line.trim()) {
                    const problem = await preciseJson(line);
                    if (problem) {
                        const column = problem.column || 1;
                        return {
                            message: problem.message,
                            line: lineNumber,
                            column,
                            offset: start + (problem.offset || 0)
                        };
                    }
                }
                if (end === -1) break;
                start = end + 1;
            }
            return null;
        }

        if (format === 'json5') {
            try {
                JSON5.parse(text);
                return null;
            } catch (error) {
                const line = error.lineNumber || 1;
                const column = error.columnNumber || 1;
                const message = error.message.replace(/^JSON5: /, '').replace(/ at \d+:\d+$/, '');
                return { message, line, column, offset: offsetOf(text, line, column) };
            }
        }

        if (format === 'jsonc') {
            const stripped = stripJsonc(text);
            if (stripped.unclosedComment !== undefined) {
                const where = lineAndColumn(text, stripped.unclosedComment);
                return { message: 'this /* comment is never closed', ...where, offset: stripped.unclosedComment };
            }
            // Positions in the stripped text match the original
            return preciseJson(stripped.text);
        }

        return preciseJson(text);
    }

    window.JsonFormats = { LABELS, formatForName, parseDocument, findProblem, stripJsonc, toPlainJson };
})();
