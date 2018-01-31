'use strict';
/* jslint node: true */
/* jshint node: true */
/* eslint no-extra-parens: { "nestedBinaryExpressions": false } */

//
// Node.js test harness... 
//

// All paths are relative to the test folder for the project
const fs = require('fs');
const https = require('https');
const http = require('http');
const PAD = require('../src/lib/pageaday/pageaday');
const Ymd = require('../src/lib/pageaday/padutil');
const xmlFullPath = "./testdata.xml";

var timer1 = "ElapsedTime";
var errors = 0;
var MyPAD = new PAD("");

console.log("Page-A-Day Test Suite.");
console.time(timer1);

var xml = MyPAD.initData(fs.readFileSync(xmlFullPath, { encoding: 'utf8' }), true);

if (!xml) {
    console.log(`Error loading data set ${xmlFullPath}.`);
    process.exit(-1);
}

console.log(`Using data set ${xmlFullPath}. (${xml.pages.length} Data Records. ${xml.tests.length} Test Cases.)`);

for (var rawTest of xml.tests) {
    let test = MyPAD.normalizeTest(rawTest);
    let result = MyPAD.generatePage(test.dateStr);

    //test.xml = ""; // DEBUG: Reduce output junk
    //console.log("============================================");
    //console.log(result);
    //console.log("-----------");
    //console.log(test);
    //console.log("============================================");

    if (checkResult(result, test) === true) {
        console.log(`Test case ${test.name}: Pass`);
    } else {
        console.log(`Test case ${test.name}: FAIL *******`);
        errors += 1;
    }
}

console.log (`\r\n ${xml.tests.length - errors} of ${xml.tests.length} passed.`);
console.timeEnd(timer1);
console.log(process.memoryUsage());

console.log(MyPAD.xml.pages);

process.exit(errors);


///////////////////////////////////////////////////////////////////
// SUPPORT FUNCTIONS
///////////////////////////////////////////////////////////////////


function checkResult(result, expected) {
    // Dates match?
    if (result.ymd.toString() !== expected.dateStr
        || result.ymd.dow != parseInt (expected.dow, 10)) {
        //console.log(`Date Fail: '${result.ymd.toString()}' != '${expected.dateStr}' OR ${result.ymd.dow} != ${expected.dow}.`);
        return false;
    }

    // Holidays, birthdays, anniversaries match?
    if (aryEqual(result.holidays, expected.holidays) !== true
        || aryEqual(result.birthdays, expected.birthdays) !== true
        || aryEqual(result.anniversaries, expected.anniversaries) !== true) {
        //console.log(`Event Fail:\r\n. '${result.holidays}' vs. '${expected.holidays}'\r\n'${result.birthdays}' vs. '${expected.birthdays}'\r\n'${result.anniversaries}' vs. '${expected.anniversaries}'`);
        return false;
    }

    // Saying and author match?
    if ((expected.saying && result.saying !== expected.saying)
        || (expected.author && result.author !== expected.author)) {
        //console.log(`Saying fail: ${result.saying} != ${expected.saying} OR ${result.author} != ${expected.author}.`);
        return false;
    }

    // Web and spoken match?
    if ((expected.web && result.web !== expected.web)
        || (expected.spoken && result.spoken !== expected.spoken)) {
        //console.log(`Web/Spoken fail: ${result.web} != ${expected.web} OR ${result.spoken} != ${expected.spoken}.`);
        return false;
    }

}

function aryEqual(a1, a2) {
    if (!a1 || !a2) {
        return true;
    }
    return (a1.length === a2.length && a1.every((v, i) => v === a2[i]));
}

