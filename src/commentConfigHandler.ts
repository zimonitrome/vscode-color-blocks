// Most code here copied from https://github.com/aaron-bond/better-comments/pull/302/commits/47717e7ddcf110cb7cd2a7902ccc98ab146f97a5

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import JSON5 from 'json5';

interface CommentConfig {
    lineComment?: string;
    blockComment?: [string, string];
}

interface Comment {
    range: [number, number];
    startDelimiter: string;
    content: string;
    endDelimiter: string;
}

const escapeRegex = (string: string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

export class CommentConfigHandler {
    private readonly languageCommentConfigPaths = new Map<string, string>();
    private readonly languageCommentConfigs = new Map<string, CommentConfig | undefined>();
    public currentCommentConfig?: CommentConfig = undefined;
    public regex: RegExp = RegExp("");

    public constructor() {
        this.updateLanguagesDefinitions();
    }

    /**
     * Generate a map of language configuration file by language defined by extensions
     * External extensions can override default configurations os VSCode
     */
    public updateLanguagesDefinitions() {
        this.languageCommentConfigs.clear();

        for (const extension of vscode.extensions.all) {
            const packageJSON = extension.packageJSON as any;
            if (packageJSON.contributes && packageJSON.contributes.languages) {
                for (const language of packageJSON.contributes.languages) {
                    if (language.configuration) {
                        const configPath = path.join(extension.extensionPath, language.configuration);
                        this.languageCommentConfigPaths.set(language.id, configPath);
                    }
                }
            }
        }
    }

    /**
     * Update the comment config for `languageCode`
     * @param languageCode The short code of the current language
     */
    public updateCurrentConfig(languageCode: string) {
        if (this.languageCommentConfigs.has(languageCode))
            this.currentCommentConfig = this.languageCommentConfigs.get(languageCode);

        else if (!this.languageCommentConfigPaths.has(languageCode))
            this.currentCommentConfig = undefined;

        else {
            const file = this.languageCommentConfigPaths.get(languageCode)!;
            const content = fs.readFileSync(file, { encoding: 'utf8' });

            try {
                // Using JSON5 to parse language JSONs with comments.
                const config = JSON5.parse(content);

                this.languageCommentConfigs.set(languageCode, config.comments);
                this.currentCommentConfig = config.comments;
            } catch (error) {
                this.languageCommentConfigs.set(languageCode, undefined);
                this.currentCommentConfig = undefined;
            }
        }

        if (!this.currentCommentConfig) return;

        // Update regex
        const ccc = this.currentCommentConfig;
        let regExString = '';
        if (!!ccc?.lineComment)
            regExString += String.raw`(${escapeRegex(ccc.lineComment)})(.*)`;
        if (regExString) regExString += '|';
        if (!!ccc?.blockComment)
            regExString += String.raw`(${escapeRegex(ccc.blockComment[0])})([\S\s]*?)(${escapeRegex(ccc.blockComment[1])})`;
        if (!regExString) return null;

        this.regex = RegExp(regExString, "g");
    }

    /**
     * Return all comments as regex matches for the given `document`
     */
    public getComments(document: vscode.TextDocument): Array<Comment> {
        if (!this.currentCommentConfig) return [];

        const text = document.getText();

        let match: RegExpExecArray | null;
        let matches: Array<Comment> = [];
        while (match = this.regex.exec(text)) {
            matches.push({
                range: [match.index, match.index + match[0].length],
                startDelimiter: match[1] || match[3],
                content: match[2] || match[4],
                endDelimiter: match[5] || '',
            });
        }
        return matches;
    };
}