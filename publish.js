var execSync = require('child_process').execSync;
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

// Parsing
let version = argv.version ?? argv._[0];
let message = (argv.message ?? argv.description) ?? argv._[1];

if (!version)
    throw Error('Provide a version.');

if (!message)
    message = "";

let logFunction = (error, stdout, stderr) => {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
        throw Error('exec error: ' + error);
    }
};

// Package
execSync(`vsce package ${version}`, logFunction);

// Write to logfile
let changeLogPath = './CHANGELOG.md';
let messageRows = message.split("\n");
let changeLogRows = [`## [${version}]`, "", ...messageRows, ""];

let rows = fs.readFileSync(changeLogPath).toString().split('\n');
rows.unshift(...changeLogRows);
fs.writeFileSync(changeLogPath, rows.join('\n'));

execSync(`git add ./CHANGELOG.md`, logFunction);
execSync(`git commit --amend -m "${message}"`, logFunction);

// Publish
execSync(`vsce publish`, logFunction);

// Push
execSync(`git push`, logFunction);
execSync(`git push --tags`, logFunction);