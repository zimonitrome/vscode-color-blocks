import { Range } from "vscode";

// From: https://stackoverflow.com/a/44622467/7829241
export const defaultDict = new Proxy({}, {
    get: (target: any, name) => name in target ? target[name] : 0
});

export const strip = (s: string) => s.replace(/ /g, '');

// From: https://stackoverflow.com/a/10284006/7829241
export const zip = (rows: Array<Array<any>>) => rows[0].map((_, c) => rows.map(row => row[c]));

export const arrAdd = (array: Array<number>, value: number) => array.map(a => a + value);

export const getIndention = (lineText: string, tabSize = 4) => {
    // Better way to do this?
    let leadingWhitespace = /^\s*/.exec(lineText)![0];
    let nLeadingTabs = leadingWhitespace.split('\t').length - 1;
    let nLeadingSpaces = leadingWhitespace.split(' ').length - 1;
    let indentation = tabSize*nLeadingTabs + nLeadingSpaces;
    return indentation;
};

export const rangeToString = (range: Range) => `[${range.start.line} ${range.start.character} -> ${range.end.line} ${range.end.character}]`;