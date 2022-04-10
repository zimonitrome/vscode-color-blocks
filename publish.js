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

let myExec = (command) => execSync(command,
    (error, stdout, stderr) => {
        console.log('stdout: ' + stdout.toString());
        console.log('stderr: ' + stderr.toString());
        if (error !== null) {
            throw Error('exec error: ' + error.toString());
        }
    }, { encoding: "utf-8" });

// Package
myExec(`vsce package ${version}`);

// Write to logfile
let changeLogPath = './CHANGELOG.md';
let messageRows = message.split("\n");
let changeLogRows = [`## [${version}]`, "", ...messageRows, ""];

let rows = fs.readFileSync(changeLogPath).toString().split('\n');
rows.unshift(...changeLogRows);
fs.writeFileSync(changeLogPath, rows.join('\n'));

myExec(`git add ./CHANGELOG.md`);
myExec(`git commit --amend -m "${message}"`);

// Publish
myExec(`vsce publish`);

// Push
myExec(`git push`);
myExec(`git push --tags`);