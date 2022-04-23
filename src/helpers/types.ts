// Types used to support https://github.com/tc39/proposal-regexp-match-indices
// This is added in the target ECMAscript but not in TypeScript?
interface RegExpIndices extends Array<[number, number] | undefined> {
    groups: {
        [key: string]: [number, number]
    }
}

interface RegExpExecArray {
    indices?: RegExpIndices
}