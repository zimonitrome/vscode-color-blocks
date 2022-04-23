import * as vscode from 'vscode';
import { hexToHsl, hslToHex, decimalToHexString } from './helpers/colorHelpers';
import { colorBlockRegex } from './helpers/colorBlockRegex';
import { arrAdd, getIndention } from './helpers/miscHelpers';
import { Comment } from './commentConfigHandler';

interface ContentRange {
    content: any;
    range: [number, number];
}

interface DecorationRange {
    comment: ContentRange;
    argumentBlock: ContentRange;
    hexColor: ContentRange;
    nLines?: ContentRange;
    commentStartLine: number;
    codeStartLine: number;
    endLine: number;
}

export class DecorationRangeHandler {

    public decorationRanges: Array<DecorationRange> = [];
    private allDecorationTypes: Array<vscode.TextEditorDecorationType> = [];

    // {#88f,10} TODO: Move?
    public redrawDecorationRanges(activeEditor: vscode.TextEditor, settings: vscode.WorkspaceConfiguration) {
        // Clear all decoration types
        this.allDecorationTypes.forEach(dt => dt.dispose());

        // Color all range lines
        this.decorationRanges.forEach(decorationRange => {
            this.styleRange(decorationRange, activeEditor, settings);
        });
    };

    // {#88f,31} TODO: Move?
    public updateExistingDecorationRanges(activeEditor: vscode.TextEditor, contentChanges: readonly vscode.TextDocumentContentChangeEvent[]) {
        const doc = activeEditor.document;
        const documentEndOffset = doc.offsetAt(doc.lineAt(doc.lineCount - 1).range.end);

        // If the user makes a change inside a decoration that results in a change of # of lines,
        // update the number listed inside the cbc braces.
        for (const change of contentChanges) {
            // Get difference in lines {#3a3,10}
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1; // TODO?: Maybe need to check doc.eol instead?
            const diff = linesInserted - linesInRange;

            // Lines didn't change
            if (diff === 0)
                continue;

            // Skip edit at the very end of the document
            const predictedCursorPosition = doc.offsetAt(change.range.end) + change.text.length;
            if (documentEndOffset === predictedCursorPosition)
                continue;

            // Make edits {#838,13}
            activeEditor.edit((editBuilder: vscode.TextEditorEdit) => {
                this.decorationRanges.forEach((decorationRange) => {
                    // No lines given, skip
                    if (!decorationRange.nLines)
                        return;

                    const commentEnd = doc.positionAt(decorationRange.comment.range[0]);
                    // If edit was made after the comment and before the end of the range
                    if (change.range.start.isAfterOrEqual(commentEnd) && (change.range.start.line <= decorationRange.endLine)) {
                        // Change range starts inside dec range
                        decorationRange.endLine += diff;
                        const nLinesNew = decorationRange.endLine - decorationRange.codeStartLine + 1;
                        const editRange = doc.getWordRangeAtPosition(doc.positionAt(decorationRange.nLines.range[0]));
                        // ^^ NOTE: This works so much better than using the range in "decorationRange".
                        //          Maybe we don't need to store all those ranges?

                        if (!editRange)
                            return;

                        editBuilder.replace(editRange, nLinesNew.toString());
                    }
                });
            }, { undoStopBefore: false, undoStopAfter: false });
        }
    };

    // Scan document for color blockS {#88f,65} TODO: Move?
    public addNewDecorationRanges(activeEditor: vscode.TextEditor, comments: Comment[]) {
        if (!activeEditor) return; // Needed?
        const doc = activeEditor.document;

        if (comments.length === 0) return;

        for (const comment of comments) {
            // Extract arguments for this comment
            const match = colorBlockRegex.exec(comment.content);

            if (!match)
                continue;

            const commentStartLineNumber = doc.positionAt(comment.range[0]).line;
            const commentEndLineNumber = doc.positionAt(comment.range[1]).line;

            const matchOffset = comment.range[0] + comment.startDelimiter.length;

            let nLinesAfterComment!: number;
            let nLines: ContentRange | undefined = undefined;
            if (match.groups!.lines) {
                nLinesAfterComment = parseInt(match.groups!.lines);
                nLines = {
                    content: nLinesAfterComment,
                    range: arrAdd(match.indices!.groups!.lines, matchOffset) as [number, number]
                };
            }
            else {
                // Count number of lines after the comment that are not empty
                let nLinesAfterCommentUntilEmpty = 0;
                let lineNumber = commentEndLineNumber + 1;
                let lineIsEmpty = doc.lineAt(lineNumber).isEmptyOrWhitespace;
                while (!lineIsEmpty) {
                    nLinesAfterCommentUntilEmpty++;
                    lineNumber++;
                    lineIsEmpty = doc.lineAt(lineNumber).isEmptyOrWhitespace;
                }

                nLinesAfterComment = nLinesAfterCommentUntilEmpty;
            }

            this.decorationRanges.push({
                comment: comment,
                argumentBlock: {
                    content: match[0],
                    range: arrAdd(match.indices![0]!, matchOffset) as [number, number]
                },
                hexColor: {
                    content: match.groups!.color,
                    range: arrAdd(match.indices!.groups!.color, matchOffset) as [number, number]
                },
                nLines: nLines,
                commentStartLine: commentStartLineNumber,
                codeStartLine: commentEndLineNumber + 1,
                endLine: commentEndLineNumber + nLinesAfterComment,
            });
        }
    };

    private styleRange(decorationRange: DecorationRange, activeEditor: vscode.TextEditor, settings: any) {
        // Optionally process the hexcolor and standardize it to a 6 character format
        let [h, s, l] = hexToHsl(decorationRange.hexColor.content);
        if (settings.standardizeColorBrightness.enabled)
            l = settings.standardizeColorBrightness.background;
        let hexColor = hslToHex(h, s, l);

        // Set an even lighter version of the hex color to use later
        if (settings.standardizeColorBrightness.enabled)
            l = settings.standardizeColorBrightness.commentText;
        let lighterHexColor = hslToHex(h, s, l);

        let left!: string;
        let customWidth!: string;
        // Calculate minimum width if wrapping is enabled
        if (settings.wrapText.enabled) {
            let shortestIndentation = Infinity;
            let longestLineLength = 0;
            let tabSize: number = vscode.workspace.getConfiguration("editor").get("tabSize")!;
            for (let lineNr = decorationRange.commentStartLine; lineNr <= decorationRange.endLine; lineNr++) {
                let line = activeEditor.document.lineAt(lineNr); // TODO: This will throw an error if an argument specifies too many lines. Maybe loop to min(enline, lastLineOfDocument).

                if (line.isEmptyOrWhitespace) continue; // If line is empty, skip

                let indentation = getIndention(line.text, tabSize);

                shortestIndentation = Math.min(shortestIndentation, indentation);
                longestLineLength = Math.max(longestLineLength, line.text.length);
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

        let backgroundHexColor = hexColor + decimalToHexString(255 * settings.background.opacity);
        let borderHexColor = hexColor + decimalToHexString(255 * settings.border.opacity);

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
        for (let lineNr = decorationRange.commentStartLine; lineNr <= decorationRange.endLine; lineNr++) {
            let isTopLine = lineNr === decorationRange.commentStartLine;
            let isCommentLine = lineNr < decorationRange.codeStartLine; // NOTE: this only accounts for the comment that has the color block argument in it
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
                    position: absolute;
                `,
                    contentText: '',
                    width: customWidth,
                    height: "100%",
                },
                // height: "100%",
                textDecoration: `; position: relative;`,
            });
            activeEditor.setDecorations(
                midLineDecor,
                [new vscode.Range(new vscode.Position(lineNr, 0), new vscode.Position(lineNr, 1))]
            );
            this.allDecorationTypes.push(midLineDecor);
        }

        // Style comment text
        let commentDecorationType = vscode.window.createTextEditorDecorationType({
            fontWeight: settings.commentLine.commentFontWeight,
            opacity: "1.0",
            ...(settings.commentLine.color && { color: lighterHexColor })
            // textDecoration: `; font-size: 300%; vertical-align:top; line-height: 100%; z-index: 1;`
            // textDecoration: `; font-size: 170%; vertical-align:middle; z-index: 1;` // <-- good one
        });
        activeEditor.setDecorations(
            commentDecorationType,
            [new vscode.Range(
                activeEditor.document.positionAt(decorationRange.comment.range[0]),
                activeEditor.document.positionAt(decorationRange.comment.range[1])
            )]
        );
        this.allDecorationTypes.push(commentDecorationType);

        // Style cb args
        let keywordDecorationType = vscode.window.createTextEditorDecorationType({
            opacity: settings.commentLine.lineOpacity.toString()
        });
        activeEditor.setDecorations(
            keywordDecorationType,
            // [decorationRange.matchCbcArgsRange]
            // [activeEditor.document.lineAt(decorationRange.startLine).range]
            [new vscode.Range(
                activeEditor.document.positionAt(decorationRange.argumentBlock.range[0]),
                activeEditor.document.positionAt(decorationRange.argumentBlock.range[1])
            )]
        );
        this.allDecorationTypes.push(keywordDecorationType);

    };

}