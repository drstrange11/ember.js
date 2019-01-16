/* eslint-disable no-console */
'use strict';

const chalk = require('chalk');
const runInSequence = require('../lib/run-in-sequence');
const path = require('path');

const finalhandler = require('finalhandler');
const http = require('http');
const serveStatic = require('serve-static');
const fs = require('fs');

// Serve up public/ftp folder.
const serve = serveStatic('./dist/', { index: ['index.html', 'index.htm'] });

// Create server.
const server = http.createServer(function(req, res) {
  let done = finalhandler(req, res);
  serve(req, res, done);
});

const PORT = 13141;
// Listen.
server.listen(PORT);

// Cache the Chrome browser instance when launched for new pages.
let browserRunner;

function getBrowserRunner() {
  if (browserRunner === undefined) {
    // requires new node
    let BrowserRunner = require('./run-tests-browser-runner');
    browserRunner = new BrowserRunner();
  }
  return browserRunner;
}

function run(queryString) {
  var url = 'http://localhost:' + PORT + '/tests/?' + queryString;
  return runInBrowser(url, 3);
}

function runInBrowser(url, attempts) {
  console.log('Running Chrome headless: ' + url);
  return getBrowserRunner().run(url, attempts);
}

var testFunctions = [];

function generateTestsFor(packageName) {
  let relativePath = path.join('packages', packageName);

  if (!fs.existsSync(path.join(relativePath, 'tests'))) {
    return;
  }

  testFunctions.push(() => run('package=' + packageName));
  testFunctions.push(() => run('package=' + packageName + '&dist=es'));
  testFunctions.push(() => run('package=' + packageName + '&enableoptionalfeatures=true'));

  // TODO: this should ultimately be deleted (when all packages can run with and
  // without jQuery)
  if (packageName !== 'ember') {
    testFunctions.push(() => run('package=' + packageName + '&jquery=none'));
  }
}

function generateEachPackageTests() {
  fs.readdirSync('packages/@ember').forEach(e => generateTestsFor(`@ember/${e}`));

  fs.readdirSync('packages')
    .filter(e => e !== '@ember')
    .forEach(generateTestsFor);
}

function generateBuiltTests() {
  testFunctions.push(() => run(''));
  testFunctions.push(() => run('dist=min&prod=true'));
  testFunctions.push(() => run('dist=prod&prod=true'));
  testFunctions.push(() => run('enableoptionalfeatures=true&dist=prod&prod=true'));
  testFunctions.push(() => run('legacy=true'));
  testFunctions.push(() => run('legacy=true&dist=min&prod=true'));
  testFunctions.push(() => run('legacy=true&dist=prod&prod=true'));
  testFunctions.push(() => run('legacy=true&enableoptionalfeatures=true&dist=prod&prod=true'));
}

function generateOldJQueryTests() {
  testFunctions.push(() => run('jquery=1.10.2'));
  testFunctions.push(() => run('jquery=1.12.4'));
  testFunctions.push(() => run('jquery=2.2.4'));
}

function generateExtendPrototypeTests() {
  testFunctions.push(() => run('extendprototypes=true'));
  testFunctions.push(() => run('extendprototypes=true&enableoptionalfeatures=true'));
}

function runAndExit() {
  runInSequence(testFunctions)
    .then(function() {
      console.log(chalk.green('Passed!'));
      process.exit(0);
    })
    .catch(function(err) {
      console.error(chalk.red(err.toString()));
      console.error(chalk.red('Failed!'));
      process.exit(1);
    });
}

let p = process.env.PACKAGE || 'ember';
switch (process.env.TEST_SUITE) {
  case 'package':
    console.log(`suite: package ${p}`);
    generateTestsFor(p);
    runAndExit();
    break;
  case 'built-tests':
    console.log('suite: built-tests');
    generateBuiltTests();
    runAndExit();
    break;
  case 'old-jquery-and-extend-prototypes':
    console.log('suite: old-jquery-and-extend-prototypes');
    generateOldJQueryTests();
    generateExtendPrototypeTests();
    runAndExit();
    break;
  case 'all':
    console.log('suite: all');
    generateBuiltTests();
    generateOldJQueryTests();
    generateExtendPrototypeTests();
    generateEachPackageTests();
    runAndExit();
    break;
  default:
    console.log('suite: default (generate each package)');
    generateEachPackageTests();
    runAndExit();
}
