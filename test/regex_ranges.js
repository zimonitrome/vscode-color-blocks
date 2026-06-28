// Regression check for issue #6 (Todo Tree conflict).
// The extension no longer uses the RegExp 'd' (match indices) flag, because
// reading match.indices crashes when Todo Tree is installed. Group ranges are
// computed manually instead. This test reproduces the real regex and asserts
// the manual ranges equal the native 'd'-flag indices for many inputs.
//
// Run: node test/regex_ranges.js

// --- reproduced verbatim from src/helpers/colorBlockRegex.ts ---
const clean = (piece) => (piece
    .replace(/((^|\n)(?:[^\/\\]|\/[^*\/]|\\.)*?)\s*\/\*(?:[^*]|\*[^\/])*(\*\/|)/g, '$1')
    .replace(/((^|\n)(?:[^\/\\]|\/[^\/]|\\.)*?)\s*\/\/[^\n]*/g, '$1')
    .replace(/\n\s*/g, '')
);
const mulitlineRegex = ({ raw }, ...interpolations) =>
    interpolations.reduce(
        (regex, insert, index) => (regex + insert + clean(raw[index + 1])),
        clean(raw[0])
    );

const regexString = mulitlineRegex`
(?<!\$){                                    // Start of color block arguments, but ignore shell/template substitutions
\s*
    (?:                                     // Mandatory argument:
        (?:color\s*:\s*)?                   //  Optional key word
        (?<color>(?:                        //  Capture mandatory color specifier -> group name "color"
            (#(?:[0-9a-f]{3}){1,2})         //   3-6 letter hexcolor
            |(\w+)                          //   ... OR named color (arbitrary word)
        ))
    )
\s*
    (?:                                     // Optional argument:
        ,\s*                                //  Comma
        (?:lines\s*:\s*)?                   //  Optional key word
        (?<lines>\d+)                       //  Capture integer number of lines -> group name "lines"
    )?
\s*
}                                           // End of color block arguments
`;

const groundTruthRegex = new RegExp(regexString, 'd'); // native indices = source of truth
const manualRegex = new RegExp(regexString);           // what the extension now uses

// --- reproduced from getColorBlockRanges in colorBlockRegex.ts ---
const getColorBlockRanges = (match) => {
    const start = match.index;
    const text = match[0];
    const whole = [start, start + text.length];
    const colorOffset = /^\{\s*(?:color\s*:\s*)?/.exec(text)[0].length;
    const colorValue = match.groups.color;
    const color = [start + colorOffset, start + colorOffset + colorValue.length];
    let lines;
    if (match.groups.lines) {
        const afterColor = colorOffset + colorValue.length;
        const linesOffset = afterColor + /\d+/.exec(text.slice(afterColor)).index;
        lines = [start + linesOffset, start + linesOffset + match.groups.lines.length];
    }
    return { whole, color, lines };
};

const eq = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

const inputs = [
    'x {#f9e, 4}',
    'label {#abcdef, 12}',
    '{orangered, 3}',
    '{ red }',
    '{color: red, 7}',
    '{ color : #fff , 99 }',
    '{#f90,3}',
    'prefix text {lines: 5 ... no} and {teal, 2} end',
    'tab\tindent {blue}',
    '{color}',                 // named color literally "color"
    'noise 1234 {#0a0, 8}',    // digits before the block must not confuse lines
];

let failures = 0;
for (const input of inputs) {
    const truth = groundTruthRegex.exec(input);
    const m = manualRegex.exec(input);
    if (!truth || !m) {
        console.log(`✗ no match: "${input}"`);
        failures++;
        continue;
    }
    const r = getColorBlockRanges(m);
    const okWhole = eq(r.whole, truth.indices[0]);
    const okColor = eq(r.color, truth.indices.groups.color);
    const truthLines = truth.indices.groups.lines;
    const okLines = truthLines ? eq(r.lines, truthLines) : r.lines === undefined;
    const ok = okWhole && okColor && okLines;
    if (!ok) failures++;
    console.log(
        `${ok ? ' ' : '✗'} whole${okWhole ? '✓' : '✗'} color${okColor ? '✓' : '✗'} lines${okLines ? '✓' : '✗'}  "${input}"`
    );
}

// --- simulate the Todo Tree conflict (issue #6) ---
// Todo Tree globally polyfills the match-indices getter; in the broken state,
// reading match.indices throws "Invalid flags: d". Verify the OLD approach
// (reading .indices) crashes, while the NEW approach (getColorBlockRanges) is
// immune because it never touches .indices.
console.log('\n=== Todo Tree conflict simulation ===');
const hijacked = manualRegex.exec('block {#f9e, 4}');
Object.defineProperty(hijacked, 'indices', {
    get() { throw new SyntaxError('Invalid flags: d'); },
});

let oldThrew = false;
try { void hijacked.indices[0]; } catch (e) { oldThrew = true; console.log(`  old approach (match.indices) -> throws: ${e.message}`); }
if (!oldThrew) { console.log('  old approach did NOT throw (simulation invalid)'); failures++; }

let newThrew = false;
let newResult;
try { newResult = getColorBlockRanges(hijacked); } catch (e) { newThrew = true; console.log(`  new approach threw unexpectedly: ${e.message}`); }
if (newThrew) failures++;
else console.log(`  new approach (getColorBlockRanges) -> ok: color=[${newResult.color}] lines=[${newResult.lines}]`);

console.log(
    failures === 0
        ? '\nPASS: manual ranges match native indices, and the new path is immune to the Todo Tree polyfill.'
        : `\nFAIL: ${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
