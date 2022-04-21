// From: https://stackoverflow.com/a/44622467/7829241
export const defaultDict = new Proxy({}, {
    get: (target: any, name) => name in target ? target[name] : 0
});

export const strip = (s: string) => s.replace(/ /g, '');

// From: https://stackoverflow.com/a/10284006/7829241
export const zip = (rows: Array<Array<any>>) => rows[0].map((_, c) => rows.map(row => row[c]));

export const arrAdd = (array: Array<number>, value: number) => array.map(a => a + value);
