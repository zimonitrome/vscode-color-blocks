// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommentConfigHandler } from './commentConfigHandler';
import { getIndention } from './helpers/miscHelpers';
import { DecorationRangeHandler } from './decorationRangeHandler';

const getSettings = () => vscode.workspace.getConfiguration("color-blocks");

// Local variables {#e77,4}
const commentConfigHandler = new CommentConfigHandler();
const decorationRangeHandler = new DecorationRangeHandler();
let activeEditor: vscode.TextEditor;
let settings = getSettings();

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
        const comments = commentConfigHandler.getComments(activeEditor.document);
        decorationRangeHandler.decorationRanges = [];
        decorationRangeHandler.addNewDecorationRanges(activeEditor, comments);
        decorationRangeHandler.redrawDecorationRanges(activeEditor, settings); // This one takes a long time
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
                    decorationRangeHandler.updateExistingDecorationRanges(activeEditor, event.contentChanges);
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
