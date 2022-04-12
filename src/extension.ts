// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { hexCodeRegex, hexToHsl, hslToHex } from './colorHelpers';
import { CommentConfigHandler } from './commentConfigHandler';
import { getIndention } from './documentHelpers';
import { styleRange } from './styleRange';

// TODO: Move to separate file
interface DecorationRange {
    hexColor: string;
    matchRange: vscode.Range;
    matchTextCommentRange: vscode.Range;
    matchLineArgRange: vscode.Range;
    startLine: number;
    endLine: number;
}

// Helpers. Move? {#88f,3}
const escapeRegex = (string: string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
const getSettings = () => vscode.workspace.getConfiguration("color-blocks");

// Local variables {#e77,10}
let decorationRanges: Array<DecorationRange> = [];
let allDecorationTypes: Array<vscode.TextEditorDecorationType> = [];

const commentConfigHandler = new CommentConfigHandler();
let commentDelimiter = "";

let activeEditor: vscode.TextEditor;

let settings = getSettings();

// {#88f,31} TODO: Move?
const updateExistingDecorationRanges = (contentChanges: readonly vscode.TextDocumentContentChangeEvent[]) => {
    // If the user makes a change inside a decoration that results in a change of # of lines,
    // update the number listed inside the cbc braces.
    for (const change of contentChanges) {
        // Get difference in lines {#3a3,10}
        const startLine = change.range.start.line;
        const endLine = change.range.end.line;
        const linesInRange = endLine - startLine;
        const linesInserted = change.text.split("\n").length - 1;
        const diff = linesInserted - linesInRange;

        if (diff === 0) {
            continue;
        }

        // Make edits {#838,13}
        activeEditor.edit((editBuilder: vscode.TextEditorEdit) => {
            decorationRanges.forEach((decorationRange) => {
                if (change.range.start.isAfterOrEqual(decorationRange.matchRange.end) && (change.range.start.line <= decorationRange.endLine)) {
                    // Change range starts inside dec range
                    const nLinesBeforeEdit = decorationRange.endLine - decorationRange.startLine + 1;
                    decorationRange.endLine += diff;
                    const nLinesAfter = decorationRange.endLine - decorationRange.startLine + 1;
                    const editRange = decorationRange.matchLineArgRange;
                    editBuilder.replace(editRange, nLinesAfter.toString());
                }
            });
        }, { undoStopBefore: false, undoStopAfter: false });
    }
};

// Scan document for color blockS {#88f,64} TODO: Move?
const addNewDecorationRanges = (event: vscode.TextDocumentChangeEvent | undefined = undefined) => {
    if (!activeEditor) return; // Needed?
    if (!commentDelimiter) return;

    let text = activeEditor.document.getText();
    let regEx = new RegExp(String.raw`${escapeRegex(commentDelimiter)}(.*){(.*?)}`, "ig");

    let match: any;
    matchLoop:
    while (match = regEx.exec(text)) {
        // Add new decorationRange if it does not exist {#beb, 5}
        let matchStartPos = activeEditor.document.positionAt(match.index);
        let startLine = matchStartPos.line;
        let matchEndPos = new vscode.Position(startLine, matchStartPos.character + match[0].length);
        let matchRange = new vscode.Range(matchStartPos, matchEndPos);

        // Found a previously defined range {#beb, 6}
        for (let decorationRange of decorationRanges) {
            if (decorationRange.startLine === startLine) {
                continue matchLoop;
            }
        }

        // Extract relevant information from match {#beb, 13}
        const matchTextComment: string = match[1];
        let values = match[2].split(',').map((keyValuePair: string) => keyValuePair.split(':').at(-1)!.replace(/ /g, ''));
        if (values.length !== 2) continue; // Hard coded to accept 2 values for now
        let [hexColor, nCommentLines] = values;
        nCommentLines = parseInt(nCommentLines);

        if (!nCommentLines || !hexCodeRegex.test(hexColor)) continue;

        let [h, s, l] = hexToHsl(hexColor);
        if (settings.standardizeColorBrightness.enabled)
            l = settings.standardizeColorBrightness.background;
        hexColor = hslToHex(h, s, l);

        // Save relevant ranges {#beb, 23}
        let endLine = startLine + (nCommentLines ? nCommentLines - 1 : 0);

        let matchTextCommentRange = new vscode.Range(
            new vscode.Position(startLine, matchStartPos.character + commentDelimiter.length),
            new vscode.Position(startLine, matchStartPos.character + commentDelimiter.length + matchTextComment.length)
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
};

// {#88f,10} TODO: Move?
const redrawDecorationRanges = () => {
    // Clear all decoration types
    allDecorationTypes.forEach(dt => dt.dispose());

    // Color all range lines
    decorationRanges.forEach(decorationRange => {
        styleRange(decorationRange, activeEditor, allDecorationTypes, settings);
    });
};

const editorChange = (editor: vscode.TextEditor | undefined) => {
    if (editor) {
        // Update active editor
        activeEditor = editor;

        // Update comment delimiter
        let commentConfig = commentConfigHandler.getCommentConfig(activeEditor.document.languageId);
        commentDelimiter = commentConfig?.lineComment ?? "";

        triggerUpdateDecorations();
    }
};

// {#88f,16}
// * IMPORTANT:
// * To avoid calling update too often,
// * set a timer for 100ms to wait before drawing
// Copied from: https://github.com/aaron-bond/better-comments/blob/master/src/extension.ts
let timeout: NodeJS.Timer;
const triggerUpdateDecorations = () => {
    if (timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(async () => {
        decorationRanges = [];
        addNewDecorationRanges();
        redrawDecorationRanges(); // This one takes a long time
    }, 100);
};


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    settings = getSettings();

    // Get the active editor for the first time and initialize
    editorChange(vscode.window.activeTextEditor);

    // Add command {#aca,22}
    context.subscriptions.push(vscode.commands.registerCommand("color-blocks.add", () => {
        let tabSize: number = vscode.workspace.getConfiguration("editor").get("tabSize")!;
        let insertMap: Array<number> = []; // Used to track line offsets for multiple selections
        for (let selection of activeEditor.selections) {
            let firstLine = Math.min(selection.end.line, selection.start.line);

            for (let line of insertMap)
                if (firstLine >= line) firstLine += 1;
            insertMap.push(firstLine);

            const nCommentLines = Math.abs(selection.end.line - selection.start.line + 2);
            let firstLineText = activeEditor.document.lineAt(firstLine).text;
            let indention = getIndention(firstLineText, tabSize);
            // Currently no supported way to call existing snippets easily and add custom args?
            activeEditor.insertSnippet(
                new vscode.SnippetString("$LINE_COMMENT ${1} {#${2:${RANDOM_HEX/(.).?(.).?(.).?/$1$2$3/}}," + nCommentLines.toString() + "}\n"),
                new vscode.Position(firstLine, indention),
                { undoStopBefore: false, undoStopAfter: false }
            );
        }
    }));

    // Handle active file changed {#ff0,2}
    vscode.window.onDidChangeActiveTextEditor(editorChange);

    // Handle file contents changed {#ff0,13}
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
    });

    // Handle active file changed {#ff0,5}
    vscode.workspace.onDidChangeConfiguration(event => {
        settings = getSettings();
        triggerUpdateDecorations();
    });
}

// this method is called when your extension is deactivated
export function deactivate() { }
