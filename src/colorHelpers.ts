export const hexCodeRegex = /^#([0-9a-f]{3}){1,2}$/i;

// Modified from: https://css-tricks.com/converting-color-spaces-in-javascript/
export function hexToHsl(hexColor: string) {
    // Convert hex to RGB first
    let r = 0, g = 0, b = 0;
    if (hexColor.length === 4) {
        r = parseInt("0x" + hexColor[1] + hexColor[1]);
        g = parseInt("0x" + hexColor[2] + hexColor[2]);
        b = parseInt("0x" + hexColor[3] + hexColor[3]);
    } else if (hexColor.length === 7) {
        r = parseInt("0x" + hexColor[1] + hexColor[2]);
        g = parseInt("0x" + hexColor[3] + hexColor[4]);
        b = parseInt("0x" + hexColor[5] + hexColor[6]);
    }
    // Then to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;

    if (delta === 0)
        h = 0;
    else if (cmax === r)
        h = ((g - b) / delta) % 6;
    else if (cmax === g)
        h = (b - r) / delta + 2;
    else
        h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0)
        h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return [h, s, l];
}

// Modified from: https://css-tricks.com/converting-color-spaces-in-javascript/
export function hslToHex(h: number, s: number, l: number) {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    // Having obtained RGB, convert channels to hex
    let stringColor = [r,g,b].map(color => Math.round((color + m) * 255).toString(16));

    // Prepend 0s, if necessary
    stringColor = stringColor.map(color => (color.length === 1) ? '0' + color : color);

    return "#" + stringColor.join('');
}

// From: https://stackoverflow.com/a/697841
export function decimalToHexString(decimal: number) {
    let hexString = decimal.toString(16);
    if (hexString.length < 2)
        hexString = `0${hexString}`;

    return hexString;
}