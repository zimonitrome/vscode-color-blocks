// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommentConfigHandler } from './commentConfigHandler';
import { DecorationRangeHandler } from './decorationRangeHandler';
import commands from './commands';

export const getSettings = () => vscode.workspace.getConfiguration("color-blocks");

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

/* 
* IMPORTANT:
* To avoid calling update too often,
* this function implements a "leading-edge debounce"
* with a configurable delay via the settings.
Copied from: https://github.com/aaron-bond/better-comments/blob/master/src/extension.ts
{#88f,18}
*/
let timeout: NodeJS.Timer | undefined;
const triggerUpdateDecorations = () => {
    let delay: number = 20; // ms
    
    if (timeout) {
        clearTimeout(timeout);
        delay = settings.behavior.debounceInterval; // ms
    }
    timeout = setTimeout(async () => {
        decorationRangeHandler.decorationRanges = [];
        if (settings.behavior.enabled) {
            const comments = commentConfigHandler.getComments(activeEditor.document);
            decorationRangeHandler.addNewDecorationRanges(activeEditor, comments);
        }
        decorationRangeHandler.redrawDecorationRanges(activeEditor, settings); // This one takes a long time
        timeout = undefined;
    }, delay );
};


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    settings = getSettings();

    // Get the active editor for the first time and initialize
    editorChange(vscode.window.activeTextEditor);

    // Define all commands {#aca}
    for (const command of commands)
        context.subscriptions.push(command);

    // Handle active file changed {#ff0}
    vscode.window.onDidChangeActiveTextEditor(editorChange);

    // Handle file contents changed {#ff0,12}
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

    // Handle active file changed {#ff0,4}
    vscode.workspace.onDidChangeConfiguration(event => {
        settings = getSettings();
        triggerUpdateDecorations();
    });
}

// this method is called when your extension is deactivated
export function deactivate() { }
