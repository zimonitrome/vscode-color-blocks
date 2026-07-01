import * as vscode from 'vscode';
import { hexToHsl, hslToHex, decimalToHexString } from './helpers/colorHelpers';
import { colorBlockRegex, getColorBlockRanges } from './helpers/colorBlockRegex';
import { arrAdd, getIndention, getVisualWidth } from './helpers/miscHelpers';
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
const isLightTheme = () => (
    vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ||
    vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrastLight
);

export class DecorationRangeHandler {

    public decorationRanges: Array<DecorationRange> = [];
    private decorationTypeCache = new Map<string, vscode.TextEditorDecorationType>();
    private activeDecorationKeys = new Set<string>();
    private pendingDecorations = new Map<string, vscode.Range[]>();

    private queueDecorations(
        key: string,
        options: vscode.DecorationRenderOptions,
        ranges: vscode.Range[],
    ) {
        if (!this.decorationTypeCache.has(key))
            this.decorationTypeCache.set(key, vscode.window.createTextEditorDecorationType(options));

        this.pendingDecorations.set(key, [
            ...(this.pendingDecorations.get(key) ?? []),
            ...ranges
        ]);
    }

    private flushDecorations(editor: vscode.TextEditor) {
        const nextDecorationKeys = new Set(this.pendingDecorations.keys());

        for (const key of this.activeDecorationKeys) {
            if (!nextDecorationKeys.has(key))
                editor.setDecorations(this.decorationTypeCache.get(key)!, []);
        }

        for (const [key, ranges] of this.pendingDecorations)
            editor.setDecorations(this.decorationTypeCache.get(key)!, ranges);

        this.activeDecorationKeys = nextDecorationKeys;
        this.pendingDecorations = new Map();
    }

    public dispose() {
        this.decorationTypeCache.forEach(dt => dt.dispose());
        this.decorationTypeCache.clear();
        this.activeDecorationKeys.clear();
        this.pendingDecorations.clear();
        this.decorationRanges = [];
    }

    // {#88f,8}
    public redrawDecorationRanges(activeEditor: vscode.TextEditor, settings: vscode.WorkspaceConfiguration) {
        this.pendingDecorations = new Map();

        // Color all range lines
        this.decorationRanges.forEach(decorationRange => {
            this.styleRange(decorationRange, activeEditor, settings);
        });
        this.flushDecorations(activeEditor);
    };

    private async makeReplaceEdit(editor: vscode.TextEditor, range: vscode.Range, text: string) {
        const currentText = editor.document.getText(range);
        if (currentText === text || !/^\d+$/.test(currentText)) return;

        await editor.edit(editBuilder => {
            editBuilder.replace(
                range,
                text
            );
        }, { undoStopBefore: false, undoStopAfter: false });
    };

    public replaceLineCountsForInsertedLines(
        editBuilder: vscode.TextEditorEdit,
        doc: vscode.TextDocument,
        insertions: readonly { position: vscode.Position; lineCount: number }[],
    ) {
        const lineCountDiffs = new Map<DecorationRange, number>();

        for (const insertion of insertions) {
            for (const decorationRange of this.decorationRanges) {
                if (!decorationRange.nLines) continue;

                const validChangeRange = new vscode.Range(
                    doc.lineAt(decorationRange.codeStartLine-1).range.end,
                    doc.lineAt(safeGetLineNr(decorationRange.endLine, doc)).range.end,
                );

                if (validChangeRange.contains(insertion.position))
                    lineCountDiffs.set(
                        decorationRange,
                        (lineCountDiffs.get(decorationRange) ?? 0) + insertion.lineCount
                    );
            }
        }

        for (const [decorationRange, diff] of lineCountDiffs) {
            const editRange = doc.getWordRangeAtPosition(doc.positionAt(decorationRange.nLines!.range[0]));
            if (!editRange) continue;

            const currentText = doc.getText(editRange);
            if (!/^\d+$/.test(currentText)) continue;

            editBuilder.replace(editRange, (parseInt(currentText) + diff).toString());
        }
    }

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
                    if (diff === 0) continue;

                    decorationRange.endLine = safeGetLineNr(decorationRange.endLine + diff, doc);
                    const nLinesNew = decorationRange.endLine - decorationRange.codeStartLine + 1;
                    const editRange = doc.getWordRangeAtPosition(doc.positionAt(decorationRange.nLines.range[0]));
                    // ^^ NOTE: This works so much better than using the range in "decorationRange".
                    //          Maybe we don't need to store all those ranges?

                    if (!editRange) continue;

                    // Make edits {#838}
                    this.makeReplaceEdit(activeEditor, editRange, nLinesNew.toString());
                
                }
            }
        }
    };

    // Scan document for color blockS {#88f,68}
    public addNewDecorationRanges(activeEditor: vscode.TextEditor, comments: Comment[]) {
        if (!activeEditor) return; // Needed?
        const doc = activeEditor.document;

        if (comments.length === 0) return;

        for (const comment of comments) {
            // Extract arguments for this comment
            const match = colorBlockRegex.exec(comment.content);

            if (!match)
                continue;

            const matchRanges = getColorBlockRanges(match);

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
                    range: arrAdd(matchRanges.lines!, matchOffset) as [number, number]
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
                    range: arrAdd(matchRanges.whole, matchOffset) as [number, number]
                },
                hexColor: {
                    content: colorHex,
                    range: arrAdd(matchRanges.color, matchOffset) as [number, number]
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
            l = isLightTheme()
                ? settings.standardizeColorBrightness.commentTextLight
                : settings.standardizeColorBrightness.commentText;
        let commentHexColor = hslToHex(h, s, l);

        let left!: string;
        let customWidth!: string;

        const endLine = safeGetLineNr(decorationRange.endLine, doc);

        // Calculate minimum width if wrapping is enabled
        if (settings.wrapText.enabled) {
            let shortestIndentation = Infinity;
            let longestLineWidth = 0;
            // Use the editor's effective tab size (respects detectIndentation and
            // per-language overrides) rather than the global editor.tabSize setting.
            let tabSize = Number(editor.options.tabSize) || 4;
            for (let lineNr = decorationRange.commentStartLine; lineNr <= endLine; lineNr++) {
                let line = doc.lineAt(lineNr);

                if (line.isEmptyOrWhitespace) continue; // If line is empty, skip

                let indentation = getIndention(line.text, tabSize);

                shortestIndentation = Math.min(shortestIndentation, indentation);
                // Measure the line in visual columns (tabs expanded) so the right
                // edge lines up with the left edge, which is also a visual column.
                longestLineWidth = Math.max(longestLineWidth, getVisualWidth(line.text, tabSize));
            }

            if (shortestIndentation === Infinity)
                shortestIndentation = 0;

            const paddingLeft = settings.wrapText.paddingLeft ?? 1;
            left = `${Math.max(0, shortestIndentation - paddingLeft)}ch`;
            customWidth = `${Math.max(0, longestLineWidth - shortestIndentation) + paddingLeft + settings.wrapText.paddingRight}ch`;
        }
        else {
            // Otherwise, stretch to the entire width of the editor minus the scrollbar
            left = `0`;
            // const scrollbarSize = vscode.workspace.getConfiguration('editor').scrollbar.verticalScrollbarSize;
            // customWidth = `calc(100% - ${scrollbarSize}px)`; // currently doesn't work :(
            customWidth = `999999px`; // HACK
        }

        const scrollbarOpacity = settings.scrollbar.opacity ?? settings.background.opacity;
        let backgroundHexColor = hexColor + decimalToHexString(255 * settings.background.opacity);
        let scrollbarHexColor = hexColor + decimalToHexString(255 * scrollbarOpacity);
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
        const blockLineRanges: Record<string, vscode.Range[]> = {
            top: [],
            middle: [],
            bottom: [],
            single: [],
        };

        for (let lineNr = decorationRange.commentStartLine; lineNr <= endLine; lineNr++) {
            const isTopLine = lineNr === decorationRange.commentStartLine;
            const isBottomLine = lineNr === endLine;
            const key = isTopLine && isBottomLine
                ? 'single'
                : isTopLine
                    ? 'top'
                    : isBottomLine
                        ? 'bottom'
                        : 'middle';

            blockLineRanges[key].push(new vscode.Range(new vscode.Position(lineNr, 0), new vscode.Position(lineNr, 0)));
        }

        for (const [key, ranges] of Object.entries(blockLineRanges)) {
            if (!ranges.length) continue;

            const isTopLine = key === 'top' || key === 'single';
            const isBottomLine = key === 'bottom' || key === 'single';
            const topRadius = isTopLine ? settings.border.radius : 0;
            const bottomRadius = isBottomLine ? settings.border.radius : 0;
            const topWidth = isTopLine ? settings.border.width : 0;
            const bottomWidth = isBottomLine ? settings.border.width : 0;

            const lineDecorationOptions = {
                // VS Code's public extension API exposes overview ruler decorations,
                // but not minimap decorations as of yet. See TODO.md and https://github.com/microsoft/vscode/issues/82808
                overviewRulerColor: scrollbarHexColor,
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
            };
            this.queueDecorations(
                [
                    'block-line',
                    backgroundHexColor,
                    scrollbarHexColor,
                    borderHexColor,
                    settings.border.style,
                    settings.border.width,
                    settings.border.radius,
                    key,
                    left,
                    customWidth,
                    settings.wrapText.paddingLeft ?? 1,
                ].join('|'),
                lineDecorationOptions,
                ranges
            );
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
        const keywordDecorationOptions = {
            fontWeight: settings.commentLine.commentFontWeight,
            opacity: "1.0",
            ...(settings.commentLine.largeText && {
                textDecoration: `; 
                    font-size: 170%;
                    vertical-align:middle;
                    z-index: 1;
                    font-family: sans-serif;`
            })
        };
        this.queueDecorations(
            [
                'comment-keyword',
                settings.commentLine.commentFontWeight,
                settings.commentLine.largeText,
            ].join('|'),
            keywordDecorationOptions,
            textRanges
        );

        // Style rest of the comment text
        const commentDecorationOptions = {
            fontWeight: "normal",
            opacity: settings.commentLine.lineOpacity.toString(),
            ...(settings.commentLine.color && { color: commentHexColor }),
        };
        this.queueDecorations(
            [
                'comment-line',
                settings.commentLine.lineOpacity,
                settings.commentLine.color ? commentHexColor : '',
            ].join('|'),
            commentDecorationOptions,
            [entireCommentRange]
        );

    };

}
