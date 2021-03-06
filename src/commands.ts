import * as vscode from 'vscode';
import { getSettings } from './extension';
import { getIndention } from './helpers/miscHelpers';

const commands = [
    
    // Command for adding color comments {#454,24}
    vscode.commands.registerCommand("color-blocks.add", () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) return;

        let tabSize: number = vscode.workspace.getConfiguration("editor").get("tabSize")!;
        let insertMap: Array<number> = []; // Used to track line offsets for multiple selections
        for (let selection of activeEditor.selections) {
            let firstLine = Math.min(selection.end.line, selection.start.line);

            for (let line of insertMap)
                if (firstLine >= line) firstLine += 1;
            insertMap.push(firstLine);

            const nCommentLines = Math.abs(selection.end.line - selection.start.line + 1);
            let firstLineText = activeEditor.document.lineAt(firstLine).text;
            let indention = getIndention(firstLineText, tabSize);
            // Currently no supported way to call existing snippets easily and add custom args?
            activeEditor.insertSnippet(
                new vscode.SnippetString("$LINE_COMMENT ${1} {#${2:${RANDOM_HEX/(.).?(.).?(.).?/$1$2$3/}}," + nCommentLines.toString() + "}\n"),
                new vscode.Position(firstLine, indention),
                { undoStopBefore: false, undoStopAfter: false }
            );
        }
    }),

    // Command for showing or hiding color blocks {#454,4}
    vscode.commands.registerCommand("color-blocks.toggle", () => {
        const settings = getSettings();
        settings.update("behavior.enabled", !settings.behavior.enabled);
    })

];

export default commands;