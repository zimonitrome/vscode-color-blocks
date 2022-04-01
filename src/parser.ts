import * as vscode from 'vscode';

interface CommentTag {
	tag: string;
	escapedTag: string;
	decoration: vscode.TextEditorDecorationType;
	ranges: Array<vscode.DecorationOptions>;
}

export class Parser {
	private tags: CommentTag[] = [];
	private contributions: any = vscode.workspace.getConfiguration('better-comments') as any;

	public constructor() {
		this.setTags();
	}

	/**
	 * Sets the highlighting tags up for use by the parser
	 */
	 private setTags(): void {
		let items = this.contributions.tags;
		for (let item of items) {
			let options: vscode.DecorationRenderOptions = { color: item.color, backgroundColor: item.backgroundColor };

			// the textDecoration is initialised to empty so we can concat a preceeding space on it
			options.textDecoration = "";

			if (item.strikethrough) {
				options.textDecoration += "line-through";
			}

			let escapedSequence = item.tag.replace(/([()[{*+.$^\\|?])/g, '\\$1');
			this.tags.push({
				tag: item.tag,
				escapedTag: escapedSequence.replace(/\//gi, "\\/"), // ! hardcoded to escape slashes
				ranges: [],
				decoration: vscode.window.createTextEditorDecorationType(options)
			});
		}
	}

	/**
	 * Apply decorations after finding all relevant comments
	 * @param activeEditor The active text editor containing the code document
	 */
	 public applyDecorations(activeEditor: vscode.TextEditor): void {
		for (let tag of this.tags) {
			activeEditor.setDecorations(tag.decoration, tag.ranges);

			// clear the ranges for the next pass
			tag.ranges.length = 0;
		}
	}

	/**
	 * Finds all single line comments delimited by a given delimiter and matching tags specified in package.json
	 * @param activeEditor The active text editor containing the code document
	 */
	 public findSingleLineComments(activeEditor: vscode.TextEditor): void {

		// If highlight single line comments is off, single line comments are not supported for this language
		if (!this.highlightSingleLineComments) return;

		let text = activeEditor.document.getText();

		// if it's plain text, we have to do mutliline regex to catch the start of the line with ^
		let regexFlags = (this.isPlainText) ? "igm" : "ig";
		let regEx = new RegExp(this.expression, regexFlags);

		let match: any;
		while (match = regEx.exec(text)) {
			let startPos = activeEditor.document.positionAt(match.index);
			let endPos = activeEditor.document.positionAt(match.index + match[0].length);
			let range = { range: new vscode.Range(startPos, endPos) };

			// Required to ignore the first line of .py files (#61)
			if (this.ignoreFirstLine && startPos.line === 0 && startPos.character === 0) {
				continue;
			}

			// Find which custom delimiter was used in order to add it to the collection
			let matchTag = this.tags.find(item => item.tag.toLowerCase() === match[3].toLowerCase());

			if (matchTag) {
				matchTag.ranges.push(range);
			}
		}
	}
}