// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { hexCodeRegex, hexToHsl, hslToHex } from './colorHelpers';
import { CommentConfigHandler } from './commentConfigHandler';
import { styleRange } from './styleRange';

interface DecorationRange {
    hexColor: string;
    matchRange: vscode.Range;
    matchTextCommentRange: vscode.Range;
    matchLineArgRange: vscode.Range;
    startLine: number;
    endLine: number;
}

const getSettings = () => vscode.workspace.getConfiguration("Color Block Comments");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let activeEditor: vscode.TextEditor;

    let disposable = vscode.commands.registerCommand('color-block-comments.makeComment', () => {
        // Currently no supported way to call existing snippets easily and add custom args?
        const firstLine = Math.min(activeEditor.selection.end.line, activeEditor.selection.start.line);
        const commenLines = Math.abs(activeEditor.selection.end.line - activeEditor.selection.start.line + 2);
        activeEditor.insertSnippet(
            new vscode.SnippetString("$LINE_COMMENT ${1} {#${2:$RANDOM_HEX}," + commenLines.toString() + "}\n"),
            new vscode.Position(firstLine, 0)
        );
    });
    context.subscriptions.push(disposable);

    let decorationRanges: Array<DecorationRange> = [];
    let allDecorationTypes: Array<vscode.TextEditorDecorationType> = [];

    const commentConfigHandler = new CommentConfigHandler();
    let commentDelimmiter = "";

    let settings = getSettings();

    function updateCommentDelimmiter() {
        let commentConfig = commentConfigHandler.getCommentConfig(activeEditor.document.languageId);
        commentDelimmiter = commentConfig?.lineComment ?? "";
    }

    function escapeRegex(string: string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    function updateExistingDecorationRanges(contentChanges: readonly vscode.TextDocumentContentChangeEvent[]) {
        // If the user makes a change inside a decoration that results in a change of # of lines,
        // update the number listed inside the cbc braces.
        for (const change of contentChanges) {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1;
            const diff = linesInserted - linesInRange;

            if (diff === 0) {
                continue;
            }

            decorationRanges.forEach((decorationRange) => {

                if (change.range.start.isAfterOrEqual(decorationRange.matchRange.end) && (change.range.start.line <= decorationRange.endLine)) {
                    // Change range starts inside dec range
                    const nLinesBeforeEdit = decorationRange.endLine - decorationRange.startLine + 1;
                    decorationRange.endLine += diff;
                    const nLinesAfter = decorationRange.endLine - decorationRange.startLine + 1;
                    activeEditor.edit((editBuilder: vscode.TextEditorEdit) => {
                        const editRange = decorationRange.matchLineArgRange;
                        editBuilder.replace(editRange, nLinesAfter.toString());
                    }, { undoStopBefore: false, undoStopAfter: false });
                }
            });
        }
    }

    // Scan document for color block comments
    function addNewDecorationRanges(event: vscode.TextDocumentChangeEvent | undefined = undefined) {
        if (!activeEditor) return; // Needed?
        if (!commentDelimmiter) return;

        let text = activeEditor.document.getText();
        let regEx = new RegExp(String.raw`${escapeRegex(commentDelimmiter)}(.*){(.*?)}`, "ig");

        let match: any;
        matchLoop:
        while (match = regEx.exec(text)) {
            // Add new decorationRange if it does not exist
            let matchStartPos = activeEditor.document.positionAt(match.index);
            let startLine = matchStartPos.line;
            let matchEndPos = new vscode.Position(startLine, matchStartPos.character + match[0].length);
            let matchRange = new vscode.Range(matchStartPos, matchEndPos);

            // Found a previously defined range
            for (let decorationRange of decorationRanges) {
                if (decorationRange.startLine === startLine) {
                    continue matchLoop;
                }
            }

            // Extract relevant information from match
            const matchTextComment: string = match[1];
            let values = match[2].split(',').map((keyvalue: string) => keyvalue.split(':').at(-1).replace(/ /g, ''));
            if (values.length !== 2) continue; // Hard coded to accept 2 values for now
            let [hexColor, nCommentLines] = values;
            nCommentLines = parseInt(nCommentLines);

            if (!nCommentLines || !hexCodeRegex.test(hexColor)) continue;

            let [h, s, l] = hexToHsl(hexColor);
            if (settings.standardizeColorBrightness.enabled)
                l = settings.standardizeColorBrightness.background;
            hexColor = hslToHex(h, s, l);

            // Save relevant ranges
            let endLine = startLine + (nCommentLines ? nCommentLines - 1 : 0);

            let matchTextCommentRange = new vscode.Range(
                new vscode.Position(startLine, matchStartPos.character + commentDelimmiter.length),
                new vscode.Position(startLine, matchStartPos.character + commentDelimmiter.length + matchTextComment.length)
            );

            let linesArgOffset = /(?<=[\s,:])\d+/.exec(match[2])!.index + 1; // +1 for '{' in above match

            let matchLineArgRange = new vscode.Range(
                // matchTextCommentRange.end,
                new vscode.Position(startLine, matchTextCommentRange.end.character + linesArgOffset),
                new vscode.Position(startLine, matchTextCommentRange.end.character + linesArgOffset + nCommentLines.toString().length),
            );

            decorationRanges.push({
                hexColor: hexColor,
                matchRange: matchRange,
                matchTextCommentRange: matchTextCommentRange,
                matchLineArgRange: matchLineArgRange,
                startLine: startLine,
                endLine: endLine,
            });
        }
    }

    function redrawDecorationRanges() {
        // Clear all decoration types
        allDecorationTypes.forEach(dt => dt.dispose());

        // Color all range lines
        decorationRanges.forEach(decorationRange => {
            styleRange(decorationRange, activeEditor, allDecorationTypes, settings);
        });

    };

    vscode.workspace.onDidChangeConfiguration(event => {
        settings = getSettings();
        triggerUpdateDecorations();
    });

    // Get the active editor for the first time and initialise the regex
    if (vscode.window.activeTextEditor) {
        activeEditor = vscode.window.activeTextEditor;
        updateCommentDelimmiter();
        triggerUpdateDecorations();
    }

    // Handle active file changed
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            activeEditor = editor;
            updateCommentDelimmiter();
            decorationRanges = [];
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    // Handle file contents changed
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            if (event.reason !== vscode.TextDocumentChangeReason.Undo &&
                event.reason !== vscode.TextDocumentChangeReason.Redo) {
                // Event was not caused by an undo/redo
                // Manually update existing decoration text
                if (settings.behavior.autoUpdate)
                    updateExistingDecorationRanges(event.contentChanges);
            }
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    function triggerUpdateDecorations() {
        decorationRanges = [];
        addNewDecorationRanges();
        redrawDecorationRanges();
    }
}

// this method is called when your extension is deactivated
export function deactivate() { }
