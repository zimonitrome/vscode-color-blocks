// Modified from from https://stackoverflow.com/a/60027277/7829241
const clean = (piece: string) => (piece
    .replace(/((^|\n)(?:[^\/\\]|\/[^*\/]|\\.)*?)\s*\/\*(?:[^*]|\*[^\/])*(\*\/|)/g, '$1')
    .replace(/((^|\n)(?:[^\/\\]|\/[^\/]|\\.)*?)\s*\/\/[^\n]*/g, '$1')
    .replace(/\n\s*/g, '')
);
const mulitlineRegex = ({ raw }: TemplateStringsArray, ...interpolations: string[]) =>
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

// NOTE: intentionally no 'd' (match indices) flag. Reading match.indices crashes
// when the Todo Tree extension is installed, because it globally polyfills the
// indices getter and throws "Invalid flags: d" (issue #6). Group ranges are
// computed manually in getColorBlockRanges instead.
export const colorBlockRegex = new RegExp(regexString);

export interface ColorBlockRanges {
    whole: [number, number];
    color: [number, number];
    lines?: [number, number];
}

// Offsets of the whole match and the named groups, relative to the searched
// string. The positions are deterministic from the regex structure: an opening
// `{`, optional whitespace and `color:` keyword, the color value, then an
// optional line count (the only digit run after the color).
export const getColorBlockRanges = (match: RegExpExecArray): ColorBlockRanges => {
    const start = match.index;
    const text = match[0];

    const whole: [number, number] = [start, start + text.length];

    const colorOffset = /^\{\s*(?:color\s*:\s*)?/.exec(text)![0].length;
    const colorValue = match.groups!.color;
    const color: [number, number] = [start + colorOffset, start + colorOffset + colorValue.length];

    let lines: [number, number] | undefined;
    if (match.groups!.lines) {
        const afterColor = colorOffset + colorValue.length;
        const linesOffset = afterColor + /\d+/.exec(text.slice(afterColor))!.index;
        lines = [start + linesOffset, start + linesOffset + match.groups!.lines.length];
    }

    return { whole, color, lines };
};
