// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommentConfigHandler } from './commentConfigHandler';
import { DecorationRangeHandler } from './decorationRangeHandler';
import commands from './commands';

export const getSettings = () => vscode.workspace.getConfiguration("color-blocks");

// Local variables {#e77,4}
const commentConfigHandler = new CommentConfigHandler();
const decorationRangeHandlers = new Map<string, DecorationRangeHandler>();
let activeEditor: vscode.TextEditor | undefined;
let settings = getSettings();

const getEditorKey = (editor: vscode.TextEditor) => `${editor.document.uri.toString()}:${editor.viewColumn ?? 0}`;

const getDecorationRangeHandler = (editor: vscode.TextEditor) => {
    const key = getEditorKey(editor);
    let handler = decorationRangeHandlers.get(key);
    if (!handler) {
        handler = new DecorationRangeHandler();
        decorationRangeHandlers.set(key, handler);
    }
    return handler;
};

const disposeHiddenEditors = () => {
    const visibleEditorKeys = new Set(vscode.window.visibleTextEditors.map(getEditorKey));
    for (const [key, handler] of decorationRangeHandlers) {
        if (!visibleEditorKeys.has(key)) {
            handler.dispose();
            decorationRangeHandlers.delete(key);
        }
    }
};

const editorChange = (editor: vscode.TextEditor | undefined) => {
    if (editor) {
        // Update active editor
        activeEditor = editor;
    }
};

/* 
* IMPORTANT:
* To avoid calling update too often,
* this function implements a "leading-edge debounce"
* with a configurable delay via the settings.
Copied from: https://github.com/aaron-bond/better-comments/blob/master/src/extension.ts
{#88f,30}
*/
let timeout: NodeJS.Timer | undefined;
let pendingEditors = new Map<string, vscode.TextEditor>();
const triggerUpdateDecorations = (editors = vscode.window.visibleTextEditors) => {
    for (const editor of editors)
        pendingEditors.set(getEditorKey(editor), editor);

    let delay: number = 20; // ms
    
    if (timeout) {
        clearTimeout(timeout);
        delay = settings.behavior.debounceInterval; // ms
    }
    timeout = setTimeout(async () => {
        disposeHiddenEditors();
        const visibleEditorKeys = new Set(vscode.window.visibleTextEditors.map(getEditorKey));
        const editorsToUpdate = [...pendingEditors.values()].filter(editor => visibleEditorKeys.has(getEditorKey(editor)));
        pendingEditors = new Map();
        for (const editor of editorsToUpdate) {
            const decorationRangeHandler = getDecorationRangeHandler(editor);
            decorationRangeHandler.decorationRanges = [];
            if (settings.behavior.enabled) {
                commentConfigHandler.updateCurrentConfig(editor.document.languageId);
                const comments = commentConfigHandler.getComments(editor.document);
                decorationRangeHandler.addNewDecorationRanges(editor, comments);
            }
            decorationRangeHandler.redrawDecorationRanges(editor, settings); // This one takes a long time
        }
        timeout = undefined;
    }, delay );
};


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    settings = getSettings();

    // Get the active editor for the first time and initialize
    editorChange(vscode.window.activeTextEditor);
    triggerUpdateDecorations();

    // Define all commands {#aca}
    for (const command of commands)
        context.subscriptions.push(command);

    // Handle active file changed {#ff0}
    vscode.window.onDidChangeActiveTextEditor(editor => {
        editorChange(editor);
        triggerUpdateDecorations();
    });

    // Handle visible editors changed {#ff0}
    vscode.window.onDidChangeVisibleTextEditors(editors => {
        disposeHiddenEditors();
        triggerUpdateDecorations(editors);
    });

    // Handle file contents changed {#ff0,14}
    vscode.workspace.onDidChangeTextDocument(event => {
        const changedEditors = vscode.window.visibleTextEditors.filter(editor => editor.document === event.document);
        if (changedEditors.length) {
            if (event.reason !== vscode.TextDocumentChangeReason.Undo &&
                event.reason !== vscode.TextDocumentChangeReason.Redo) {
                // Event was not caused by an undo/redo
                // Manually update existing decoration text
                if (settings.behavior.autoUpdate) {
                    const editorForUpdate = changedEditors.find(editor => editor === activeEditor) ?? changedEditors[0];
                    getDecorationRangeHandler(editorForUpdate).updateExistingDecorationRanges(editorForUpdate, event.contentChanges);
                }
            }
            triggerUpdateDecorations(changedEditors);
        }
    });

    // Handle active file changed {#ff0,4}
    vscode.workspace.onDidChangeConfiguration(event => {
        settings = getSettings();
        triggerUpdateDecorations();
    });

    vscode.window.onDidChangeActiveColorTheme(event => {
        triggerUpdateDecorations();
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
    for (const handler of decorationRangeHandlers.values())
        handler.dispose();
    decorationRangeHandlers.clear();
}
