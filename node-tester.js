'use strict';

//
// Node.js test harness... sloppy, terse and always changing...
//
// 2017-08-17 GOALS FOR TODAY
// 
// 1. Test SPECIAL calculations
//      Hijri -- fail
//      Friday 13 -- pass
//      Span
//      Hebrew
//      Christian
//      Season
//
// 2. Implement Season
// 3. Review How-To for accuracy and completeness
// 4. Check-in as check-point
// 5. Document PAD class
// 6. Create calendar utility class
// 6a. Write test harness (check for frameworks)
// 7. Re-structure project files: npm json, .gitignore, github check-in list
// 8. Check-in and sync with github
// 9. Update index-web and index-alexa (clean-up)
// 10. Publish to GoDaddy and Alexa
// 11. Do some performance checks
// 12. Start with RESTful API and parsing arguments
//

const fs = require('fs');
const repl = require('repl');
const PAD = require('./pageaday');
const Ymd = require('./padutil');
const xmlFullPath = "C:/Coding/GitHubRepos/PageADay/dataSamples/test.xml";

// Node.JS debug variables
var timer1 = "ElapsedTime";


var MyPAD = new PAD("");
var days = 1;

console.log("Running...");

var findOnly = "sunset";
var showFullPage = false;
var startDate = "2007-01-01";
var endDate = "2027-12-31";

console.log("Page-A-Day Test: Display '" + findOnly + "' from " + startDate + " to " + endDate + " using " + xmlFullPath + "\r");

MyPAD.initData(fs.readFileSync(xmlFullPath, { encoding: 'utf8' }));

console.time(timer1);

var dStart = (new Ymd(startDate)).toDate();
var dEnd = (new Ymd(endDate)).toDate();

for ( ; dStart <= dEnd; dStart.setDate(dStart.getDate() + 1)) {
    var result = MyPAD.generatePage((new Ymd(dStart)).toString());

    if (result.isValid === true) {
        var fmt = MyPAD.getFormattedResult(result, "WEB");

        if (fmt.holidays.indexOf(findOnly) === -1) {
            continue;
        }

        if (showFullPage) {
            console.log(fmt.ymdS.dow + ", " + fmt.ymdS.mm + " " + fmt.ymdS.dd + ", " + fmt.ymdS.yy + "\r");
            console.log("    Saying: " + fmt.saying + "\r");
            console.log("    Author: " + fmt.author + "\r");
            console.log("    Holidays: " + fmt.holidays + "\r");
            console.log("    Birthdays: " + fmt.birthdays + "\r");
            console.log("    Anniversaries: " + fmt.anniversaries + "\r");
        } else {
            console.log(result.ymd.toString() + ": " + fmt.ymdS.dow + ", " + fmt.ymdS.mm + " " + fmt.ymdS.dd + ", " + fmt.ymdS.yy + ": " + fmt.holidays + "\r");
        }
    }
}

console.log("...done.");
console.timeEnd(timer1);
console.log(process.memoryUsage());

process.exit();

console.log("Starting Page-A-Day Test Harness...");

var replServer = repl.start({ prompt: "Page-A-Day >" });

replServer.defineCommand('PADload', {
    help: "Load a Page-A-Day data file. Use full path.",
    action: function (arg) {
        if (!arg) {
            arg = xmlFullPath;
        }
        //this.write(`Loading ${arg}...`);
        console.log("Loading " + arg + "...");
        var xml = fs.readFileSync(arg, { encoding: 'utf8' });
        if (xml) {
            MyPAD.initData(xml);
            console.log("done.\n");
            console.log("Title: " + MyPAD.xml.title + ", Version: " + MyPAD.xml.version + "\n");
            //this.write(`done\n`);
            //this.write(`Title: ${MyPAD.xml.title}, Version: ${MyPAD.xml.version}\n`);
        } else {
            //this.write(`error.\n`);
            console.log("error.\n");
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('PADdays', {
    help: "Set the number of days to show. Default is 1",
    action: function(arg) {
        if (!arg) {
            days = 1;
        } else {
            days = arg;
        }
        console.log("Days set to " + days + ".");
        this.displayPrompt();
    }
});

replServer.defineCommand('PADdate', {
    help: "Set the start date using yyyy-mm-dd format",
    action: function (start) {
        if (!start) {
            start = (new Ymd(new Date())).toString();
        }
        if (days <= 0) {
            days = 1;
        }
        console.log ("Generating Page-A-Day starting at " + start + " and continuing for " + days + " day(s).\n");
        //this.write(`Generating Page-A-Day starting at ${start} and continuing for ${days} day(s).\n`);
        var startDate = new Date(start);
        var count = days;

        do {
            var result = MyPAD.generatePage((new Ymd(startDate)).toString());

            if (result.isValid === true) {
                var fmt = MyPAD.getFormattedResult(result, "WEB");

                // Only want to see Easter...
                if (fmt.holidays.indexOf("Easter") === -1) {
                    continue;
                }

                console.log(fmt.ymdS.dow + ", " + fmt.ymdS.mm + " " + fmt.ymdS.dd + ", " + fmt.ymdS.yy);
                console.log("    Saying: " + fmt.saying);
                console.log("    Author: " + fmt.author);
                console.log("    Holidays: " + fmt.holidays);
                console.log("    Birthdays: " + fmt.birthdays);
                console.log("    Anniversaries: " + fmt.anniversaries);
                //this.write(`${fmt.dDOW}, ${fmt.dMonth} ${fmt.dDay}, ${fmt.dYear}\n`);
                //this.write(`    Saying: ${fmt.saying}\n`);
                //this.write(`    Author: ${fmt.author}\n`);
                //this.write(`    Holidays: ${fmt.holidays}\n`);
                //this.write(`    Birthdays: ${fmt.birthdays}\n`);
                //this.write(`    Anniversaries: ${fmt.anniversaries}\n`);
            }

            startDate.setDate(startDate.getDate() + 1);
            count -= 1;

        } while (count > 0);

        this.displayPrompt();
    }
});

/*

Unit tests needed:

DATE MATCHING (years 2000 - 2030)
1. Easter
2. Hebrew holidays
3. Islamic holidays
4. Tax Day
5. One for each type of SPECIAL

OUTPUT FORMAT

Birthdays and Anniversaries:
1. Birthday with birth year
2. B
*/
