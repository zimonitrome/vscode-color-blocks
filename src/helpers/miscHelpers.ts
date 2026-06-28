import { Range } from "vscode";

// From: https://stackoverflow.com/a/44622467/7829241
export const defaultDict = new Proxy({}, {
    get: (target: any, name) => name in target ? target[name] : 0
});

export const strip = (s: string) => s.replace(/ /g, '');

// From: https://stackoverflow.com/a/10284006/7829241
export const zip = (rows: Array<Array<any>>) => rows[0].map((_, c) => rows.map(row => row[c]));

export const arrAdd = (array: Array<number>, value: number) => array.map(a => a + value);

// Visual width (in columns) of a string when rendered, with tabs advancing to
// the next tab stop. Used both for indentation and for measuring line length,
// so the block's left edge and right edge are computed in the same unit (issue #9).
export const getVisualWidth = (text: string, tabSize = 4) => {
    let column = 0;
    for (const character of text) {
        if (character === '\t')
            column += tabSize - (column % tabSize);
        else
            column += 1;
    }
    return column;
};

// Visual indentation (column) of a line's leading whitespace. Tabs must be
// measured against the running column rather than counted independently —
// otherwise lines that mix spaces and tabs are placed too far right (issue #9).
export const getIndention = (lineText: string, tabSize = 4) =>
    getVisualWidth(/^\s*/.exec(lineText)![0], tabSize);

export const rangeToString = (range: Range) => `[${range.start.line} ${range.start.character} -> ${range.end.line} ${range.end.character}]`;