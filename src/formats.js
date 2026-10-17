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

    // A valid document as plain JSON, indented by `indent` spaces or on one
    // line when indent is 0. JSON and JSON with comments are rewritten from
    // their text, so only whitespace (and comments) change. JSON5 has to be
    // converted from its parsed value, so check json5NumberChange first.
    function toPlainJson(text, format, indent) {
        if (format === 'json5') return JSON.stringify(JSON5.parse(text), null, indent);
        return reindentJson(format === 'jsonc' ? stripJsonc(text).text : text, indent);
    }

    // A decimal number as sign, significant digits and exponent, so two
    // spellings of the same value (1.50, 15e-1) compare equal
    function canonicalNumber(literal) {
        const match = /^([+-]?)(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/.exec(literal);
        let digits = (match[2] + match[3]).replace(/^0+/, '');
        let exponent = Number(match[4] || 0) - match[3].length;
        // JSON5 reads -0 as negative zero, which JSON.stringify writes as 0
        if (!digits) return match[1] === '-' ? '-0' : '0';
        const trailing = digits.length - digits.replace(/0+$/, '').length;
        digits = digits.slice(0, digits.length - trailing);
        exponent += trailing;
        return `${match[1] === '-' ? '-' : ''}${digits}e${exponent}`;
    }

    // JavaScript numbers keep about 17 significant digits and stop at about
    // 1.8e308, so longer or larger numbers change when a JSON5 document is
    // converted to plain JSON. Returns the first such number as
    // { written, becomes }, or null if every number survives exactly.
    function json5NumberChange(text) {
        const tokens = /"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_$][\w$]*|[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
        for (const [token] of text.matchAll(tokens)) {
            if (!/^[+-]?[\d.]/.test(token)) continue;
            const negative = token[0] === '-';
            const unsigned = token.replace(/^[+-]/, '');
            const value = (negative ? -1 : 1) * Number(unsigned);
            const becomes = JSON.stringify(value);
            const exact = Number.isFinite(value) && (/^0x/i.test(unsigned)
                ? BigInt(Math.abs(value)) === BigInt(unsigned)
                : canonicalNumber(token) === canonicalNumber(becomes));
            if (!exact) return { written: token, becomes };
        }
        return null;
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

    window.JsonFormats = { LABELS, formatForName, parseDocument, findProblem, stripJsonc, toPlainJson, json5NumberChange };
})();
