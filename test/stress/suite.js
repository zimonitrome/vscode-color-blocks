const assert = require('assert');
const vscode = require('vscode');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isStrict = process.env.COLOR_BLOCKS_STRESS_STRICT !== '0';
let decorationTypesCreated = 0;

function makeDocument(blockCount, linesPerBlock) {
    const lines = [
        'export function stress() {',
    ];

    for (let block = 0; block < blockCount; block++) {
        const color = (block % 2 === 0) ? '#88f' : 'orangered';
        lines.push(`    // Stress block ${block} {${color}, ${linesPerBlock}}`);
        for (let line = 0; line < linesPerBlock; line++) {
            lines.push(`    const value_${block}_${line} = ${block + line};`);
        }
        lines.push('');
    }

    lines.push('}');
    return lines.join('\n');
}

function makeShellFalsePositiveDocument(groupCount, linesPerGroup) {
    const upperGreen = '${GREEN}';
    const upperReset = '${RESET}';
    const lowerGreen = '${green}';
    const lowerOrangeRed = '${orangered}';
    const lowerReset = '${reset}';
    const lines = [
        '#!/usr/bin/env bash',
        'GREEN="\\033[0;32m"',
        'RESET="\\033[0m"',
        'ORANGERED="not-a-color-block"',
        '',
    ];

    for (let group = 0; group < groupCount; group++) {
        lines.push(`# Bash prompt colors ${upperGreen}ready${upperReset} group ${group}`);
        lines.push(`# Lowercase substitutions ${lowerGreen} ${lowerOrangeRed} ${lowerReset} must stay inert`);
        lines.push(`printf '%s\\n' "${upperGreen}starting group ${group}${upperReset}"`);
        for (let line = 0; line < linesPerGroup; line++) {
            lines.push(`echo "${upperGreen}value_${group}_${line}${upperReset}"`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

function makePowerShellDocument(blockCount, linesPerBlock) {
    const lines = [
        '$Green = [ConsoleColor]::Green',
        '$Reset = [ConsoleColor]::White',
        '',
    ];

    for (let block = 0; block < blockCount; block++) {
        const color = (block % 2 === 0) ? '#78d' : 'orangered';
        lines.push(`# PowerShell line block ${block} {${color}, ${linesPerBlock}}`);
        for (let line = 0; line < linesPerBlock; line++)
            lines.push(`Write-Output "line_${block}_${line}"`);
        lines.push('');
    }

    lines.push('<#');
    lines.push('PowerShell block comment {#9c6, 6}');
    lines.push('#>');
    lines.push('$items = @(');
    lines.push('    "alpha"');
    lines.push('    "beta"');
    lines.push(')');
    lines.push('foreach ($item in $items) {');
    lines.push('    Write-Output $item');
    lines.push('}');

    return lines.join('\n');
}

async function openStressEditorFromContent(language, content, viewColumn = vscode.ViewColumn.Active) {
    const document = await vscode.workspace.openTextDocument({
        language,
        content,
    });
    return vscode.window.showTextDocument(document, viewColumn);
}

async function openStressEditor(blockCount, linesPerBlock, viewColumn = vscode.ViewColumn.Active) {
    return openStressEditorFromContent('typescript', makeDocument(blockCount, linesPerBlock), viewColumn);
}

async function editBurst(editor, iterations) {
    let failedEdits = 0;
    let slowestEditMs = 0;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        const targetLine = 2 + (i * 17) % Math.max(1, editor.document.lineCount - 3);
        const position = new vscode.Position(targetLine, editor.document.lineAt(targetLine).text.length);
        const editStart = performance.now();
        const ok = await editor.edit(editBuilder => {
            editBuilder.insert(position, ` // edit ${i}`);
        }, { undoStopBefore: false, undoStopAfter: false });
        slowestEditMs = Math.max(slowestEditMs, performance.now() - editStart);

        if (!ok)
            failedEdits++;
    }

    return {
        failedEdits,
        editBurstMs: performance.now() - start,
        slowestEditMs,
    };
}

async function runScenario(name, blockCount, linesPerBlock, editIterations) {
    console.log(`Opening ${blockCount} blocks x ${linesPerBlock} lines and running ${editIterations} edit bursts...`);
    const start = performance.now();
    const startDecorationTypesCreated = decorationTypesCreated;
    const editor = await openStressEditor(blockCount, linesPerBlock);
    await sleep(1500);
    const editMetrics = await editBurst(editor, editIterations);
    await sleep(1500);

    const result = {
        scenario: name,
        blockCount,
        linesPerBlock,
        lineCount: editor.document.lineCount,
        editIterations,
        ...editMetrics,
        decorationTypesCreated: decorationTypesCreated - startDecorationTypesCreated,
        wallMs: performance.now() - start,
    };

    console.log(`STRESS_RESULT ${JSON.stringify(result)}`);
    if (isStrict)
        assert.strictEqual(result.failedEdits, 0, `${name} had failed edits`);

    return result;
}

async function runDocumentScenario(name, language, content, editIterations) {
    console.log(`Opening ${language} stress document and running ${editIterations} edit bursts...`);
    const start = performance.now();
    const startDecorationTypesCreated = decorationTypesCreated;
    const editor = await openStressEditorFromContent(language, content);
    await sleep(1500);
    const editMetrics = await editBurst(editor, editIterations);
    await sleep(1500);

    const result = {
        scenario: name,
        language,
        lineCount: editor.document.lineCount,
        editIterations,
        ...editMetrics,
        decorationTypesCreated: decorationTypesCreated - startDecorationTypesCreated,
        wallMs: performance.now() - start,
    };

    console.log(`STRESS_RESULT ${JSON.stringify(result)}`);
    if (isStrict)
        assert.strictEqual(result.failedEdits, 0, `${name} had failed edits`);

    return result;
}

async function runSideBySideScenario() {
    console.log('Opening two color-block documents side by side and editing both...');
    const start = performance.now();
    const startDecorationTypesCreated = decorationTypesCreated;
    const leftEditor = await openStressEditor(12, 35, vscode.ViewColumn.One);
    const rightEditor = await openStressEditor(12, 35, vscode.ViewColumn.Two);
    await sleep(1500);

    const leftMetrics = await editBurst(leftEditor, 30);
    const rightMetrics = await editBurst(rightEditor, 30);
    await sleep(1500);

    const visibleStressEditors = vscode.window.visibleTextEditors.filter(editor =>
        editor.document === leftEditor.document || editor.document === rightEditor.document
    );
    const result = {
        scenario: 'side-by-side',
        visibleEditors: visibleStressEditors.length,
        leftFailedEdits: leftMetrics.failedEdits,
        rightFailedEdits: rightMetrics.failedEdits,
        leftEditBurstMs: leftMetrics.editBurstMs,
        rightEditBurstMs: rightMetrics.editBurstMs,
        decorationTypesCreated: decorationTypesCreated - startDecorationTypesCreated,
        wallMs: performance.now() - start,
    };

    console.log(`STRESS_RESULT ${JSON.stringify(result)}`);
    assert.strictEqual(result.visibleEditors, 2, 'side-by-side scenario should keep two visible editors');
    if (isStrict) {
        assert.strictEqual(result.leftFailedEdits, 0, 'side-by-side left editor had failed edits');
        assert.strictEqual(result.rightFailedEdits, 0, 'side-by-side right editor had failed edits');
    }

    return result;
}

async function run() {
    const createTextEditorDecorationType = vscode.window.createTextEditorDecorationType.bind(vscode.window);
    vscode.window.createTextEditorDecorationType = (...args) => {
        decorationTypesCreated++;
        return createTextEditorDecorationType(...args);
    };

    const extension = vscode.extensions.getExtension('zimonitrome.color-blocks');
    assert.ok(extension, 'Color Blocks extension was not loaded by the Extension Host');
    await extension.activate();

    const manyBlocks = await runScenario('many-blocks', 40, 80, 100);
    const hugeBlocks = await runScenario('huge-blocks', 4, 1000, 40);
    const shellSubstitutions = await runDocumentScenario(
        'shellscript-substitution-false-positives',
        'shellscript',
        makeShellFalsePositiveDocument(30, 8),
        60
    );
    const powerShellComments = await runDocumentScenario(
        'powershell-line-and-block-comments',
        'powershell',
        makePowerShellDocument(20, 10),
        60
    );
    await runSideBySideScenario();

    assert.ok(manyBlocks.lineCount > 3000);
    assert.ok(hugeBlocks.lineCount > 4000);
    assert.ok(shellSubstitutions.lineCount > 300);
    assert.strictEqual(shellSubstitutions.decorationTypesCreated, 0);
    assert.ok(powerShellComments.lineCount > 200);
    assert.ok(powerShellComments.decorationTypesCreated > 0);
    console.log('Stress test completed without failed edits or Extension Host crashes.');
}

module.exports = { run };
