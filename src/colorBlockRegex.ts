// Modified from from https://stackoverflow.com/a/60027277/7829241
const clean = (piece: string) => (piece
    .replace(/((^|\n)(?:[^\/\\]|\/[^*\/]|\\.)*?)\s*\/\*(?:[^*]|\*[^\/])*(\*\/|)/g, '$1')
    .replace(/((^|\n)(?:[^\/\\]|\/[^\/]|\\.)*?)\s*\/\/[^\n]*/g, '$1')
    .replace(/\n\s*/g, '')
);
const regex = ({ raw }: TemplateStringsArray, ...interpolations: string[] ) => (
    new RegExp(interpolations.reduce(
        (regex, insert, index) => (regex + insert + clean(raw[index + 1])),
        clean(raw[0])
    ), 'dg')
);

export const colorBlockRegex = regex`
{                                           // Start of color block arguments
\s*
    (?:                                     // Mandatory argument:
        (?:color\s*:\s*)?                   //  Optional key word
        (?<color>#(?:[0-9a-f]{3}){1,2})     //  Capture mandatory 3-6 letter hexcolor -> group name "color"
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