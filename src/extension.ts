// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { hexCodeRegex, hexToHsl, hslToHex } from './colorHelpers';
import { CommentConfigHandler } from './commentConfigHandler';

// import { Parser } from './parser';

interface DecorationRange {
    hexColor: string;
    matchTextCommentRange: vscode.Range;
    matchCbcArgsRange: vscode.Range;
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

    const commentConfigHandler = new CommentConfigHandler();
    let commentDelimmiter = "";

    function updateCommentDelimmiter() {
        let commentConfig = commentConfigHandler.getCommentConfig(activeEditor.document.languageId);
        commentDelimmiter = commentConfig?.lineComment ?? "";
    }

    function escapeRegex(string: string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    function updateExistingDecorationRanges(contentChanges: readonly vscode.TextDocumentContentChangeEvent[]) {
        // let itemsUpdated = 0;
        // If the user makes a change inside a decoration that results in a change of # of lines,
        // update the number listed inside the cbc braces.
        for (const change of contentChanges) {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1;
            const diff = linesInserted - linesInRange;

            if (diff === 0) {
                // itemsUpdated++;
                continue;
            }

            decorationRanges.forEach((decorationRange) => {
                if (change.range.start.isAfterOrEqual(decorationRange.matchCbcArgsRange.end) && (change.range.start.line <= decorationRange.endLine)) {
                    // Change range starts inside dec range
                    const nLinesBefore = decorationRange.endLine - decorationRange.startLine + 1;
                    decorationRange.endLine += diff;
                    const nLinesAfter = decorationRange.endLine - decorationRange.startLine + 1;
                    console.log(nLinesBefore, nLinesAfter);
                    activeEditor.edit((editBuilder: vscode.TextEditorEdit) => {
                        const editRange = new vscode.Range(
                            new vscode.Position(
                                decorationRange.matchCbcArgsRange.start.line,
                                decorationRange.matchCbcArgsRange.start.character + 4
                            ),
                            new vscode.Position(
                                decorationRange.matchCbcArgsRange.start.line,
                                decorationRange.matchCbcArgsRange.start.character + 4 + nLinesBefore.toString().length
                            ));
                        editBuilder.replace(editRange, nLinesAfter.toString());
                    });
                }
            });
        }
        // if (itemsUpdated === 0)
        //     return false;
        // return true;
    }


    function addNewDecorationRanges(event: vscode.TextDocumentChangeEvent | undefined = undefined) {
        if (!activeEditor) return; // Needed?

        let text = activeEditor.document.getText();
        let regEx = new RegExp(`${escapeRegex(commentDelimmiter)}(.*?)cbc\{(.*?)\}`, "ig");

        let match: any;
        matchLoop:
        while (match = regEx.exec(text)) {
            // Add new decorationRange if it does not exist
            let matchStartPos = activeEditor.document.positionAt(match.index);
            let startLine = matchStartPos.line;
            let matchEndPos = new vscode.Position(startLine, matchStartPos.character + match[0].length);
            let matchRange = new vscode.Range(matchStartPos, matchEndPos);

            // Found a prev
            for (let decorationRange of decorationRanges) {
                if (decorationRange.startLine === startLine) {
                    break matchLoop;
                }
            }

            let matchTextComment: string = match[1];

            let matchCbcArgs = match[2].split(',');
            let nCommentLines = parseInt(matchCbcArgs[0]);
            let hexColor = matchCbcArgs[1];

            if (!matchCbcArgs || !hexCodeRegex.test(hexColor)) {
                continue;
            }

            let endLine = startLine + (nCommentLines ? nCommentLines - 1 : 0);

            let matchTextCommentRange = new vscode.Range(
                new vscode.Position(startLine, matchStartPos.character + commentDelimmiter.length),
                new vscode.Position(startLine, matchStartPos.character + commentDelimmiter.length + matchTextComment.length)
            );
            let matchCbcArgsRange = new vscode.Range(
                matchTextCommentRange.end,
                matchRange.end
            );

            let [h, s, l] = hexToHsl(hexColor);
            l = 50;
            hexColor = hslToHex(h, s, l);

            decorationRanges.push({
                hexColor: hexColor,
                matchTextCommentRange: matchTextCommentRange,
                matchCbcArgsRange: matchCbcArgsRange,
                startLine: startLine,
                endLine: endLine,
            });
        }
    }

    const borderWidth = 2;
    const borderRadius = 4;

    function redrawDecorationRanges() {
        // Clear all decoration types
        allDecorationTypes.forEach(dt => dt.dispose());

        // Color all range lines
        decorationRanges.forEach(decorationRange => {
            const nCommentLines = decorationRange.endLine - decorationRange.startLine + 1;

            const decorationTypeArguments = {
                isWholeLine: true,
                backgroundColor: decorationRange.hexColor + "33",
                overviewRulerColor: decorationRange.hexColor + "33",
                borderWidth: `0 ${borderWidth}px 0 ${borderWidth}px`,
                borderColor: decorationRange.hexColor + "66",
                borderStyle: "solid",
            };

            let [h, s, l] = hexToHsl(decorationRange.hexColor);
            l = 80;
            let lighterHexColor = hslToHex(h, s, l);

            // Style middle lines
            if (nCommentLines >= 3) {
                const midLineDecor = vscode.window.createTextEditorDecorationType(decorationTypeArguments);
                activeEditor.setDecorations(
                    midLineDecor,
                    [new vscode.Range(new vscode.Position(decorationRange.startLine + 1, 0), new vscode.Position(decorationRange.endLine - 1, 1))]
                );
                allDecorationTypes.push(midLineDecor);
            }

            // Style top and bottom lines
            if (nCommentLines >= 2) {
                // Top line
                const topLineDecor = vscode.window.createTextEditorDecorationType({
                    ...decorationTypeArguments,
                    borderWidth: `${borderWidth}px ${borderWidth}px 0 ${borderWidth}px`,
                    borderRadius: `${borderRadius}px ${borderRadius}px 0 0`,
                    color: lighterHexColor
                });
                activeEditor.setDecorations(
                    topLineDecor,
                    [new vscode.Range(new vscode.Position(decorationRange.startLine, 0), new vscode.Position(decorationRange.startLine, 1))]
                );
                allDecorationTypes.push(topLineDecor);

                // Bottom line
                const bottomLineDecor = vscode.window.createTextEditorDecorationType({
                    ...decorationTypeArguments,
                    borderWidth: `0 ${borderWidth}px ${borderWidth}px ${borderWidth}px`,
                    borderRadius: `0 0 ${borderRadius}px ${borderRadius}px`,
                });
                activeEditor.setDecorations(
                    bottomLineDecor,
                    [new vscode.Range(new vscode.Position(decorationRange.endLine, 0), new vscode.Position(decorationRange.endLine, 1))]
                );
                allDecorationTypes.push(bottomLineDecor);
            }
            // Style a single line
            else {
                const singleLineDecor = vscode.window.createTextEditorDecorationType({
                    ...decorationTypeArguments,
                    borderWidth: `${borderWidth}px`,
                    borderRadius: `${borderRadius}px`,
                    color: lighterHexColor
                });
                activeEditor.setDecorations(
                    singleLineDecor,
                    [new vscode.Range(new vscode.Position(decorationRange.startLine, 0), new vscode.Position(decorationRange.endLine, 1))]
                );
                allDecorationTypes.push(singleLineDecor);
            }

            // Style cbc args
            let keywordDecorationType = vscode.window.createTextEditorDecorationType({
                opacity: "0.5"
            });
            activeEditor.setDecorations(
                keywordDecorationType,
                [decorationRange.matchCbcArgsRange]
            );
            allDecorationTypes.push(keywordDecorationType);

            // Style comment text
            let commentDecorationType = vscode.window.createTextEditorDecorationType({
                fontWeight: "bold"
            });
            activeEditor.setDecorations(
                commentDecorationType,
                [decorationRange.matchTextCommentRange]
            );
            allDecorationTypes.push(commentDecorationType);

        });

    };

    // Get the active editor for the first time and initialise the regex
    if (vscode.window.activeTextEditor) {
        activeEditor = vscode.window.activeTextEditor;
        updateCommentDelimmiter();
        triggerUpdateDecorations();
    }

    // * Handle active file changed
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            activeEditor = editor;
            decorationRanges = [];
            updateCommentDelimmiter();
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    // * Handle file contents changed
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            console.log(event);
            if (event.reason !== vscode.TextDocumentChangeReason.Undo &&
                event.reason !== vscode.TextDocumentChangeReason.Redo) {
                // Event was not caused by an undo/redo
                // Manually update existing decoration text
                updateExistingDecorationRanges(event.contentChanges);
            }
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    // * IMPORTANT:
    // To avoid calling update too often,
    // set a timer for 200ms to wait before updating decorations
    var timeout: NodeJS.Timer;
    function triggerUpdateDecorations() {
        // if (timeout) {
        //     clearTimeout(timeout);
        // }
        // timeout = setTimeout(() => {
        //     decorationRanges = [];
        //     addNewDecorationRanges();
        //     redrawDecorationRanges();
        // }, 200);
        decorationRanges = [];
        addNewDecorationRanges();
        redrawDecorationRanges();
    }

    // function backspace(a: any) {
    //     console.log("KEY PRESSED!", a);
    //     return vscode.commands.executeCommand('deleteLeft');
    // }

    // context.subscriptions.push(vscode.commands.registerCommand('jrieken.backspaceLeft', backspace));

    function overrideCommand(
        context: vscode.ExtensionContext,
        command: string,
        callback: (...args: any[]) => any
    ) {
        const disposable = vscode.commands.registerCommand(command, async (args) => {
            // if (configuration.disableExtension) {
            //     return vscode.commands.executeCommand('default:' + command, args);
            // }

            if (!vscode.window.activeTextEditor) {
                return;
            }

            if (
                vscode.window.activeTextEditor.document &&
                vscode.window.activeTextEditor.document.uri.toString() === 'debug:input'
            ) {
                return vscode.commands.executeCommand('default:' + command, args);
            }

            return callback(args);
        });
        context.subscriptions.push(disposable);
    }

    // // override vscode commands
    // overrideCommand(context, 'type', async args => {
    //     // taskQueue.enqueueTask(async () => {
    //     //     const mh = await getAndUpdateModeHandler();

    //     //     if (compositionState.isInComposition) {
    //     //         compositionState.composingText += args.text;
    //     //     } else {
    //     //         await mh.handleKeyEvent(args.text);
    //     //     }
    //     // });
    //     console.log("heh");
    // });
}

// this method is called when your extension is deactivated
export function deactivate() { }
