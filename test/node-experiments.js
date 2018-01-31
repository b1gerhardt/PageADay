'use strict';
/* jslint node: true */
/* jshint node: true */
/* eslint no-extra-parens: { "nestedBinaryExpressions": false } */

//
// Node.js experimentation... 
//

var testCount = 0;

const fs = require('fs');
const xml2js = require('xml-js');
const xml2jsOptions = {
    compact: true,
    trim: true,
    nativeType: true,
    elementNameFn: function (name) {
        return name.slice(name.search(':') + 1);        // Remove XMLNS prefix data
    },
    ignoreDeclaration: true,
    ignoreInstruction: true,
    ignoreAttributes: true,
    ignoreComment: true,
    ignoreCdata: true,
    ignoreDoctype: true,
    ignoreText: false
};

const PAD = require('../src/lib/pageaday/pageaday');
const Ymd = require('../src/lib/pageaday/padutil');
const xmlFullPath = "./testdata.xml";

var xml = fs.readFileSync(xmlFullPath, { encoding: 'utf8' });
var jsData = xml2js.xml2js(xml, xml2jsOptions); 

//console.log(jsData);
console.log("===================");
console.log(`Title: ${jsData.PAGEADAY.TITLE._text}`);
console.log(`Version: ${jsData.PAGEADAY.VERSION._text}`);
console.log("===================");
//console.log(jsData.PAGEADAY.PAGES);
console.log(`Data pages: ${jsData.PAGEADAY.PAGES.PAGE.length}`);
console.log(`Debug pages: ${jsData.PAGEADAY.VALIDATION.CASE.length}`);
console.log("===================");
console.log(`Data from first page:`);
console.log(jsData.PAGEADAY.PAGES.PAGE[0]);
console.log(`Data from first test:`);
console.log(jsData.PAGEADAY.VALIDATION.CASE[0]);

process.exit();

//const https = require('https');
//const http = require('http');
//const repl = require('repl');

//var urlPrefix = 'http://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&explaintext=&exsectionformat=plain&redirects=&titles=';
//var url = urlPrefix + "January_21";

//var themeAry = [];
//var themeText = "";
//var pending = true;

//console.log("About to call https.get()");

// ============= START DEBUG SECTION ================

//var urlPrefix = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&explaintext=&exsectionformat=plain&redirects=&titles=';
//var url = urlPrefix + "January_21";

//var themeAry = [];
//var themeText = "";
//var pending = true;

//console.log("About to call https.get()");

//https.get(url, (res) => {
//    console.log("https.get response callback...");
//    var body = '';
//    var count = 0;

//    res.on('data', (chunk) => {
//        count += 1;
//        body += chunk;
//        console.log("Got chunk. Total chunks: " + count);
//    });

//    res.on('end', () => {
//        var text = inputText.substring(inputText.indexOf("\\nEvents\\n") + 10, inputText.indexOf("\\n\\n\\nBirths"));
//        var themeAry = text.split();
//        var pending = false;
//        console.log("Got end. Size of data: " + body.length);
//    });
//}).on('error', (e) => {
//    console.log("Got error: ", e);
//});

//console.log("Finished calling https.get()");

//var loops = 0;
//while (pending) {
//    loops += 1;
//}

//console.log("Waited for " + loops + " loops.");

//console.log("Result: " + themeAry);

//process.exit();

// ============= END DEBUG SECTION ==================


//http.get(url, (res) => {
//    console.log("https.get response callback...");
//    var body = '';
//    var count = 0;

//    res.on('data', (chunk) => {
//        count += 1;
//        body += chunk;
//        console.log("Got chunk. Total chunks: " + count);
//    });

//    res.on('end', () => {
//        var text = inputText.substring(inputText.indexOf("\\nEvents\\n") + 10, inputText.indexOf("\\n\\n\\nBirths"));
//        var themeAry = text.split();
//        var pending = false;
//        console.log("Got end. Size of data: " + body.length);
//    });
//}).on('error', (e) => {
//    console.log("Got error: ", e);
//});

//console.log("Finished calling https.get()");

//var loops = 0;
//while (pending) {
//    loops += 1;

//    if ( loops > 10000 ) {
//        break;
//    }
//}

//console.log("Waited for " + loops + " loops.");

//console.log ("Result: " + themeAry);

//process.exit();

//var replServer = repl.start({ prompt: "Page-A-Day >" });

//replServer.defineCommand('PADload', {
//    help: "Load a Page-A-Day data file. Use full path.",
//    action: function (arg) {
//        if (!arg) {
//            arg = xmlFullPath;
//        }
//        //this.write(`Loading ${arg}...`);
//        console.log("Loading " + arg + "...");
//        var xml = fs.readFileSync(arg, { encoding: 'utf8' });
//        if (xml) {
//            MyPAD.initData(xml);
//            console.log("done.\n");
//            console.log("Title: " + MyPAD.xml.title + ", Version: " + MyPAD.xml.version + "\n");
//            //this.write(`done\n`);
//            //this.write(`Title: ${MyPAD.xml.title}, Version: ${MyPAD.xml.version}\n`);
//        } else {
//            //this.write(`error.\n`);
//            console.log("error.\n");
//        }
//        this.displayPrompt();
//    }
//});

//replServer.defineCommand('PADdays', {
//    help: "Set the number of days to show. Default is 1",
//    action: function (arg) {
//        if (!arg) {
//            days = 1;
//        } else {
//            days = arg;
//        }
//        console.log("Days set to " + days + ".");
//        this.displayPrompt();
//    }
//});

//replServer.defineCommand('PADdate', {
//    help: "Set the start date using yyyy-mm-dd format",
//    action: function (start) {
//        if (!start) {
//            start = (new Ymd(new Date())).toString();
//        }
//        if (days <= 0) {
//            days = 1;
//        }
//        console.log("Generating Page-A-Day starting at " + start + " and continuing for " + days + " day(s).\n");
//        //this.write(`Generating Page-A-Day starting at ${start} and continuing for ${days} day(s).\n`);
//        var startDate = new Date(start);
//        var count = days;

//        do {
//            var result = MyPAD.generatePage((new Ymd(startDate)).toString());

//            if (result.isValid === true) {
//                var fmt = MyPAD.getFormattedResult(result, "WEB");

//                // Only want to see Easter...
//                if (fmt.holidays.indexOf("Easter") === -1) {
//                    continue;
//                }

//                console.log(fmt.ymdS.dow + ", " + fmt.ymdS.mm + " " + fmt.ymdS.dd + ", " + fmt.ymdS.yy);
//                console.log("    Saying: " + fmt.saying);
//                console.log("    Author: " + fmt.author);
//                console.log("    Holidays: " + fmt.holidays);
//                console.log("    Birthdays: " + fmt.birthdays);
//                console.log("    Anniversaries: " + fmt.anniversaries);
//                //this.write(`${fmt.dDOW}, ${fmt.dMonth} ${fmt.dDay}, ${fmt.dYear}\n`);
//                //this.write(`    Saying: ${fmt.saying}\n`);
//                //this.write(`    Author: ${fmt.author}\n`);
//                //this.write(`    Holidays: ${fmt.holidays}\n`);
//                //this.write(`    Birthdays: ${fmt.birthdays}\n`);
//                //this.write(`    Anniversaries: ${fmt.anniversaries}\n`);
//            }

//            startDate.setDate(startDate.getDate() + 1);
//            count -= 1;

//        } while (count > 0);

//        this.displayPrompt();
//    }
//});

