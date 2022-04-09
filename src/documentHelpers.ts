export const getIndention = (lineText: string, tabSize = 4) => {
    // Better way to do this?
    let leadingWhitespace = /^\s*/.exec(lineText)![0];
    let nLeadingTabs = leadingWhitespace.split('\t').length - 1;
    let nLeadingSpaces = leadingWhitespace.split(' ').length - 1;
    let indentation = tabSize*nLeadingTabs + nLeadingSpaces;
    return indentation;
};