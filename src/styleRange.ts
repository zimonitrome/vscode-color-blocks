import * as vscode from 'vscode';
import { hexToHsl, hslToHex, decimalToHexString } from './colorHelpers';
import { getIndention } from './documentHelpers';

export const styleRange = (decorationRange: any, activeEditor: vscode.TextEditor, allDecorationTypes: any, settings: any) => {
    const nCommentLines = decorationRange.endLine - decorationRange.startLine + 1;

    let lighterHexColor = decorationRange.hexColor;

    let [h, s, l] = hexToHsl(decorationRange.hexColor);
    if (settings.standardizeColorBrightness.enabled)
        l = settings.standardizeColorBrightness.commentText;
    lighterHexColor = hslToHex(h, s, l);

    let left!: string;
    let customWidth!: string;
    if (settings.wrapText.enabled) {
        let shortestIndentation = Infinity;
        let longestLineLength = 0;
        let tabSize: number = vscode.workspace.getConfiguration("editor").get("tabSize")!;
        for (let lineNr = decorationRange.startLine; lineNr <= decorationRange.endLine; lineNr++) {
            let lineText = activeEditor.document.lineAt(lineNr).text;
    
            let indentation = getIndention(lineText, tabSize);
            
            shortestIndentation = Math.min(shortestIndentation, indentation);
            longestLineLength = Math.max(longestLineLength, lineText.length);
        }

        const padding = settings.wrapText.padding;
        left = `${shortestIndentation}ch`;
        customWidth = `${longestLineLength - shortestIndentation + padding}ch`;
    }
    else {
        const scrollbarSize = vscode.workspace.getConfiguration('editor').scrollbar.verticalScrollbarSize;
        left = `0`;
        customWidth = `calc(100% - ${scrollbarSize}px)`;
    }

    let backgroundHexColor = decorationRange.hexColor + decimalToHexString(255 * settings.background.opacity);
    let borderHexColor = decorationRange.hexColor + decimalToHexString(255 * settings.border.opacity);

    // We must style each line individually because...
    // - Normally styling the entire line prevents us from setting a custom width
    //   i.e. use 100% to refer to the text part. We must style the entire line
    //   or none of it.
    // - Styling the selected range prevents us from creating a block or extend the
    //   styling outside of the text area (without reading the text of each line and
    //   adding faux characters, even then its unknown if that is possible)
    // - Making a large box in the ::after/::before pseudoclass for an entire range
    //   works nicely. This supports custom widths of the style (we can wrap the block
    //   around the text or shrink it to not stetch under the minimap) BUT the styling
    //   will not render if the line is not visible.
    // The only alternative that works robustly is to style each individual line using
    // the ::after/::before pseudoclass.
    for (let lineNr = decorationRange.startLine; lineNr <= decorationRange.endLine; lineNr++) {
        let isTopLine = lineNr === decorationRange.startLine;
        let isBottomLine = lineNr === decorationRange.endLine;
        let topRadius = isTopLine ? settings.border.radius : 0;
        let bottomRadius = isBottomLine ? settings.border.radius : 0;
        let topWidth = isTopLine ? settings.border.width : 0;
        let bottomWidth = isBottomLine ? settings.border.width : 0;

        const midLineDecor = vscode.window.createTextEditorDecorationType({
            overviewRulerColor: backgroundHexColor,
            overviewRulerLane: vscode.OverviewRulerLane.Full,
            isWholeLine: true,
            before: {
                backgroundColor: backgroundHexColor,
                textDecoration: `;
                    border: 0px ${settings.border.style} ${borderHexColor};
                    border-width: ${topWidth} ${settings.border.width} ${bottomWidth} ${settings.border.width};
                    border-radius: ${topRadius} ${topRadius} ${bottomRadius} ${bottomRadius};
                    pointer-events: none;
                    left: ${left};
                    box-sizing: border-box;
                    position: absolute;`,
                contentText: " ",
                width: customWidth,
                height: "100%",
            },
            textDecoration: `; position: relative;`,
            // Custom styling for top line only
            ...(isTopLine && {
                ...(settings.commentLine.color && { color: lighterHexColor }),
            })
        });
        activeEditor.setDecorations(
            midLineDecor,
            [new vscode.Range(new vscode.Position(lineNr, 0), new vscode.Position(lineNr, 1))]
        );
        allDecorationTypes.push(midLineDecor);
    }

    // Style comment text
    let commentDecorationType = vscode.window.createTextEditorDecorationType({
        fontWeight: settings.commentLine.commentFontWeight,
        opacity: "1.0"
    });
    activeEditor.setDecorations(
        commentDecorationType,
        [decorationRange.matchTextCommentRange]
    );
    allDecorationTypes.push(commentDecorationType);

    // Style cbc args
    let keywordDecorationType = vscode.window.createTextEditorDecorationType({
        opacity: settings.commentLine.lineOpacity.toString()
    });
    activeEditor.setDecorations(
        keywordDecorationType,
        // [decorationRange.matchCbcArgsRange]
        [activeEditor.document.lineAt(decorationRange.startLine).range]
    );
    allDecorationTypes.push(keywordDecorationType);

};