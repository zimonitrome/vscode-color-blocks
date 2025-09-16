import * as vscode from 'vscode';
import { hexToHsl, hslToHex, decimalToHexString } from './helpers/colorHelpers';
import { colorBlockRegex } from './helpers/colorBlockRegex';
import { arrAdd, getIndention } from './helpers/miscHelpers';
import { Comment } from './commentConfigHandler';
import toHex = require('colornames');

interface ContentRange {
    content: any;
    range: [number, number];
}

interface DecorationRange {
    comment: Comment;
    argumentBlock: ContentRange;
    hexColor: ContentRange;
    nLines?: ContentRange;
    commentStartLine: number;
    codeStartLine: number;
    endLine: number;
}

const safeGetLineNr = (lineNr: number, doc: vscode.TextDocument) => Math.min(lineNr, doc.lineCount - 1);

export class DecorationRangeHandler {

    public decorationRanges: Array<DecorationRange> = [];
    private allDecorationTypes: Array<vscode.TextEditorDecorationType> = [];

    // {#88f,9}
    public redrawDecorationRanges(activeEditor: vscode.TextEditor, settings: vscode.WorkspaceConfiguration) {
        // Clear all decoration types
        this.allDecorationTypes.forEach(dt => dt.dispose());

        // Color all range lines
        this.decorationRanges.forEach(decorationRange => {
            this.styleRange(decorationRange, activeEditor, settings);
        });
    };

    private async makeReplaceEdit(range: vscode.Range, text: string, maxRetries = 10) {
        for (let i = 0; i <= maxRetries; i++) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const success = await editor.edit(editBuilder => {
                editBuilder.replace(
                    range,
                    text
                );
            }, { undoStopBefore: false, undoStopAfter: false });

            if (success) break;
        }
    };

    public updateExistingDecorationRanges(activeEditor: vscode.TextEditor, contentChanges: readonly vscode.TextDocumentContentChangeEvent[]) {
        const doc = activeEditor.document;
        const documentEndOffset = doc.offsetAt(doc.lineAt(doc.lineCount - 1).range.end);

        // If the user makes a change inside a decoration that results in a change of # of lines,
        // update the number listed inside the cbc braces.
        for (const change of contentChanges) {
            const linesInserted = change.text.split("\n").length - 1;

            // Skip edit at the very end of the document
            const predictedCursorPosition = doc.offsetAt(change.range.end) + change.text.length;
            if (documentEndOffset === predictedCursorPosition) continue;

            for (const decorationRange of this.decorationRanges) {
                // No lines given, skip
                if (!decorationRange.nLines) continue;

                const validChangeRange = new vscode.Range(
                    doc.lineAt(decorationRange.codeStartLine-1).range.end,
                    doc.lineAt(safeGetLineNr(decorationRange.endLine, doc)).range.end,
                );

                // If edit was made after the comment and before the end of the range
                if (validChangeRange.contains(change.range.start)) {
                    // Change range starts inside dec range
                    const intersection = validChangeRange.intersection(change.range)!;
                    const nIntersectingLines = intersection.end.line - intersection.start.line;
                    const diff = linesInserted - nIntersectingLines;

                    decorationRange.endLine = safeGetLineNr(decorationRange.endLine + diff, doc);
                    const nLinesNew = decorationRange.endLine - decorationRange.codeStartLine + 1;
                    const editRange = doc.getWordRangeAtPosition(doc.positionAt(decorationRange.nLines.range[0]));
                    // ^^ NOTE: This works so much better than using the range in "decorationRange".
                    //          Maybe we don't need to store all those ranges?

                    if (!editRange) continue;

                    // Make edits {#838}
                    this.makeReplaceEdit(editRange, nLinesNew.toString(), 200);
                
                }
            }
        }
    };

    // Scan document for color blockS {#88f,61}
    public addNewDecorationRanges(activeEditor: vscode.TextEditor, comments: Comment[]) {
        if (!activeEditor) return; // Needed?
        const doc = activeEditor.document;

        if (comments.length === 0) return;

        for (const comment of comments) {
            // Extract arguments for this comment
            const match = colorBlockRegex.exec(comment.content);

            if (!match)
                continue;

            const colorHex = match.groups?.color.startsWith('#')
                ? match.groups.color
                : toHex(match.groups?.color ?? ''); // returns undefined if argument isn't a named color

            if (!colorHex)
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
            
            // Make sure endLine is not outside of document
            const endLine = safeGetLineNr(commentEndLineNumber + nLinesAfterComment, doc);

            this.decorationRanges.push({
                comment: comment,
                argumentBlock: {
                    content: match[0],
                    range: arrAdd(match.indices![0]!, matchOffset) as [number, number]
                },
                hexColor: {
                    content: colorHex,
                    range: arrAdd(match.indices!.groups!.color, matchOffset) as [number, number]
                },
                nLines: nLines,
                commentStartLine: commentStartLineNumber,
                codeStartLine: commentEndLineNumber + 1,
                endLine: endLine,
            });
        }
    };

    private styleRange(decorationRange: DecorationRange, editor: vscode.TextEditor, settings: any) {
        const doc = editor.document;

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

        const endLine = safeGetLineNr(decorationRange.endLine, doc);

        // Calculate minimum width if wrapping is enabled
        if (settings.wrapText.enabled) {
            let shortestIndentation = Infinity;
            let longestLineLength = 0;
            let tabSize: number = vscode.workspace.getConfiguration("editor").get("tabSize")!;
            for (let lineNr = decorationRange.commentStartLine; lineNr <= endLine; lineNr++) {
                let line = doc.lineAt(lineNr);

                if (line.isEmptyOrWhitespace) continue; // If line is empty, skip

                let indentation = getIndention(line.text, tabSize);

                shortestIndentation = Math.min(shortestIndentation, indentation);
                longestLineLength = Math.max(longestLineLength, line.text.length);
            }

            left = `${shortestIndentation}ch`;
            customWidth = `${longestLineLength - shortestIndentation + settings.wrapText.paddingRight}ch`;
        }
        else {
            // Otherwise, stretch to the entire width of the editor minus the scrollbar
            left = `0`;
            // const scrollbarSize = vscode.workspace.getConfiguration('editor').scrollbar.verticalScrollbarSize;
            // customWidth = `calc(100% - ${scrollbarSize}px)`; // currently doesn't work :(
            customWidth = `999999px`; // HACK
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
        for (let lineNr = decorationRange.commentStartLine; lineNr <= endLine; lineNr++) {
            let isTopLine = lineNr === decorationRange.commentStartLine;
            let isBottomLine = lineNr === endLine;
            let topRadius = isTopLine ? settings.border.radius : 0;
            let bottomRadius = isBottomLine ? settings.border.radius : 0;
            let topWidth = isTopLine ? settings.border.width : 0;
            let bottomWidth = isBottomLine ? settings.border.width : 0;

            const midLineDecor = vscode.window.createTextEditorDecorationType({
                overviewRulerColor: backgroundHexColor,
                overviewRulerLane: vscode.OverviewRulerLane.Full,
                isWholeLine: true,
                textDecoration: `;
                position: relative;`,
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
            });
            editor.setDecorations(
                midLineDecor,
                [new vscode.Range(new vscode.Position(lineNr, 0), new vscode.Position(lineNr, 1))]
            );
            this.allDecorationTypes.push(midLineDecor);
        }

        // Define relevant ranges
        const comment = decorationRange.comment;
        const entireCommentRange = new vscode.Range(
            doc.positionAt(comment.range[0]),
            doc.positionAt(comment.range[1])
        );
        const startDelimiterRange = new vscode.Range(
            entireCommentRange.start,
            doc.positionAt(comment.range[0] + comment.startDelimiter.length)
        );
        const endDelimiterRange = new vscode.Range(
            doc.positionAt(comment.range[1] - comment.endDelimiter.length),
            entireCommentRange.end
        );
        const agumentBlockRange = new vscode.Range(
            doc.positionAt(decorationRange.argumentBlock.range[0]),
            doc.positionAt(decorationRange.argumentBlock.range[1])
        );
        const textRanges = [
            new vscode.Range(startDelimiterRange.end, agumentBlockRange.start),
            new vscode.Range(agumentBlockRange.end, endDelimiterRange.start),
        ];

        // Style relevant comment text
        let keywordDecorationType = vscode.window.createTextEditorDecorationType({
            fontWeight: settings.commentLine.commentFontWeight,
            opacity: "1.0",
            ...(settings.commentLine.largeText && {
                textDecoration: `; 
                    font-size: 170%;
                    vertical-align:middle;
                    z-index: 1;
                    font-family: sans-serif;`
            })
        });
        editor.setDecorations(
            keywordDecorationType,
            textRanges
        );
        this.allDecorationTypes.push(keywordDecorationType);

        // Style rest of the comment text
        let commentDecorationType = vscode.window.createTextEditorDecorationType({
            fontWeight: "normal",
            opacity: settings.commentLine.lineOpacity.toString(),
            ...(settings.commentLine.color && { color: lighterHexColor }),
        });
        editor.setDecorations(
            commentDecorationType,
            [entireCommentRange]
        );
        this.allDecorationTypes.push(commentDecorationType);

    };

}