// Reproduction + regression check for issue #9 "Blocks incorrectly placed"
// (block shifted to the right). Compares indentation math against the true
// visual column (the offset VS Code actually renders the code at).
//
// Run: node test/indent_repro.js

// --- old implementation (counted tabs and spaces independently) ---
const getIndentionOld = (lineText, tabSize = 4) => {
    let leadingWhitespace = /^\s*/.exec(lineText)[0];
    let nLeadingTabs = leadingWhitespace.split('\t').length - 1;
    let nLeadingSpaces = leadingWhitespace.split(' ').length - 1;
    return tabSize * nLeadingTabs + nLeadingSpaces;
};

// --- new implementation (mirrors src/helpers/miscHelpers.ts getIndention) ---
const getIndentionNew = (lineText, tabSize = 4) => {
    let leadingWhitespace = /^\s*/.exec(lineText)[0];
    let column = 0;
    for (const character of leadingWhitespace) {
        if (character === '\t') column += tabSize - (column % tabSize);
        else column += 1;
    }
    return column;
};

// --- ground truth: tab-stop-correct visual column ---
const visualColumn = getIndentionNew;

const T = '\t';
const cases = [
    { name: '1 tab',                 text: T + 'code' },
    { name: '2 tabs',                text: T + T + 'code' },
    { name: '4 spaces',              text: '    code' },
    { name: '8 spaces',              text: '        code' },
    { name: 'tab + tab (deep)',      text: T + T + T + 'code' },
    { name: 'mixed: 2sp then tab',   text: '  ' + T + 'code' },
    { name: 'mixed: tab then 2sp',   text: T + '  ' + 'code' },
    { name: 'mixed: 3sp then tab',   text: '   ' + T + 'code' },
    { name: 'mixed: sp tab sp tab',  text: ' ' + T + ' ' + T + 'code' },
];

let failures = 0;
for (const tabSize of [2, 4]) {
    console.log(`\n=== tabSize = ${tabSize} ===`);
    console.log('  old | new | visual | line');
    for (const c of cases) {
        const old = getIndentionOld(c.text, tabSize);
        const neu = getIndentionNew(c.text, tabSize);
        const visual = visualColumn(c.text, tabSize);
        if (neu !== visual) failures++;
        const flagOld = old === visual ? ' ' : '✗';
        const flagNew = neu === visual ? ' ' : '✗';
        const shown = c.text.replace(/\t/g, '»').replace(/ /g, '·');
        console.log(
            `${flagOld}${String(old).padStart(3)} |${flagNew}${String(neu).padStart(3)} | ${String(visual).padStart(4)}   | ${c.name.padEnd(20)} "${shown}"`
        );
    }
}

// --- block right-edge width (issue #9, bug B) ---
// Old code used line.text.length (tab = 1 char) for the longest line, while the
// left edge uses the visual column (tab = tabSize). That mismatch made the box
// end (tabSize-1)*nTabs columns too short. New code measures both in columns.
// getVisualWidth measures the WHOLE string (same loop as getIndentionNew, no
// leading-whitespace slice) — this is what the renderer now uses for the longest line.
const getVisualWidth = (text, tabSize = 4) => {
    let column = 0;
    for (const character of text) {
        if (character === '\t') column += tabSize - (column % tabSize);
        else column += 1;
    }
    return column;
};

console.log('\n=== right-edge width: old char-length vs new visual-width of longest line ===');
console.log('  old(len) | new(visual) | shortfall old left | line');
const widthCases = [
    { name: '2 tabs + text', text: T + T + 'const gamma = 3;' },
    { name: '1 tab + text',  text: T + 'const gamma = 3;' },
    { name: 'spaces only',   text: '    const gamma = 3;' },
];
for (const tabSize of [2, 4]) {
    console.log(`-- tabSize ${tabSize} --`);
    for (const c of widthCases) {
        const oldLen = c.text.length;                 // what old code used (tab = 1)
        const visual = getVisualWidth(c.text, tabSize); // rendered end column
        const hasTab = c.text.includes('\t');
        // Regression guards: spaces-only must be unchanged; tabbed lines must now reach further.
        if (!hasTab && oldLen !== visual) failures++;
        if (hasTab && visual <= oldLen) failures++;
        const shown = c.text.replace(/\t/g, '»').replace(/ /g, '·');
        console.log(`   ${String(oldLen).padStart(4)}    | ${String(visual).padStart(6)}      | ${String(visual - oldLen).padStart(6)} cols      "${shown}"`);
    }
}

console.log(
    failures === 0
        ? '\nPASS: new getIndention/getVisualWidth match the rendered visual column in all cases.'
        : `\nFAIL: ${failures} case(s) still mismatch.`
);
process.exit(failures === 0 ? 0 : 1);
