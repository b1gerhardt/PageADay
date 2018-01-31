/* jslint node: true */
/* jshint node: true */
/* eslint no-extra-parens: { "nestedBinaryExpressions": false } */

'use strict';

// TODO: Figure out how to do this correctly. Want to keep code working for browser, lambda and node.
if (typeof module !== 'undefined') {
    global.Ymd = require('./padutil');           // Kludge to get Ymd to global namespace. const, let, var don't work because of {} block
}
//const Ymd = require ('./padutil');

// PAD the Page-A-Day generator
// Written by Barry Gerhardt
// 2016-12-28
//
// This JS contains the Page-A-Day class, PAD. 
//


var PAD = function (data) {
    if (! (this instanceof PAD)) {
        return new PAD(data);
    }

    this.xml = {
        isValid: false,
        raw: "",
        title: "",
        version: "",
        pages: []
    };

    this.initData( data );
    this.initResult();
};

//
// PAD.initData -- Reset object with new XML data
//
// This function takes a read-only XML string and parses it into it's consituent XML sections
// Since this is a relatively expensive operation, it should be done only once for a particular data set.
// You can call with an empty string or undefined to clear the dataset from memory (subject to JS garbage collection)
//

PAD.prototype.initData = function (data, fDebug = false) {

    if (data && data.length > 0) {
        this.xml.isValid = true;
        this.xml.raw = data;            // Not used by the PAD "class" so you can delete 'data' with no negative effect
        this.xml.title = fakeDOM.getValue(data, "TITLE");
        this.xml.version = fakeDOM.getValue(data, "VERSION");
        this.xml.pages = fakeDOM.getValueArray(data, "PAGE");
        this.xml.normalized = [];       // Cache for parsed pages

        if (fDebug === true) {
            this.xml.tests = fakeDOM.getValueArray(data, "CASE");
        }
    } else {
        this.xml.isValid = false;
        this.xml.raw = void 0;
        this.xml.title = void 0;
        this.xml.version = void 0;
        this.xml.pages = void 0;
        this.xml.normalized = void 0;
    }

    return this.xml;
};

//
// PAD.initResult -- Initialize result data while preserving XML data
//
// Input is an ISO-type YYYY-MM-DD string containing the target date
// This function initializes the result object. This is done at the start of each call to PAD.getQuote
//

PAD.prototype.initResult = function (ymdStr) {
    this.result = {
        isValid: false,
        title: "",
        version: "",
        ymd: {},
        holidays: [],       // string
        birthdays: [],      // name: string, age: number
        anniversaries: [],  // name: string, age: number
        saying: "",
        author: "",
        sayingWeb: "",
        sayingSpoken: ""
    };

    this.result.ymd = new Ymd(ymdStr || new Date());

    return this.result
};


//
// PAD.generatePage -- Populate PAD.result with date for the target date (in ISO-type YYYY-MM-DD string format)
//
// Notes
// 1. PAD object must be initialized and data loaded (see PAD.initData())
// 2. Destroys existing PAD.result
// 3. Returns a reference to PAD.result for formatting or further processing.
//

PAD.prototype.generatePage = function (ymdStr) {
    var data = this.xml;
    var result = this.initResult(ymdStr);

    // basic sanity checks...
    if (!data || !data.isValid) {
        result.saying = "Error loading data...";
    } else {
        result.title = data.title;
        result.version = data.version;

        // XML Schema allows for data to be split into several sections. 
        // Flattening to a single call for now...
        this.generateSubPage(data, result, true);
    }

    return result;
};

//
// PAD.generateSubPage -- Search a single section of the data and add matches to PAD.result
//
// Notes
// 1. Assumes data and result have been initialized. 
// 2. Designed to be part of a larger loop that builds the entire result set so it does not initialize PAD.result
//

PAD.prototype.generateSubPage = function (data, result, bFindAll) {
    if (!data || data.isValid === false) {
        return;
    }

    var xmlPages = data.pages;
    var normalizedPages = data.normalized;

    if (!xmlPages || xmlPages.length === 0) {
        return;
    }

    // TODO: Rework as a JS "class" like Alexa intent handlers. (learn more on this)
    //
    // Would prefer to structure more like this (same as Alexa intent handlers):
    //   "WEEKOFMONTH": function ( thisPage, result.ymd ) { ... };
    //

    for (var i = 0; i < xmlPages.length; i++) {
        // Normalize data to simplify code later on...
        if (typeof normalizedPages[i] === 'undefined') {
            normalizedPages[i] = this.normalizePage(xmlPages[i]);
        }

        var thisPage = normalizedPages[i];

        if (thisPage.type === "IGNORE") {
            continue;
        }

        switch (thisPage.special) {
            case "IGNORE":
            case "COMMENT":
                continue;

            case "WEEKDAYOFMONTH":
            case "WEEKOFMONTH":
                if (isWeekOfMonth(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "LASTDAYOFMONTH":
            case "LASTWEEKDAYOFMONTH":
                if (isLastDayOfMonth(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "WEEKDAYONORAFTER":
                if (isWeekdayOnOrAfter(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "NEARESTWEEKDAY":
                if (isNearestWeekday(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "SPECIFICYEARS":
                if (isSpecificYear(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "CHRISTIAN":
                if (isChristianDate(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "HEBREW":
            case "JEWISH":
                if (isHebrewDate(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "ISLAMIC":
            case "MUSLIM":
            case "HIJRI":
                if (isHijriDate(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "SEASON":
                if (isSeason(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "SPAN":
                if (isSpan(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "FRIDAY13":
                if (isFriday13(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "LISTOFDATES":
                if (isListOfDates(thisPage, result.ymd) === true) {
                    break;
                }
                continue;

            case "FIXED":
            case "":
                /* falls through */
            default:
                if (isFixed(thisPage, result.ymd) === true) {
                    break;
                }
                continue;
        }

        // If you get here, you have a match and should populate the result object...
        this.addToResult(thisPage, result);

        if (bFindAll === false) {
            break;
        }
    }
};

//
// PAD.addToResult -- Add new data to the PAD.result object 
//

PAD.prototype.addToResult = function (page, result) {
    if (page.name.length !== 0) {
        var age = result.ymd.yy - page.yyFirst;
        var s = page.name + (page.atSunset === true ? " (at sunset)" : "");

        switch (page.type) {
            case "HOLIDAY":
            case "EVENT":
                result.holidays.push(s);
                break;

            case "BIRTHDAY":
                // Only add on dates on or after birth year (when known)
                if (isNaN(page.yyFirst) || age >= 0) {
                    result.birthdays.push({ name: s, age: age });
                }
                break;

            case "ANNIVERSARY":
                if (isNaN(page.yyFirst) || age >= 0) {
                    result.anniversaries.push({ name: s, age: age });
                }
                break;

            case "IGNORE":
            case "GENERAL":
                /* falls through */
            default:
                break;
        }
    }

    // Sayings and authors are singular -- first one wins.
    if (result.saying.length === 0) {
        result.saying = page.saying;
        result.sayingWeb = page.web;
        result.sayingSpoken = page.spoken;

        if (result.saying.length !== 0) {
            result.author = page.author;
        }
    }

    result.isValid = true;
};

//
// PAD.normalizePage -- Converts a raw XML page record to a cooked JS page object
//

PAD.prototype.normalizePage = function (xmlPage) {
    var page = {
        xml: xmlPage,
        type:    fakeDOM.getValue(xmlPage, "TYPE").toUpperCase(),
        name:    fakeDOM.getValue(xmlPage, "NAME"),
        saying:  fakeDOM.getValue(xmlPage, "SAYING"),
        author:  fakeDOM.getValue(xmlPage, "AUTHOR"),
        web:     fakeDOM.getValue(xmlPage, "WEB"),
        spoken:  fakeDOM.getValue(xmlPage, "SPOKEN"),
        special: fakeDOM.getValue(xmlPage, "SPECIAL").toUpperCase(),
        args: {},
        atSunset: false,
        yyFirst: Number.NaN,
        ymd: {}
    };

    page.ymd = new Ymd(parseInt(fakeDOM.getValue(xmlPage, "YEAR"), 10),
                       parseInt(fakeDOM.getValue(xmlPage, "MONTH"), 10) - 1,
                       parseInt(fakeDOM.getValue(xmlPage, "DAY"), 10))

    if (page.special.length > 0) {
        page.args = page.special.split(' ');
        page.special = page.args.shift();
    }

    // Handle origin year for Birthdays and Anniversaries

    if (page.special !== "FIXED" && (page.type === "BIRTHDAY" || page.type === "ANNIVERSARY")) {
        page.yyFirst = page.ymd.yy;
        page.ymd.yy = Number.NaN;
        page.ymd.dow = Number.NaN;
    }

    return page;
};

//
// PAD.normalizeTest -- Converts an XML test case record to a JS object (used only for debugging)
//

PAD.prototype.normalizeTest = function (xmlTest) {
    var test = {
        xml: xmlTest,
        name: fakeDOM.getValue(xmlTest, "NAME"),
        dateStr: fakeDOM.getValue(xmlTest, "DATE"),
        dow: fakeDOM.getValue(xmlTest, "DOW"),
        holidays: fakeDOM.getValueArray(xmlTest, "HOLIDAY"),
        birthdays: fakeDOM.getValueArray(xmlTest, "BIRTHDAY"),
        anniversaries: fakeDOM.getValueArray(xmlTest, "ANNIVERSARY"),
        saying: fakeDOM.getValue(xmlTest, "SAYING"),
        author: fakeDOM.getValue(xmlTest, "AUTHOR"),
        web: fakeDOM.getValue(xmlTest, "WEB"),
        spoken: fakeDOM.getValue(xmlTest, "SPOKEN")
    };

    return test;
};

///////////////////////////////////////////////////////
//
// Format result for various consumption styles
//
///////////////////////////////////////////////////////

PAD.prototype.getFormattedResult = function (result, fmt) {
    var fmtResult = {
        title: "",
        version: "",
        date: "",
        ymdS: { dd: "", mm: "", yy: "", dow: "" },
        holidays: "",
        birthdays: "",
        anniversaries: "",
        saying: "",
        author: ""
    };

    if (result.isValid) {
        fmtResult.title = result.title;
        fmtResult.version = result.version;
        fmtResult.date = getFormattedDate(result.ymd, fmt);
        fmtResult.ymdS.dd = getFormattedDate(result.ymd, "DAY");
        fmtResult.ymdS.mm = getFormattedDate(result.ymd, "MONTH");
        fmtResult.ymdS.yy = getFormattedDate(result.ymd, "YEAR");
        fmtResult.ymdS.dow = getFormattedDate(result.ymd, "DOW");
        fmtResult.holidays = getFormattedHoliday(result.holidays, fmt);
        fmtResult.birthdays = getFormattedBirthday(result.birthdays);
        fmtResult.anniversaries = getFormattedAnniversary(result.anniversaries);
        fmtResult.saying = getFormattedSaying(result, fmt);
        fmtResult.author = result.author;
    }
    return fmtResult;
};

function getFormattedSaying (result, fmt) {
    var s = "";

    if (result && result.isValid) {
        switch (fmt) {
            case "SPOKEN":
                s = result.sayingSpoken;
                break;

            case "WEB":
                s = result.sayingWeb;
                break;
        }

        if (s.length === 0) {
            s = result.saying;
        }

        if (fmt === "SPOKEN" && result.saying.length > 0) {
            if (result.author.length > 0) {
                s = "As " + result.author + " says..." + s + ".";
            } else {
                s = s + ".";
            }
        }
    }
    return s;
}

function getFormattedDate (ymd, fmt) {
    var dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var s = "";

    switch (fmt) {
        // For CSV, output as "YEAR,MONTH,DAY,MONTH-NAME,DAY-OF-WEEK"
        // Example: "2017,5,12,May,Friday"
        case "CSV":
            s = ymd.yy + "," + ymd.mm + "," + ymd.dd + "," + monthNames[ymd.dd] + "," + dowNames[ymd.dow];
            break;

        // Suitable for speech output
        // Example: "Friday May 12th" if current year and "Friday May 12th 2017" otherwise.
        case "SPOKEN":
            s = dowNames[ymd.dow] + " " + monthNames[ymd.mm] + " " + this.getFormattedOrdinal(ymd.dd);

            if ((new Date()).getFullYear() !== ymd.yy) {
                s += " " + ymd.yy;
            }
            break;

        case "DAY":
            s = ymd.dd;
            break;

        case "MONTH":
            s = monthNames[ymd.mm];
            break;

        case "YEAR":
            s = ymd.yy;
            break;

        case "DOW":
            s = dowNames[ymd.dow];
            break;

        case "WEB":
        /* falls through */
        default:
            s = dowNames[ymd.dow] + ", " + monthNames[ymd.mm] + ymd.dd + ", " + ymd.yy;
            break;
    }
    return s;
}

function getFormattedHoliday (holidays, fmt) {
    // Sample output:
    //     "National Pancake Day and First Day of Spring"
    //

    var s = "";

    if (holidays.length) {
        var remaining = holidays.length;

        while ( remaining ) {
            s += holidays[holidays.length - remaining];

            if (holidays.length === 1) {
                break;
            }

            remaining -= 1;

            if (remaining === 1) {
                if (holidays.length > 2) {
                    s += ",";
                }
                s += " and ";
            } else if (remaining > 1) {
                s += ", ";
            }
        }
        s += ".";
    }
    return s;
}

function getFormattedBirthday(birthdays) {
    // Sample output:
    //     "Joe (30), Ann, and Bob."
    //
    // TODO: Filter out negative age birthdays
    //

    var s = "";

    if (birthdays.length) {
        // s += "Birthdays: "; // UI layer adds this.

        var remaining = birthdays.length;

        while ( remaining ) {
            var b = birthdays[birthdays.length - remaining];

            s += b.name;

            if (!isNaN(b.age)) {
                s += " (" + getFormattedOrdinal(b.age) + ")";
            }

            if (birthdays.length === 1) {
                break;
            }

            remaining -= 1;

            if (remaining === 1) {
                if (birthdays.length > 2) {
                    s += ",";
                }
                s += " and ";
            } else if (remaining > 1) {
                s += ", ";
            }
        }
        s += ".";
    }

    return s;
}

function getFormattedAnniversary (anniversaries) {
    // Sample output:
    //     "Joe and Sally (30 years), Billy and Ann, and Bob and Alice."
    //
    // TODO: Filter out negative age anniversaries
    //

    var s = "";

    if (anniversaries.length) {
        // s += "Anniversaries: ";  // UI layer adds this.

        var remaining = anniversaries.length;

        while ( remaining ) {
            var a = anniversaries[anniversaries.length - remaining];

            s += a.name;

            if (!isNaN(a.age)) {
                s += " (" + a.age + " years)";
            }

            if (anniversaries.length === 1) {
                break;
            }

            remaining -= 1;

            if (remaining === 1) {
                if (anniversaries.length > 2) {
                    s += ",";
                }
                s += " and ";
            } else if (remaining > 1) {
                s += ", ";
            }
        }
        s += ".";
    }
    return s;
}

function getFormattedOrdinal (n) {

    var ORDINAL_AGE = [
        '0th',
        '1st',
        '2nd',
        '3rd',
        '4th',
        '5th',
        '6th',
        '7th',
        '8th',
        '9th',
        '10th',
        '11th',
        '12th',
        '13th',
        '14th',
        '15th',
        '16th',
        '17th',
        '18th',
        '19th'
    ];

    //return (n >= 20) ? return Math.floor ( n / 10 ).toString + ORIGINAL_AGE[ Math.floor ( n % 10 )] : ORIGINAL_AGE[n];
    var s = "";

    if (n >= 20) {
        s = Math.floor(n / 10).toString();
        n = Math.floor(n % 10);
    }

    return s + ORDINAL_AGE[n];
}

///////////////////////////////////////////////////////
//
// SPECIAL Keyword parsing functions (local to PAD)
//
// Terms:
//      target date -- The date we're building a page-a-day for
//      event date  -- The date represented in the data set.
//      page        -- The specific data record being evaluated
//
///////////////////////////////////////////////////////

//
// isFixed
//
// Syntax: FIXED
//
// Compates the target date to a list of specific event dates in YYYY-MM-DD format
//

function isFixed (page, ymd) {
    return matchOrNaN(page.ymd.mm, ymd.mm, page.ymd.dd, ymd.dd, page.ymd.yy, ymd.yy);
}

//
// isWeekDayofMonth
// 
// Syntax: WEEKOFMONTH week dow [delta]
//
// the Nth occurrence of a specific day of week in a month.
// Ex: 2nd Monday in August. SPECIAL=<Occurrence1-6> <DayOfWeek0-6> [<delta>]
//
function isWeekOfMonth (page, ymd) {
    if (page.args.length === 2 || page.args.length === 3) {
        var specialDate = ymd.toDate();

        // Account for the offset by faking like we're looking for the non-offset day.
        if (page.args.length === 3) {
            specialDate.setDate(specialDate.getDate() - parseInt(page.args[2], 10));
        }

        // Need to check month here since some deltas might move the month.
        if (specialDate.getMonth() === page.ymd.mm &&
            parseInt(page.args[1], 10) % 7 === specialDate.getDay() &&
            parseInt(page.args[0], 10) === Math.ceil(specialDate.getDate() / 7)) {
            return true;  // Match
        }
    }
    return false;
}

//
// isLastDayOfMonth 
//
// Syntax: LASTDAYOFMONTH dow
//
// The last occurence of a specific day of week in the month.
//

function isLastDayOfMonth (page, ymd) {
    if (ymd.mm === page.ymd.mm && page.args.length === 1 && parseInt(page.args[0], 10) === ymd.dow) {
        var specialDate = ymd.toDate();

        specialDate.setDate(specialDate.getDate() + 7);

        if (specialDate.getMonth() !== ymd.mm) {
            return true;
        }
    }
    return false;
}

//
// isWeekdayOnOrAfter 
//
// Syntax: WEEKDAYONORAFTER
//
// Events that occur on the first weekday on or after a specified date
//

function isWeekdayOnOrAfter (page, ymd) {
    // Must occur on a weekday (TODO BUG: Requires tDate to be 3 or larger.)
    // TODO BUG: Need to improve tax day calculations. For example, Tuesday April 18 is tax day in 2017 due to a Monday holiday.

    // Same month and target is not a weekend
    if (ymd.mm === page.ymd.mm && ymd.dow !== 0 && ymd.dow !== 6) {
        // Target is on a weekday. Check for a natural match
        if (ymd.dd === page.ymd.dd) {
            return true;
        }
        // If target is Monday, adjust event date and check for match
        if (ymd.dow === 1 && (1 === ymd.dd - page.ymd.dd || 2 === ymd.dd - page.ymd.dd)) {
            return true;
        }
    }
    return false;
}

//
// isNearestWeekday
//
// Syntax: NEARESTWEEKDAY [observed] [actual | exclusive]
//
// Events that are observed on the nearest weekday when they fall on a weekend
//

function isNearestWeekday (page, ymd) {
    // Is it a natural match?
    if (matchOrNaN(page.ymd.mm, ymd.mm, page.ymd.dd, ymd.dd, page.ymd.yy, ymd.yy)) {
        // Filter out natural matches when exclusive flag is used
        if (page.args.indexOf("EXCLUSIVE") === -1) {
            if (ymd.dow > 0 && ymd.dow < 6) {
                return true;
            } else if (page.args.indexOf("ACTUAL") !== -1) {
                page.name += " (actual)";
                return true;
            }
        }

    // If target is Monday or Friday, check if moving event creates a match
    } else if (ymd.dow === 1 || ymd.dow === 5) {
        var specialDate = ymd.toDate();

        if (ymd.dow === 1) {
            specialDate.setDate(specialDate.getDate() - 1);
        } else if (ymd.dow === 5) {
            specialDate.setDate(specialDate.getDate() + 1);
        }
        if (matchOrNaN(page.ymd.mm, specialDate.getMonth(), page.ymd.dd, specialDate.getDate(), page.ymd.yy, specialDate.getYear())) {
            if (page.args.indexOf("OBSERVED") !== -1) {
                page.name += " (observed)";
            }
            return true;
        }
    }
    return false;
}

//
// isSpecificYear
//
// Syntax: SPECIFICYEARS start interval [end]
//
// Events that occur only on specific years
//

function isSpecificYear (page, ymd) {
    if (page.args.length === 2 || (page.args.length === 3 && ymd.yy <= parseInt(page.args[2], 10))) {
        if (ymd.yy >= parseInt(page.args[0], 10) && ymd.mm === page.ymd.mm && ymd.dd === page.ymd.dd) {
            if ((ymd.yy - parseInt(page.args[0], 10)) % parseInt(page.args[1], 10) === 0) {
                return true;
            }
        }
    }
    return false;
}

//
// isChristianHoliday
//
// Syntax: CHRISTIAN holiday [delta]
//
// Dates based on Christian Holidays
//

function isChristianDate (page, ymd) {
    var delta = 0;
    var eventDate;

    if (page.ymd.yy === ymd.yy) {     // Allow filtering on year
        switch (page.args[0]) {
            case "CHRISTMAS":
                eventDate = (new Ymd(ymd.yy, 11, 25)).toDate();
                break;

            case "ADVENT":      // 4th Sunday before Christmas
                eventDate = (new Ymd(ymd.yy, 11, 25)).toDate();

                if (eventDate.getDay() === 0) {
                    delta -= 7 * 4;
                } else {
                    delta -= 7 * 3 + eventDate.getDay();
                }
                break;

            case "EASTER":
                eventDate = getEasterW(ymd.yy);
                break;
        }

        if (eventDate) {
            if (page.args.length >= 2) {
                delta += parseInt(page.args[1], 10);
            }

            eventDate.setDate(eventDate.getDate() + delta);

            return matchOrNaN(eventDate.getMonth(), ymd.mm, eventDate.getDate(), ymd.dd, eventDate.getFullYear(), ymd.yy);
        }
    }
    return false;
}

//
// isHebrewDate
//
// Syntax: HEBREW [delayed] [sunset]
//      Note: MONTH and DAY are interpreted as Hebrew month number and date
//
// Dates based on the Hebrew calendar
//

function isHebrewDate(page, ymd) {
    var delayed = page.args.indexOf("DELAYED") === -1 ? false : true;
    var sunset = page.args.indexOf("SUNSET") === -1 ? false : true;
    var normalizedDOW = (ymd.dow + (sunset === true ? 6 : 0)) % 7;      // Normalize target dow to simplify logic below

    // If it's Saturday and the delayed flag is set, there cannot be a match.
    if (delayed && normalizedDOW === 6) {
        return false;
    }

    var jd = gregorianToJulian(ymd.yy, ymd.mm, ymd.dd) + (sunset ? 1 : 0);
    var hd = julianToHebrew(jd);

    if (matchOrNaN(page.ymd.yy, hd.yy, page.ymd.mm, hd.mm, page.ymd.dd, hd.dd)) {
        page.atSunset = sunset;
        return true;
    }

    // If today is Sunday and the delayed flag is set, check if the day before was a match
    if (delayed && normalizedDOW === 0) {
        hd = julianToHebrew(jd - 1);

        if (matchOrNaN(page.ymd.yy, hd.yy, page.ymd.mm, hd.mm, page.ymd.dd, hd.dd)) {
            page.atSunset = sunset;
            return true;
        }
    }
    return false;
}

//
// isHijriDate
//
// Syntax: HIJRI [sunset]
//      Note: MONTH and DAY are interpreted as Hijri month number and date
//
// Dates based on the Hijri calendar
//

function isHijriDate(page, ymd) {
    var sunset = page.args.indexOf("SUNSET") === -1 ? false : true;
    var jd = gregorianToJulian(ymd.yy, ymd.mm, ymd.dd) + (sunset ? 1 : 0);
    var hd = julianToIslamic(jd);
    
    if (matchOrNaN(page.ymd.yy, hd.yy, page.ymd.mm, hd.mm, page.ymd.dd, hd.dd)) {
        page.atSunset = sunset;
        return true;
    }
    return false;
}

//
// isSeason
//
// Syntax: SEASON [north | south] spring | summer | fall | winter
//
// Matches the first day of the specified season.
//

function isSeason(page, ymd) {
    var season = Number.NaN;
    var offset = 0;

    if (page.args.some(function (s) { return s === "SOUTH" }) === true) {
        offset = 2;
    }

    for (var i = page.args.length - 1; i >= 0; i -= 1) {
        switch ( page.args[i] ) {
            case "MARCH":
            case "MAR":
                offset = 0;
                /* falls through */

            case "SPRING":
                season = 0;
                break;

            case "JUNE":
            case "JUN":
                offset = 0;
                /* falls through */

            case "SUMMER":
                season = 1;
                break;

            case "AUGUST":
            case "AUG":
                offset = 0;
                /* falls through */

            case "FALL":
            case "AUTUMN":
                season = 2;
                break;

            case "DECEMBER":
            case "DEC":
                offset = 0;
                /* falls through */

            case "WINTER":
                season = 3;
                break;
        }
    }

    var event = getEquinox((season + offset) % 4, ymd.yy);

    // BUG: My answers don't match WolframAlpha. Likely a timezone thing.
    // Since this is a Page-A-Day calendar, preferred behavior is to match the first full day of the season
    return matchOrNaN(ymd.yy, event.yy, ymd.mm, event.mm, ymd.dd, event.dd);
}

//
// isSpan
//
// Syntax: SPAN days
//
// Returns a match for any day in the range
//

function isSpan(page, ymd) {
    if (page.args.length === 1) {
        var startDate = (new Ymd(isNaN(page.ymd.yy) ? ymd.yy : page.ymd.yy, page.ymd.mm, page.ymd.dd)).toDate();
        var endDate = new Date(startDate);
        var targetDate = ymd.toDate();
        var delta = parseInt(page.args[0], 10) - 1;

        if (delta >= 0) {
            endDate.setDate(endDate.getDate() + delta);

            if ( targetDate >= startDate && targetDate <= endDate ) {
                return true;
            }
        }
    }
    return false;
}

//
// isFriday13
//
// Syntax: FRIDAY13
//
// Matches when the target date is Friday the 13th
//

function isFriday13(page, ymd) {
    if (ymd.dd === 13 && ymd.dow === 5) {
        return matchOrNaN(page.ymd.mm, ymd.mm, page.ymd.dd, ymd.dd, page.ymd.yy, ymd.yy);
    }
    return false;
}

//
// isListOfDates
//
// Syntax: LISTOFDATES date [...]
//
// Compares the target date to a list of specific event dates in YYYY-MM-DD format
//

function isListOfDates (page, ymd) {
    var s = ymd.toString();
    if (page.args.indexOf(s) !== -1) {
        return true;
    }
    return false;
}

//
// Pass in comparison pairs. Returns true if, for each pair, if first is NaN or if the numbers match
//

function matchOrNaN() {
    if (arguments.length % 2 !== 0) {        // Even number of arguments is required
        return false;
    }
    for (var i = 0; i < arguments.length; i += 2) {
        if (!isNaN(arguments[i]) && parseInt(arguments[i], 10) !== parseInt(arguments[i + 1], 10)) {
            return false;
        }
    }

    return true;
}


// Internal support functions

//
// Equinoxes and Solstices
//
//      Spring Equinox (March), Summer Solstice (June), Autumn Equinox (August), Winter Solstice (December)
//

// 
// getEquinox -- Returns YMD formatted date of the Equinox or Solstice specified. Assumes northern hemisphere.
//               For southern hemisphere, just reverse the seasons.
//
//  season: 0 = Spring (March)
//          1 = Summer (June)
//          2 = Autumn (August)
//          3 = Winter (December)
//  year: Gregorian year
//

function getEquinox(season, year) {
    var jd = getJulianEquinox(season, year);
    var d = julianToGregorian(jd);
    var ymd = new Ymd(d);

    return new Ymd(julianToGregorian(getJulianEquinox(season, year)));

}


function getEasterW (year) {
    // Calculates Western Easter
    // Adapted from https://en.wikipedia.org/wiki/Computus#Algorithms

    var a, b, c;
    var rMonth, rDate;

    // Dates before 1900 and after 2299 are not supported...
    if (year < 1900) { year = 1900; }
    else if (year > 2299) { year = 2299; }

    a = year % 19;

    if (year < 2200) {
        b = (11 * a + 5) % 30;
    } else {
        b = (11 * a + 4) % 30;
    }

    if (b === 0 || (b === 1 && a > 10)) {
        c = b + 1;
    } else {
        c = b;
    }
    if (c >= 1 && c <= 19) {
        rMonth = 3;  // April
    } else /* if ( c >= 20 && c <= 29 ) */ {
        rMonth = 2;  // March
    }
    rDate = (50 - c) % 31;

    var result = new Date(year, rMonth, rDate);
    result.setDate(result.getDate() + (7 - result.getDay()));       // Align to next Sunday (even if it falls on a Sunday)

    return result;
}

// Various Calendar system conversion functions
// Adapted from http://www.math.harvard.edu/computing/javascript/Calendar/
// Derived from Meeus, Jean. Astronomical Algorithms . Richmond: Willmann-Bell, 1991. ISBN 0-943396-35-2. 


/*  MOD  --  Modulus function which works for non-integers.  */

function calMod(a, b) {
    return a - (b * Math.floor(a / b));
}

//  AMOD  --  Modulus function which returns numerator if modulus is zero

function calAmod(a, b) {
    return calMod(a - 1, b) + 1;
}

//  Julian / Gregorian Conversion ===================
// GREGORIAN_EPOCH = 1721425.5;

// Is it leap year? Credit to Kevin P. Rice
function gregorianIsLeap(year) {
    // Copied from https://stackoverflow.com/questions/3220163/how-to-find-leap-year-programatically-in-c/11595914#11595914
    return (year & 3) === 0 && ((year % 25) !== 0 || (year & 15) === 0);
}

// Convert Gregorian year, month (0-based), day to Julian Date
function gregorianToJulian(year, month, day) {
    month += 1;                 // Convert to 1-based month
    var yminus = year - 1;      // Simplify calculations below
    return 1721424.5 + (365 * yminus) + Math.floor(yminus / 4) - Math.floor(yminus / 100) + Math.floor(yminus / 400) +
         Math.floor((((367 * month) - 362) / 12) + ((month <= 2) ? 0 :(gregorianIsLeap(year) ? -1 : -2)) + day);
}

// Convert Julian date to Javascript Date (Gregorian).
function julianToGregorian(jd) {
    var wjd = Math.floor(jd - 0.5) + 0.5;           // Always align to 0.5 (Julian days start at noon)
    var depoch = wjd - 1721425.5;                   // Delta from GREGORIAN_EPOCH
    var quadricent = Math.floor(depoch / 146097);
    var dqc = calMod(depoch, 146097);
    var cent = Math.floor(dqc / 36524);
    var dcent = calMod(dqc, 36524);
    var quad = Math.floor(dcent / 1461);
    var dquad = calMod(dcent, 1461);
    var yindex = Math.floor(dquad / 365);
    var year = (quadricent * 400) + (cent * 100) + (quad * 4) + yindex;

    if (!((cent === 4) || (yindex === 4))) {
        year++;
    }

    var yearday = wjd - gregorianToJulian(year, 0, 1);
    var leapadj = ((wjd < gregorianToJulian(year, 2, 1)) ? 0 :
                   (gregorianIsLeap(year) ? 1 : 2));
    var month = Math.floor((((yearday + leapadj) * 12) + 373) / 367) - 1; // 0-based month for JS
    var day = (wjd - gregorianToJulian(year, month, 1)) + 1;

    return new Date(year, month, day);
    
}

// Julian / Hebrew Conversion ===================
var HEBREW_EPOCH = 347995.5;

// Hebrew leap year utilities
function hebrewIsLeap(year) {
    return calMod(((year * 7) + 1), 19) < 7;
}

function hebrewYearMonths(year) {
    return hebrewIsLeap(year) ? 13 : 12;
}

//  Test for delay of start of new year and to avoid
//  Sunday, Wednesday, and Friday as start of the new year.

function hebrewDelay1(year) {
    var months = Math.floor(((235 * year) - 234) / 19);
    var parts = 12084 + (13753 * months);
    var day = (months * 29) + Math.floor(parts / 25920);

    if (calMod((3 * (day + 1)), 7) < 3) {
        day++;
    }
    return day;
}

//  Check for delay in start of new year due to length of adjacent years

function hebrewDelay2(year) {
    var last = hebrewDelay1(year - 1);
    var present = hebrewDelay1(year);
    var next = hebrewDelay1(year + 1);

    return ((next - present) === 356) ? 2 : (((present - last) === 382) ? 1 : 0);
}

//  How many days are in a Hebrew year ?

function hebrewYearDays(year) {
    return hebrewToJulian(year + 1, 7, 1) - hebrewToJulian(year, 7, 1);
}

//  How many days are in a given month of a given year

function hebrewMonthDays(year, month) {
    //  First of all, dispose of fixed-length 29 day months

    if (month === 2 || month === 4 || month === 6 || month === 10 || month === 13) {
        return 29;
    }

    //  If it's not a leap year, Adar has 29 days

    if (month === 12 && !hebrewIsLeap(year)) {
        return 29;
    }

    //  If it's Heshvan, days depend on length of year

    if (month === 8 && calMod(hebrewYearDays(year), 10) !== 5) {
        return 29;
    }

    //  Similarly, Kislev varies with the length of year

    if (month === 9 && (calMod(hebrewYearDays(year), 10) === 3)) {
        return 29;
    }

    //  Nope, it's a 30 day month

    return 30;
}

//  Finally, wrap it all up into...

// Convert Hebrew year, month (1 based) and day to Julian Date
function hebrewToJulian(year, month, day) {
    var months = hebrewYearMonths(year);
    var jd = HEBREW_EPOCH + hebrewDelay1(year) + hebrewDelay2(year) + day + 1;
    var mon;

    if (month < 7) {
        for (mon = 7; mon <= months; mon++) {
            jd += hebrewMonthDays(year, mon);
        }
        for (mon = 1; mon < month; mon++) {
            jd += hebrewMonthDays(year, mon);
        }
    } else {
        for (mon = 7; mon < month; mon++) {
            jd += hebrewMonthDays(year, mon);
        }
    }

    return jd;
}

// Convert Julian Date to Hebrew Date. (Note: This is an expensive function)
function julianToHebrew(jd) {
    jd = Math.floor(jd) + 0.5;

    var count = Math.floor(((jd - HEBREW_EPOCH) * 98496.0) / 35975351.0);
    var year = count - 1;
    for (var i = count; jd >= hebrewToJulian(i, 7, 1); i++) {
        year++;
    }

    var first = (jd < hebrewToJulian(year, 1, 1)) ? 7 : 1;
    var month = first;
    for (i = first; jd > hebrewToJulian(year, i, hebrewMonthDays(year, i)); i++) {
        month++;
    }
    var day = (jd - hebrewToJulian(year, month, 1)) + 1;

    return {
        yy: year,
        mm: month - 1,              // Convert to 0-based for Javascript
        dd: day
    };
}

// Julian / Islamic Conversion ===================
var ISLAMIC_EPOCH = 1948439.5;

function islamicIsLeap(year){
    return (((year * 11) + 14) % 30) < 11;
}

// Convert Islamic date to Julian
function islamicToJulian(year, month, day) {
    return (day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 +
            Math.floor((3 + (11 * year)) / 30) + ISLAMIC_EPOCH) - 1;
}

// Convert Julian date to Islamic
function julianToIslamic(jd) {
    var year, month, day;

    jd = Math.floor(jd) + 0.5;

    year = Math.floor(((30 * (jd - ISLAMIC_EPOCH)) + 10646) / 10631);
    month = Math.min(12, Math.ceil((jd - (29 + islamicToJulian(year, 1, 1))) / 29.5) + 1);
    day = (jd - islamicToJulian(year, month, 1)) + 1;
    return {
        yy: year,
        mm: month - 1,              // Convert to 0-based for Javascript
        dd: day
    };
}

// Equinox Calculation ===================

/*  EQUINOX  --  Determine the Julian Ephemeris Day of an
                 equinox or solstice from a Gregorian year.
                 The "which" argument selects the item to be computed:
                    0   March equinox
                    1   June solstice
                    2   September equinox
                    3   December solstice

*/

//  Periodic terms to obtain true time
var EquinoxpTerms = [
    485, 324.96, 1934.136,
    203, 337.23, 32964.467,
    199, 342.08, 20.186,
    182, 27.85, 445267.112,
    156, 73.14, 45036.886,
    136, 171.52, 22518.443,
    77, 222.54, 65928.934,
    74, 296.72, 3034.906,
    70, 243.58, 9037.513,
    58, 119.81, 33718.147,
    52, 297.17, 150.678,
    50, 21.02, 2281.226,
    45, 247.54, 29929.562,
    44, 325.15, 31555.956,
    29, 60.93, 4443.417,
    18, 155.12, 67555.328,
    17, 288.79, 4562.452,
    16, 198.04, 62894.029,
    14, 199.76, 31436.921,
    12, 95.39, 14577.848,
    12, 287.11, 31931.756,
    12, 320.81, 34777.259,
    9, 227.73, 1222.114,
    8, 15.45, 16859.074
];

var JDE0tab1000 = [
    [1721139.29189, 365242.13740, 0.06134, 0.00111, -0.00071],
    [1721233.25401, 365241.72562, -0.05323, 0.00907, 0.00025],
    [1721325.70455, 365242.49558, -0.11677, -0.00297, 0.00074],
    [1721414.39987, 365242.88257, -0.00769, -0.00933, -0.00006]
];

var JDE0tab2000 = [
    [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
    [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003],
    [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
    [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032]
];

function getJulianEquinox(which, year) {
    var deltaL, i, j, JDE0, JDE0tab, S, T, W, Y;

    // Initialise terms for mean equinox and solstices.  
    // We have two sets: one for years prior to 1000 and a second for subsequent years.

    if (year < 1000) {
        JDE0tab = JDE0tab1000;
        Y = year / 1000;
    } else {
        JDE0tab = JDE0tab2000;
        Y = (year - 2000) / 1000;
    }

    which %= 4;

    JDE0 = JDE0tab[which][0] +
        (JDE0tab[which][1] * Y) +
        (JDE0tab[which][2] * Y * Y) +
        (JDE0tab[which][3] * Y * Y * Y) +
        (JDE0tab[which][4] * Y * Y * Y * Y);

    T = (JDE0 - 2451545.0) / 36525;
    W = (35999.373 * T) - 2.47;
    deltaL = 1 +
            (0.0334 * Math.cos((W * Math.PI) / 180.0)) +
            (0.0007 * Math.cos((2 * W * Math.PI) / 180.0));

    //  Sum the periodic terms for time T

    S = 0;
    for (i = j = 0; i < 24; i++) {
        S += EquinoxpTerms[j] * Math.cos((EquinoxpTerms[j + 1] +
            (EquinoxpTerms[j + 2] * T)) * Math.PI / 180);
        j += 3;
    }

    return JDE0 + ((S * 0.00001) / deltaL);
}



//
// extremely cheap XML searching functions. 
// Extracts a single element or an array of elements enclosed by the tag. Extracted text may contain sub-tags.
// Works for XML with and without namespace decorations 
//
var fakeDOM = (function () {
    return {
        getValue: function (data, tagname) {
            var myRe = new RegExp( "<" + "(?:.*:)?" + tagname + ">([\\\s\\\S]*?)<\/" + "(?:.*:)?" + tagname + ">", "im" );

            var result = myRe.exec(data);
            return (result === null) ? "" : result[1];
        },
        getValueArray: function (data, tagname) {
            var myRe = new RegExp( "<" + "(?:.*:)?" + tagname + ">[\\\s\\\S]*?<\/" + "(?:.*:)?" + tagname + ">", "img" );

            //return data.match(myRe);

            //console.log("getValueArray(raw): " + tagname + "\r\n" + result + "\r\n============");
            var result = data.match(myRe);
            // TODO: Trim XML from each element of resulting array. 
            // BUT: Can't do it since there seems to be a problem with node or my install. 
            // Enabling any of the below code results in a random parsing error not related to the added code
            //var i, j;
            //for (i = 0; i < result.length; i += 1) {
            //    j = myRe.exec(result[i]);
            //    console.log(j);
            //    //result[i] = j[1];
            //}

            //result.every((v, i) => result[i] = myRe.exec(v)[1]);
            //console.log("getValueArray(cooked): " + tagname + "\r\n" + result + "\r\n============");

            return result;
        }
    };
})();


// This code is run in both a client-side browser and server-side node.js. 
// When loaded with a nodes.js "required" statement, module is declared and this assignment helps control scope.
// When loaded with a browser script statement, module is not declared.
if ( typeof module !== 'undefined' ) {
    module.exports = PAD;
}
