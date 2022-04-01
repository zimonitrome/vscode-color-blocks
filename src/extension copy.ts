// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { hexCodeRegex, hexToHsl, hslToHex } from './colorHelpers';
// import { Parser } from './parser';

interface DecorationRange {
    decoration: vscode.DecorationRenderOptions;
    matchRange: vscode.Range;
    startLine: number;
    endLine: number;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    console.log("YO");

    let disposable = vscode.commands.registerCommand('color-block-comments.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Color Block Comments!');
    });

    // let parser = new Parser();
    context.subscriptions.push(disposable);

    let activeEditor: vscode.TextEditor;
    // let parser: Parser = new Parser();

    let decorationRanges: Array<DecorationRange> = [];
    let allDecorationTypes: Array<vscode.TextEditorDecorationType> = [];

    function updateExistingDecorationRanges(event: vscode.TextDocumentChangeEvent) {
        for (const change of event.contentChanges) {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1;
            const diff = linesInserted - linesInRange;

            decorationRanges = decorationRanges.reduce((newRanges: DecorationRange[], decorationRange) => {
                if (endLine < decorationRange.startLine) {
                    // Change range was made entirely before dec range
                    decorationRange.startLine += diff;
                    decorationRange.endLine += diff;
                    newRanges.push(decorationRange);
                    console.log("Case 1");
                }
                else if (change.range.start.isBeforeOrEqual(decorationRange.matchRange.end) && (endLine >= decorationRange.endLine)) {
                    // Change range includes the dec start line (comment)
                    // Remove range (It can be regenerated later if it still exists)
                    console.log(change.range.start, decorationRange.matchRange.end);
                    console.log("Case 2");
                }
                else if (change.range.start.isAfter(decorationRange.matchRange.end) && (startLine <= decorationRange.endLine)) {
                    // Change range starts inside dec range
                    const nLinesBefore = decorationRange.endLine - decorationRange.startLine + 1;
                    decorationRange.endLine += diff;
                    const nLinesAfter = decorationRange.endLine - decorationRange.startLine + 1;
                    newRanges.push(decorationRange);
                    activeEditor.edit((editBuilder: vscode.TextEditorEdit) => {
                        const editRange = new vscode.Range(
                            new vscode.Position(
                                decorationRange.matchRange.start.line,
                                decorationRange.matchRange.start.character + 4
                            ),
                            new vscode.Position(
                                decorationRange.matchRange.start.line,
                                decorationRange.matchRange.start.character + 4 + nLinesBefore.toString().length
                            ));
                        console.log(`editrange: ${editRange}`);
                        editBuilder.replace(editRange, nLinesAfter.toString());
                    });
                    console.log("Case 3");
                }
                else if (startLine > decorationRange.endLine) {
                    // Change range starts entirely after dec range
                    // Do nothing
                    newRanges.push(decorationRange);
                    console.log("Case 4");
                }
                return newRanges;
            }, []);
        }
    }


    function addNewDecorationRanges(event: vscode.TextDocumentChangeEvent | undefined = undefined) {
        if (!activeEditor) return; // Needed?

        let text = activeEditor.document.getText();
        let regEx = new RegExp("cbc\{(.*?)\}", "ig");

        let match: any;
        matchLoop:
        while (match = regEx.exec(text)) {
            // Add new decorationRange if it does not exist
            let matchStartPos = activeEditor.document.positionAt(match.index);
            let startLine = matchStartPos.line;
            let matchEndPos = new vscode.Position(startLine, match.index + match[0].length);
            let matchRange = new vscode.Range(matchStartPos, matchEndPos);

            // Found a prev
            for (let decorationRange of decorationRanges) {
                if (decorationRange.startLine === startLine) {
                    break matchLoop;
                }
            }

            let matchStrings = match[1].split(',');
            let nCommentLines = parseInt(matchStrings[0]);
            let hexColor = matchStrings[1];

            if (!matchStrings || !hexCodeRegex.test(hexColor)) {
                continue;
            }

            let endLine = startLine + (nCommentLines ? nCommentLines - 1 : 0);

            let [h, s, l] = hexToHsl(hexColor);
            l = 70; // Always set lightness to 70%
            hexColor = hslToHex(h, s, l);

            let linesDecorationType = {
                backgroundColor: hexColor + "33",
                overviewRulerColor: hexColor + "33",
                isWholeLine: true,
            };
            decorationRanges.push({
                decoration: linesDecorationType,
                matchRange: matchRange,
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
            const decoration = vscode.window.createTextEditorDecorationType(decorationRange.decoration);
            activeEditor.setDecorations(
                decoration,
                [new vscode.Range(new vscode.Position(decorationRange.startLine, 0), new vscode.Position(decorationRange.endLine, 0))]
            );
            console.log(`Added ${decorationRange.startLine}-${decorationRange.endLine}`);
            allDecorationTypes.push(decoration);
        });

    };

    // Get the active editor for the first time and initialise the regex
    if (vscode.window.activeTextEditor) {
        activeEditor = vscode.window.activeTextEditor;
        triggerUpdateDecorations();
    }

    // * Handle active file changed
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            activeEditor = editor;
            decorationRanges = [];
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    // * Handle file contents changed
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            updateExistingDecorationRanges(event);
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    // * IMPORTANT:
    // To avoid calling update too often,
    // set a timer for 200ms to wait before updating decorations
    var timeout: NodeJS.Timer;
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            addNewDecorationRanges();
            redrawDecorationRanges();
        }, 200);
    }
}

// this method is called when your extension is deactivated
export function deactivate() { }
