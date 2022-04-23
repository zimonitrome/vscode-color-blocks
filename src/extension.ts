// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { colorBlockRegex } from './colorBlockRegex';
import { CommentConfigHandler } from './commentConfigHandler';
import { getIndention } from './documentHelpers';
import { arrAdd } from './miscHelpers';
import { styleRange } from './styleRange';

const getSettings = () => vscode.workspace.getConfiguration("color-blocks");

// Local variables {#e77,9}
let decorationRanges: Array<DecorationRange> = [];
let allDecorationTypes: Array<vscode.TextEditorDecorationType> = [];

const commentConfigHandler = new CommentConfigHandler();

let activeEditor: vscode.TextEditor;

let settings = getSettings();

// {#88f,31} TODO: Move?
const updateExistingDecorationRanges = (contentChanges: readonly vscode.TextDocumentContentChangeEvent[]) => {
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
            decorationRanges.forEach((decorationRange) => {
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
const addNewDecorationRanges = () => {
    if (!activeEditor) return; // Needed?
    const doc = activeEditor.document;

    const comments = commentConfigHandler.getComments(doc);
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

        decorationRanges.push({
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
        commentConfigHandler.updateCurrentConfig(activeEditor.document.languageId);

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
