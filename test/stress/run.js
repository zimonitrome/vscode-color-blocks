const path = require('path');
const { spawnSync } = require('child_process');
const { runTests } = require('@vscode/test-electron');

async function main() {
    const extensionDevelopmentPath = path.resolve(__dirname, '../..');
    const extensionTestsPath = path.resolve(__dirname, 'suite.js');
    const webpackCliPath = require.resolve('webpack-cli/bin/cli.js');

    const build = spawnSync(process.execPath, [
        webpackCliPath,
        '--mode',
        'production',
        '--devtool',
        'hidden-source-map'
    ], {
        cwd: extensionDevelopmentPath,
        stdio: 'inherit'
    });

    if (build.status !== 0)
        process.exit(build.status ?? 1);

    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [
            '--disable-extensions',
            '--disable-workspace-trust',
            '--skip-welcome',
            '--skip-release-notes'
        ],
    });
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
