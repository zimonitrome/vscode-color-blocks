// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommentConfigHandler } from './commentConfigHandler';
import { DecorationRangeHandler } from './decorationRangeHandler';
import commands from './commands';

export const getSettings = () => vscode.workspace.getConfiguration("color-blocks");

// Local variables {#e77,5}
const commentConfigHandler = new CommentConfigHandler();
const decorationRangeHandlers = new Map<string, DecorationRangeHandler>();
let activeEditor: vscode.TextEditor | undefined;
let settings = getSettings();
const skipAutoUpdateDocumentKeys = new Set<string>();

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

const getSelectedLineRanges = (editor: vscode.TextEditor) => {
    const ranges = editor.selections.map(selection => {
        const startLine = Math.min(selection.start.line, selection.end.line);
        let endLine = Math.max(selection.start.line, selection.end.line);

        if (!selection.isEmpty && selection.end.character === 0 && selection.end.line > selection.start.line)
            endLine--;

        return { startLine, endLine };
    }).sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine);

    return ranges.reduce((merged, range) => {
        const previous = merged[merged.length - 1];
        if (previous && range.startLine <= previous.endLine + 1)
            previous.endLine = Math.max(previous.endLine, range.endLine);
        else
            merged.push({ ...range });
        return merged;
    }, [] as { startLine: number; endLine: number }[]);
};

const copyLines = (editor: vscode.TextEditor, editBuilder: vscode.TextEditorEdit, direction: 'up' | 'down') => {
    const doc = editor.document;
    const eol = doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    const lineRanges = getSelectedLineRanges(editor);
    const insertions: { position: vscode.Position; lineCount: number }[] = [];

    for (const lineRange of direction === 'up' ? [...lineRanges].reverse() : lineRanges) {
        const lines = [];
        for (let lineNr = lineRange.startLine; lineNr <= lineRange.endLine; lineNr++)
            lines.push(doc.lineAt(lineNr).text);

        const text = lines.join(eol);
        const lineCount = lineRange.endLine - lineRange.startLine + 1;
        const position = direction === 'up'
            ? new vscode.Position(lineRange.startLine, 0)
            : doc.lineAt(lineRange.endLine).range.end;

        editBuilder.insert(position, direction === 'up' ? `${text}${eol}` : `${eol}${text}`);
        insertions.push({ position, lineCount });
    }

    if (settings.behavior.autoUpdate)
        getDecorationRangeHandler(editor).replaceLineCountsForInsertedLines(editBuilder, doc, insertions);

    skipAutoUpdateDocumentKeys.add(doc.uri.toString());
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

    context.subscriptions.push(vscode.commands.registerTextEditorCommand(
        'color-blocks.copyLinesDown',
        (editor, editBuilder) => copyLines(editor, editBuilder, 'down')
    ));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand(
        'color-blocks.copyLinesUp',
        (editor, editBuilder) => copyLines(editor, editBuilder, 'up')
    ));

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

    // Handle file contents changed {#ff0,17}
    vscode.workspace.onDidChangeTextDocument(event => {
        const changedEditors = vscode.window.visibleTextEditors.filter(editor => editor.document === event.document);
        if (changedEditors.length) {
            const skipAutoUpdate = skipAutoUpdateDocumentKeys.delete(event.document.uri.toString());
            if (!skipAutoUpdate &&
                event.reason !== vscode.TextDocumentChangeReason.Undo &&
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
