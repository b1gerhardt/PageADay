/* jslint node: true */
/* jshint node: true */
/* eslint no-extra-parens: { "nestedBinaryExpressions": false } */

'use strict';

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
//

PAD.prototype.initData = function (data) {

    if (data && data.length > 0) {
        this.xml.isValid = true;
        this.xml.raw = data;
        this.xml.title = fakeDOM.getValue(data, "TITLE");
        this.xml.version = fakeDOM.getValue(data, "VERSION");
        this.xml.pages = fakeDOM.getValueArray(data, "PAGE");
    }

    return this.xml;
};

//
// PAD.initResult -- Initialize result data while preserving XML data
//
// This function initializes the result object. This is done at the start of each call to PAD.getQuote
//

PAD.prototype.initResult = function (d) {
    this.result = {
        isValid: false,
        title: "",
        version: "",
        date: undefined,
        holidays: [],      // string
        birthdays: [],     // name: string, age: number
        anniversaries: [], // name: string, age: number
        saying: "",
        author: "",
        sayingWeb: "",
        sayingSpoken: ""
    };
    this.result.date = d || new Date(Date.now());

    return this.result;
};

// NOTE: All date work is done in the local time zone. This ensures the user gets the date they expect
// These helper functions are used to make working in the local time zone easier

// Return an ISO-like string using local time instead of GMT. Truncate to just the date.
PAD.prototype.toISOStringNoTZ = function(d) {
    var noTZ = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000);

    return noTZ.toISOString().substr(0, 10);
};

// Set GMT to be midnight on the local time day (simplifies date handling so everything is GMT)
PAD.prototype.getDateNoTZ = function (d) {
    d.setTime(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
    return d;
};

PAD.prototype.getQuote = function (d) {
    var data = this.xml;
    //var data   = this.xmlRaw;
    var result = this.initResult(d);

    // basic sanity checks...
    if (!data || !data.isValid) {
        result.saying = "Error loading data...";
    } else {
        result.title = data.title;
        result.version = data.version;

        // XML schema allows for HOLIDAYS, BIRTHDAYS, ANNIVERSARIES and GENERAL dates to be in separate sections
        // Since we're using a simplified, Fake DOM, we can pass the entire XML data set and it will parse out all PAGE entries.
        // This saves some parsing.
        // TODO: But, doesn't guarantee the order is preserved so may need to revisit this.
        this.parseSection(data, result, true);
    }

    //console.log(result.title + ", " + result.version + ", " + result.saying + " (isValid=" + result.isValid + ")");
    return result;
};

PAD.prototype.parseSection = function (data, result, bFindAll) {
    if (!data || data.isValid === false) {
        return;
    }

    var xmlPages = data.pages;

    if (!xmlPages || xmlPages.length === 0) {
        return;
    }

    // TODO: Rework as a JS "class" like Alexa intent handlers. (learn more on this)
    for (var i = 0; i < xmlPages.length; i++) {
        // Normalize data to simplify code later on...
        var thisPage = this.normalizePage (xmlPages[i], result.date);

        switch (thisPage.special) {
            case "IGNORE":
            case "COMMENT":
                continue;

            case "WEEKDAYOFMONTH":
            case "WEEKOFMONTH":
                if (isWeekOfMonth(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "LASTDAYOFMONTH":
            case "LASTWEEKDAYOFMONTH":
                if (isLastDayOfMonth(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "WEEKDAYONORAFTER":
                if (isWeekdayOnOrAfter(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "NEARESTWEEKDAY":
                if (isNearestWeekday(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "SPECIFICYEARS":
                if (isSpecificYear(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "CHRISTIAN":
                if (this.isChristianDate(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "HEBREW":
            case "JEWISH":
                if (isHebrewDate(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "ISLAMIC":
            case "MUSLIM":
            case "HIJRI":
                if (isHijriDate(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "SEASON":
                if (isSeason(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "SPAN":
                if (isSpan(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "FRIDAY13":
                if (isFriday13(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "LISTOFDATES":
                if (this.isListOfDates(thisPage, result.date) === true) {
                    break;
                }
                continue;

            case "FIXED":
            case "":
                /* falls through */
            default:
                if (isFixed(thisPage, result.date) === true) {
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

PAD.prototype.addToResult = function (page, result) {
    if (page.name.length !== 0) {
        switch (page.type) {
            case "HOLIDAY":
            case "EVENT":
                result.holidays.push(page.name);
                break;

            case "BIRTHDAY":
                result.birthdays.push({ name: page.name, age: page.age });
                break;

            case "ANNIVERSARY":
                result.anniversaries.push({ name: page.name, age: page.age });
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

PAD.prototype.normalizePage = function (xmlPage, date) {
    var page = {};
    page.xml = xmlPage; 
    page.type = fakeDOM.getValue(page.xml, "TYPE").toUpperCase();
    page.name = fakeDOM.getValue(page.xml, "NAME");

    // NOTE: month, date and year will be NaN if the field was blank.

    // Adjust month. Data source is 1 based and Javascript 0 based
    page.month = parseInt(fakeDOM.getValue(page.xml, "MONTH"), 10) - 1;

    page.date = parseInt(fakeDOM.getValue(page.xml, "DAY"), 10);
    page.year = parseInt(fakeDOM.getValue(page.xml, "YEAR"), 10);

    page.special = fakeDOM.getValue(page.xml, "SPECIAL").toUpperCase();
    if (page.special.length > 0) {
        page.args = page.special.split(' ');
        page.special = page.args.shift();
    }

    // For Birthdays and Anniversaries, determine age (and clear year) when appropriate
    page.age = Number.NaN;
    if (page.type === "BIRTHDAY" || page.type === "ANNIVERSARY") {
        if (page.special !== "FIXED") {
            page.age = date.getFullYear() - page.year;
            page.year = Number.NaN;
        }
    }

    page.saying = fakeDOM.getValue(page.xml, "SAYING");
    page.author = fakeDOM.getValue(page.xml, "AUTHOR");
    page.web = fakeDOM.getValue(page.xml, "WEB");
    page.spoken = fakeDOM.getValue(page.xml, "SPOKEN");

    return page;
};

///////////////////////////////////////////////////////
//
// SPECIAL Keyword parsing functions
//
// Terms:
//      target date -- The date we're building a page-a-day for
//      event date  -- The date represented in the data set.
//      page        -- The specific data record being evaluated (TODO: change to record?)
//
///////////////////////////////////////////////////////

//
// isFixed
//
// Syntax: FIXED
//
// Compates the target date to a list of specific event dates in YYYY-MM-DD format
//

function isFixed (page, date) {
    if (matchOrNaN(page.month, date.getMonth(), page.date, date.getDate(), page.year, date.getFullYear())) {
        return true;
    }
    return false;
}

//
// isWeekDayofMonth
// 
// Syntax: WEEKOFMONTH week dow [delta]
//
// the Nth occurrence of a specific day of week in a month.
// Ex: 2nd Monday in August. SPECIAL=<Occurrence1-6> <DayOfWeek0-6> [<delta>]
//
function isWeekOfMonth (page, date) {
    if (page.args.length === 2 || page.args.length === 3) {
        var specialDate = new Date(date.valueOf());

        // Account for the offset by faking like we're looking for the non-offset day.
        if (page.args.length === 3) {
            specialDate.setDate(specialDate.getDate() - parseInt(page.args[2], 10));
        }

        // Need to check month here since some deltas might move the month.
        if (specialDate.getMonth() === page.month &&
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

function isLastDayOfMonth (page, date) {
    var tMonth = date.getMonth();

    if (tMonth === page.month && page.args.length === 1 && parseInt(page.args[0], 10) === date.getDay()) {
        var specialDate = new Date(date.valueOf());

        specialDate.setDate(specialDate.getDate() + 7);

        if (specialDate.getMonth() !== tMonth) {
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

function isWeekdayOnOrAfter (page, date) {
    // Must occur on a weekday (TODO BUG: Requires tDate to be 3 or larger.)
    // TODO BUG: Need to improve tax day calculations. For example, Tuesday April 18 is tax day in 2017 due to a Monday holiday.
    var tDay = date.getDay();
    var tDate = date.getDate();

    // Same month and target is not a weekend
    if (date.getMonth() === page.month && tDay !== 0 && tDay !== 6) {
        // Target is on a weekday. Check for a natural match
        if (tDate === page.date) {
            return true;
        }
        // If target is Monday, adjust event date and check for match
        if (tDay === 1 && (1 === tDate - page.date || 2 === tDate - page.date)) {
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

function isNearestWeekday (page, date) {
    var tDay = date.getDay();

    // Is it a natural match?
    if (matchOrNaN(page.month, date.getMonth(), page.date, date.getDate(), page.year, date.getFullYear())) {
        // Filter out natural matches when exclusive flag is used
        if (page.args.indexOf("EXCLUSIVE") === -1) {
            if (tDay > 0 && tDay < 6) {
                return true;
            } else if (page.args.indexOf("ACTUAL") !== -1) {
                page.name += " (actual)";
                return true;
            }
        }

    // If target is Monday or Friday, check if moving event creates a match
    } else if (tDay === 1 || tDay === 5) {
        var specialDate = new Date(date.valueOf());

        if (tDay === 1) {
            specialDate.setDate(specialDate.getDate() - 1);
        } else if (tDay === 5) {
            specialDate.setDate(specialDate.getDate() + 1);
        }
        if (matchOrNaN(page.month, specialDate.getMonth(), page.date, specialDate.getDate(), page.year, specialDate.getYear())) {
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

function isSpecificYear (page, date) {
    var tYear = date.getFullYear();

    if (page.args.length === 2 || (page.args.length === 3 && tYear <= parseInt(page.args[2], 10))) {
        if (tYear >= parseInt(page.args[0], 10) && date.getMonth() === page.month && date.getDate() === page.date) {
            if ((tYear - parseInt(page.args[0], 10)) % parseInt(page.args[1], 10) === 0) {
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

PAD.prototype.isChristianDate = function (page, date) {
    var delta = 0;
    var eventDate;

    switch (page.args[0]) {
        case "CHRISTMAS":
            eventDate = new Date(date.getFullYear(), 11, 25);
            break;

        case "ADVENT":      // 4th Sunday before Christmas
            eventDate = new Date(date.getFullYear(), 11, 25);

            if (eventDate.getDay() === 0) {
                delta -= 7 * 4;
            } else {
                delta -= 7 * 3 + eventDate.getDay();
            }
            break;

        case "EASTER":
            eventDate = this.getEasterW(date.getFullYear());
            break;
    }

    if (eventDate) {
        if (page.args.length >= 2) {
            delta += parseInt(page.args[1], 10);
        }

        eventDate.setDate(eventDate.getDate() + delta);

        if (eventDate.valueOf() === date.valueOf()) {
            return true;
        }
    }
    return false;
};

//
// isHebrewDate
//
// Syntax: HEBREW [delayed]
//      Note: MONTH and DAY are interpreted as Hebrew month number and date
//
// Dates based on the Hebrew calendar
//
// IMPORTANT: 
//      The underlying functions return the date for the nightfall before (the start of a Hebrew day)
//      So, check for Friday instead of Saturday when determining adjustments for the delayed flag.
//

function isHebrewDate(page, date) {
    var delayed = (page.args.length && (page.args[0].charAt(0) === "T" || page.args[0] === "DELAYED")) ? true : false;

    // If it's Saturday (actually nightfall on Friday) and the delayed flag is set, there can not be a match.
    if (delayed && date.getDay() === 5) {
        return false;
    }

    var jd = gregorianToJulian(date.getFullYear(), date.getMonth(), date.getDate());
    var hd = julianToHebrew(jd);

    if (matchOrNaN(page.year, hd.yy, page.month, hd.mm, page.date, hd.dd)) {
        page.name += " (at sunset)";
        return true;
    }

    // If Today is Sunday (actually nightfall on Saturday) and the delayed flag is set, check if the day before was a match
    if (delayed && date.getDay() === 6) {
        hd = julianToHebrew(jd - 1);

        if (matchOrNaN(page.year, hd.yy, page.month, hd.mm, page.date, hd.dd)) {
            page.name += " (at sunset)";
            return true;
        }
    }
    return false;
}

//
// isHijriDate
//
// Syntax: HIJRI
//      Note: MONTH and DAY are interpreted as Hijri month number and date
//
// Dates based on the Hijri calendar
//
// IMPORTANT: 
//      The underlying functions return the date for the nightfall before (the start of an Islamic day)
//

function isHijriDate (page, date) {
    var hd = julianToIslamic(gregorianToJulian(date.getFullYear(), date.getMonth(), date.getDate()));

    if (matchOrNaN(page.year, hd.yy, page.month, hd.mm, page.date, hd.dd)) {
        page.name += " (at sunset)";
        return true;
    }
    return false;
}

//
// isSeason
//
// Syntax: SEASON [north | south] spring | summer | fall | winter
//
// Returns the first day of the specified season.
//

function isSeason (page, date) {
    return false;       // TODO: Not implemented yet
}

//
// isSpan
//
// Syntax: SPAN days
//
// Returns a match for any day in the range
//

function isSpan (page, date) {
    return false;       // TODO: Not implemented yet
}

//
// isFriday13
//
// Syntax: FRIDAY13
//
// Matches when the target date is Friday the 13th
//

function isFriday13(page, date) {
    if (date.getDate() === 13 && date.getDay() === 5) {
        return matchOrNaN(page.month, date.getMonth(), page.date, date.getDate(), page.year, date.getFullYear());
    }
    return false;
}

//
// isListOfDates
//
// Syntax: LISTOFDATES date [...]
//
// Compates the target date to a list of specific event dates in YYYY-MM-DD format
//

PAD.prototype.isListOfDates = function (page, date) {
    if (page.args.indexOf(this.toISOStringNoTZ(date)) !== -1) {
        return true;
    }
    return false;
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
        dDay: "",
        dMonth: "",
        dYear: "",
        dDOW: "",
        holidays: "",
        birthdays: "",
        anniversaries: "",
        saying: "",
        author: ""
    };

    if (result.isValid) {
        fmtResult.title = result.title;
        fmtResult.version = result.version;
        fmtResult.date = this.getFormattedDate(result.date, fmt);
        fmtResult.dDay = this.getFormattedDate(result.date, "DAY");
        fmtResult.dMonth = this.getFormattedDate(result.date, "MONTH");
        fmtResult.dYear = this.getFormattedDate(result.date, "YEAR");
        fmtResult.dDOW = this.getFormattedDate(result.date, "DOW");
        fmtResult.holidays = this.getFormattedHoliday(result.holidays);
        fmtResult.birthdays = this.getFormattedBirthday(result.birthdays);
        fmtResult.anniversaries = this.getFormattedAnniversary(result.anniversaries);
        fmtResult.saying = this.getFormattedSaying(result, fmt);
        fmtResult.author = "- " + result.author;
    }
    return fmtResult;
};
PAD.prototype.getFormattedSaying = function (result, fmt) {
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

        if (fmt !== "WEB" && result.saying.length > 0) {
            if (result.author.length > 0) {
                s = "As " + result.author + " says..." + s + ".";
            } else {
                s = s + ".";
            }
        }
    }
    return s;
};

PAD.prototype.getFormattedDate = function (d, fmt) {
    var dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var s = "";

    switch (fmt) {
        // For CSV, output as "YEAR,MONTH,DAY,MONTH-NAME,DAY-OF-WEEK"
        // Example: "2017,5,12,May,Friday"
        case "CSV":
            s = d.getFullYear() + "," + d.getMonth() + "," + d.getDate() + "," + monthNames[d.getMonth()] + "," + dowNames[d.getDay()];
            break;

        // Suitable for speech output
        // Example: "Friday May 12th" if current year and "Friday May 12th 2017" otherwise.
        case "SPOKEN":
            var today = new Date();

            s = dowNames[d.getDate()] + " " + monthNames[d.getMonth()] + " " + this.getFormattedOrdinal(d.getDate());

            if (today.getFullYear() !== d.getFullYear()) {
                s += " " + d.getFullYear();
            }
            break;

        case "DAY":
            s = d.getDate();
            break;

        case "MONTH":
            s = monthNames[d.getMonth()];
            break;

        case "YEAR":
            s = d.getFullYear();
            break;

        case "DOW":
            s = dowNames[d.getDay()];
            break;

        case "WEB":
            /* falls through */
        default:
            s = dowNames[d.getDay()] + ", " + monthNames[d.getMonth()] + d.getDate() + ", " + d.getFullYear();
            break;
    }
    return s;
};

PAD.prototype.getFormattedHoliday = function (holidays) {
    var s = "";

    if (holidays.length) {
        while (holidays.length) {
            if (s.length > 0) {
                s += ", and ";
            }
            s += holidays.shift();
        }
        s = "It's " + s + ".";
    }
    return s;
};

PAD.prototype.getFormattedAnniversary = function (anniversaries) {
    // Sample output:
    // One name:
    //     "Joe and Sally are celebrating their 30th anniversary today."
    //
    // Multiple names:
    //     "Joe and Sally are celebrating their 30th anniversary today, and Billy and Ann are celebrating their 5th anniversary today."
    //

    var s = "";

    if (anniversaries.length) {
        while (anniversaries.length) {
            if (s.length > 0) {
                s += ", and ";
            }

            var anniversary = anniversaries.shift();

            s += anniversary.name;

            if (isNaN(anniversary.age)) {
                s += " are having an anniversary today";
            } else {
                s += " are celebrating their " + this.getFormattedOrdinal(anniversary.age) + " anniversary today";
            }

        }
        s += ".";
    }
    return s;
};

PAD.prototype.getFormattedBirthday = function (birthdays) {
    // Sample output:
    // One name:
    //     "Joe is having a birthday today."
    // or  "Joe is turning 30 today."
    //
    // Multiple names:
    //     "Joe, Billy and Sally are having birthdays today. It's Joe's 30th. It's Sally's 45th. "
    //

    var s = "";
    var postfix = "";

    if (birthdays.length === 1) {
        s = birthdays[0].name;

        if (isNaN(birthdays[0].age)) {
            s += " is having a birthday today.";
        } else {
            s += " is turning " + birthdays[0].age + " today.";
        }
    } else if (birthdays.length !== 0) {
        while (birthdays.length) {
            if (s.length > 0) {
                if (birthdays.length > 1) {
                    s += ", ";
                } else {
                    s += " and ";
                }
            }

            var birthday = birthdays.shift();

            s += birthday.name;

            if (!isNaN(birthday.age)) {
                postfix += "It's " + birthday.name + "'s " + this.getFormattedOrdinal(birthday.age) + ". ";
            }
        }
        s += " are having birthday's today. " + postfix;
    }

    return s;
};

PAD.prototype.getFormattedOrdinal = function (n) {

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
};

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

PAD.prototype.getEasterW = function (year) {
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

    var result = new Date(year, rMonth, rDate);                     // Creates Date at midnight local time (no need to normalize)
    result.setDate(result.getDate() + (7 - result.getDay()));       // Align to next Sunday (even if it falls on a Sunday)

    return result;
};

// Various Calendar system conversion functions
// Adapted from http://www.math.harvard.edu/computing/javascript/Calendar/


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

    // Let JS do the math for the month and date... 
    return new Date(year, 0, wjd - gregorianToJulian(year, 0, 1));
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
    jd += 1;                // Hebrew days begin at nightfall on the day before. Adjust forward to match event date (described as the day)

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
    jd += 1;                // Islamic days begin at nightfall on the day before. Adjust forward to match event date (described as the day)

    year = Math.floor(((30 * (jd - ISLAMIC_EPOCH)) + 10646) / 10631);
    month = Math.min(12, Math.ceil((jd - (29 + islamicToJulian(year, 1, 1))) / 29.5) + 1);
    day = (jd - islamicToJulian(year, month, 1)) + 1;
    return {
        yy: year,
        mm: month - 1,              // Convert to 0-based for Javascript
        dd: day
    };
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

            var result = myRe.exec ( data );
            return (result === null) ? "" : result[1];
        },
        getValueArray: function (data, tagname) {
            var myRe = new RegExp( "<" + "(?:.*:)?" + tagname + ">[\\\s\\\S]*?<\/" + "(?:.*:)?" + tagname + ">", "img" );
            return data.match( myRe );
        }
    };
})();

// This code is run in both a client-side browser and server-side node.js. 
// When loaded with a nodes.js "required" statement, module is declared and this assignment helps control scope.
// When loaded with a browser script statement, module is not declared.
if ( typeof module !== "undefined" ) {
    module.exports = PAD;
}
