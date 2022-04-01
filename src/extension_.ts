// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import { Parser } from './parser';

function shadeColor(color: string, adder: number) {

    var R = parseInt(color.substring(1, 3), 16);
    var G = parseInt(color.substring(3, 5), 16);
    var B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R + adder as any);
    G = parseInt(G + adder as any);
    B = parseInt(B + adder as any);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    var RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    var GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    var BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    console.log("YO");

    console.log("YO");

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "color-block-comments" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('color-block-comments.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from Color Block Comments!');
    });

    // let parser = new Parser();
    context.subscriptions.push(disposable);

    let activeEditor: vscode.TextEditor;
    // let parser: Parser = new Parser();




    let decorationTypes: Array<vscode.TextEditorDecorationType> = [];

    // Called to handle events below
    let updateDecorations = function (changedLine: number | undefined = undefined) {
        // * if no active window is open, return
        if (!activeEditor) return;

        // // * if lanugage isn't supported, return
        // if (!parser.supportedLanguage) return;

        // Finds the single line comments using the language comment delimiter
        // parser.findSingleLineComments(activeEditor);

        // // Finds the multi line comments using the language comment delimiter
        // parser.findBlockComments(activeEditor);

        // // Finds the jsdoc comments
        // parser.findJSDocComments(activeEditor);

        // Apply the styles set in the package.json
        // parser.applyDecorations(activeEditor);

        // Remove previous decorationtypes
        for (let decorationType of decorationTypes) {
            decorationType.dispose();
        }
        decorationTypes = [];

        let text = activeEditor.document.getText();
        // vscode.
        // vscode.languages.getLanguages()
        // console.log(activeEditor.document.languageId)
        let regEx = new RegExp("cbc{(.*)}", "ig");

        let match: any;
        while (match = regEx.exec(text)) {
            let [hexcolor, nCommentLines] = match[1].split(',');
            nCommentLines = parseInt(nCommentLines);
            let lighterHexcolor = shadeColor(hexcolor, 150);

            if (changedLine !== undefined) {
                
            }

            // Set the styles

            // Keyword
            let matchStartPos = activeEditor.document.positionAt(match.index);
            let matchEndPos = activeEditor.document.positionAt(match.index + match[0].length);
            let matchRange = new vscode.Range(matchStartPos, matchEndPos);
            let keywordDecorationType = vscode.window.createTextEditorDecorationType({
                opacity: "0.5",
                color: lighterHexcolor
            });
            decorationTypes.push(keywordDecorationType);
            activeEditor.setDecorations(
                keywordDecorationType,
                [matchRange]
            );

            // Background
            let fromLine = matchStartPos.line;
            let toLine = fromLine + (nCommentLines ? nCommentLines - 1 : 0);
            let borderWidth = 2;

            if (nCommentLines >= 3) {
                // Style middle lines
                let middleLinesRange = new vscode.Range(
                    new vscode.Position(fromLine + 1, 0),
                    new vscode.Position(toLine - 1, 1) // Always add 1 to prevent wrap around
                );
                let linesDecorationType = vscode.window.createTextEditorDecorationType({
                    backgroundColor: hexcolor + "33",
                    overviewRulerColor: hexcolor + "33",
                    isWholeLine: true,
                    borderWidth: `0 ${borderWidth}px 0 ${borderWidth}px`,
                    borderColor: lighterHexcolor + "33",
                    borderStyle: "solid",
                    // rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
                    // rangeBehavior: vscode.DecorationRangeBehavior.OpenOpen
                    // rangeBehavior: vscode.DecorationRangeBehavior.OpenClosed // wrong
                    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen // wrong
                });
                decorationTypes.push(linesDecorationType);
                activeEditor.setDecorations(
                    linesDecorationType,
                    [middleLinesRange]
                );
            }

            if (nCommentLines >= 2) {
                // Start line
                let startLineDecorationType = vscode.window.createTextEditorDecorationType({
                    backgroundColor: hexcolor + "33",
                    overviewRulerColor: hexcolor + "33",
                    isWholeLine: true,
                    borderWidth: `${borderWidth}px ${borderWidth}px 0 ${borderWidth}px`,
                    borderColor: lighterHexcolor + "33",
                    borderStyle: "solid",
                    borderRadius: `4px 4px 0 0`,
                    rangeBehavior: vscode.DecorationRangeBehavior.OpenOpen
                });
                decorationTypes.push(startLineDecorationType);
                activeEditor.setDecorations(
                    startLineDecorationType,
                    [activeEditor.document.lineAt(fromLine).range]
                );

                // End line
                let endLineDecorationType = vscode.window.createTextEditorDecorationType({
                    backgroundColor: hexcolor + "33",
                    overviewRulerColor: hexcolor + "33",
                    isWholeLine: true,
                    borderWidth: `0 ${borderWidth}px ${borderWidth}px ${borderWidth}px`,
                    borderColor: lighterHexcolor + "33",
                    borderStyle: "solid",
                    borderRadius: `0 0 4px 4px`,
                    // rangeBehavior: vscode.DecorationRangeBehavior.OpenOpen,
                    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed, // wrong
                    // rangeBehavior: vscode.DecorationRangeBehavior.OpenClosed, // Pretty good
                });
                decorationTypes.push(endLineDecorationType);
                activeEditor.setDecorations(
                    endLineDecorationType,
                    [activeEditor.document.lineAt(toLine).range]
                );
            }

            else if (nCommentLines === 1) {
                // Single line
                let lineDecorationType = vscode.window.createTextEditorDecorationType({
                    backgroundColor: hexcolor + "33",
                    overviewRulerColor: hexcolor + "33",
                    isWholeLine: true,
                    borderWidth: `${borderWidth}px`,
                    borderColor: lighterHexcolor + "33",
                    borderStyle: "solid",
                    borderRadius: `4px`,
                    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed // Correct
                });
                decorationTypes.push(lineDecorationType);
                activeEditor.setDecorations(
                    lineDecorationType,
                    [activeEditor.document.lineAt(fromLine).range]
                );
            }

            try {
                // Comment
                let commentStartPos = activeEditor.document.lineAt(fromLine).range.start; // TODO: Improve
                let commentEndPos = matchStartPos;
                let commentRange = new vscode.Range(commentStartPos, commentEndPos);
                let commentDecorationType = vscode.window.createTextEditorDecorationType({
                    fontWeight: "bold",
                    color: lighterHexcolor
                    // textDecoration: `; font-size: ${size}px; height: ${1.5 * size}px;`,
                });
                decorationTypes.push(commentDecorationType);
                activeEditor.setDecorations(
                    commentDecorationType,
                    [commentRange]
                );
            }
            catch (e) {
                console.error(e);
            }


            // vscode.commands.registerCommand()

            // console.log(vscode.languages.getLanguages());
        }


        // while (match = regEx.exec(text)) {
        //     console.log(match);
        // }
    };

    // Get the active editor for the first time and initialise the regex
    if (vscode.window.activeTextEditor) {
        activeEditor = vscode.window.activeTextEditor;

        // // Set the regex patterns for the specified language's comments
        // parser.setRegex(activeEditor.document.languageId);

        // Trigger first update of decorators
        triggerUpdateDecorations();
    }

    // * Handle active file changed
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            activeEditor = editor;

            // // Set regex for updated language
            // parser.setRegex(editor.document.languageId);

            // Trigger update to set decorations for newly active file
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    // * Handle file contents changed
    vscode.workspace.onDidChangeTextDocument(event => {

        // Trigger updates if the text was changed in the same document
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        // console.log(event.contentChanges[0].text.charCodeAt(0));
        if (event.contentChanges[0].text.includes("\n"))
            console.log("newline");
        if (event.contentChanges[0].text.includes("\n"))

    });



    function myfunc() {
        console.log("Test");
        updateDecorations();
    }

    // * IMPORTANT:
    // To avoid calling update too often,
    // set a timer for 200ms to wait before updating decorations
    var timeout: NodeJS.Timer;
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(myfunc, 200);
    }
}

// this method is called when your extension is deactivated
export function deactivate() { }
