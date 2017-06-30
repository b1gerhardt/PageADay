'use strict';
// PAD the Page-A-Day generator
// Written by Barry Gerhardt
// 2016-12-28
//
// This JS contains the Page-A-Day class, PAD. 
//
// FUTURE ENHANCEMENTS AND CHANGES:
// 1. Simplify and normalize Excel data source. Maybe use Excel date serial numbers and convert. Or, just add non-schema fields to show a more readable date
// 2. Generate a full year calendar (for mail merge)
// 3. Add URL links for web version of output
// 4. Add Media links for audio version of output
// 5. Add pronunciation hints and inflection for audio version of output
// 6. Take alternate file as input.
// 7. Find additional holidays from web sources (note: need to avoid duplicate holidays when doing this)
//

var PAD = function (data) {
    this.xml = {
        isValid: false,
        raw: "",
        title: "",
        version: "",
        pages: [],
    };

    this.initData( data );
    this.initResult();
};

PAD.prototype.initData = function (data) {

    if (data && data.length > 0 ) {
        this.xml.isValid = true;
        this.xml.raw = data;
        this.xml.title = fakeDOM.getValue ( data, "TITLE" );
        this.xml.version = fakeDOM.getValue (data, "VERSION" );
        this.xml.pages = fakeDOM.getValueArray ( data, "PAGE" );
    }

    return this.xml;
}
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
    this.result.date = d || new Date( Date.now() );

    return this.result;
}

// NOTE: All date work is done in the local time zone. This ensures the user gets the date they expect
// These helper functions are used to make working in the local time zone easier

// Return an ISO-like string using local time instead of GMT. Truncate to just the date.
PAD.prototype.toISOStringNoTZ = function ( d ) {
    var noTZ = new Date( d.getTime() - d.getTimezoneOffset() * 60 * 1000 );

    return noTZ.toISOString().substr(0,10);
}

// Set GMT to be midnight on the local time day (simplifies date handling so everything is GMT)
PAD.prototype.getDateNoTZ = function ( d ) {
    d.setTime( d.getTime() + d.getTimezoneOffset() * 60 * 1000 );
    return d;
}

PAD.prototype.getQuote = function ( d ) {
    var data = this.xml;
    //var data   = this.xmlRaw;
    var result = this.initResult(d);
    
    // basic sanity checks...
    if ( !data || !data.isValid ) {
        result.saying = "Error loading data...";
    } else {
        result.title   = data.title;
        result.version = data.version;

        // XML schema allows for HOLIDAYS, BIRTHDAYS, ANNIVERSARIES and GENERAL dates to be in separate sections
        // Since we're using a simplified, Fake DOM, we can pass the entire XML data set and it will parse out all PAGE entries.
        // This saves some parsing.
        // TODO: But, doesn't guarantee the order is preserved so may need to revisit this.
        this.parseSection( data, result, true );
    }

    console.log(result.title + ", " + result.version + ", " + result.saying + " (isValid=" + result.isValid + ")" );

    return result;
}

PAD.prototype.parseSection = function (data, result, bFindAll) {
    if ( !data || data.isValid === false ) {
        return;
    }

    var xmlPages = data.pages;

    if ( !xmlPages || xmlPages.length === 0 ){
        return;
    }

    var i, j, thisPage, thisEl;
    var xmlType, xmlMonth, xmlDate, xmlYear;
    var xmlAge;
    var xmlSpecial = [];

    // We're going to be using these alot. Reduce the overhead of Date() function calls.
    var tMonth = result.date.getMonth();
    var tDate = result.date.getDate();
    var tYear = result.date.getFullYear();
    var tDay = result.date.getDay();

    // TODO: May want to use Excel date serial numbers. Here's the formula (get to same mm/dd/yyyy resolution as the form data. Still need to adjust for local time
    // var utc_days = Math.floor(serialFromExcel - 25569);
    // var utc_value = utc_days * 86400;
    // var date_info = new Date(utc_value * 1000);
    // date_info.setTime(date_info.getTime() + date_info.getTimezoneOffset() * 60 * 1000);

    for (i = 0 ; i < xmlPages.length ; i++) {
        thisPage = xmlPages[i];

        // Pre-load and normalize data to simplify code later on...
        xmlType = fakeDOM.getValue( thisPage, "TYPE" ).toUpperCase();

        if ( xmlType === "IGNORE" ) {
            continue;
        }

        // NOTE: xmlMonth, xmlDate, and xmlYear will be NaN if the field was blank.

        // Adjust for data(1-based) and Javascript (0-based)
        xmlMonth = parseInt(fakeDOM.getValue (thisPage, "MONTH"), 10) - 1;

        // Day of month (Date in Javascript)
        xmlDate = parseInt(fakeDOM.getValue (thisPage, "DAY"), 10);
        xmlYear = parseInt(fakeDOM.getValue (thisPage, "YEAR"), 10);

        // Save age year for BIRTHDAY and ANNIVERSARY types
        (xmlType === "BIRTHDAY" || xmlType === "ANNIVERSARY") ? xmlAge = tYear - xmlYear : xmlAge = Number.NaN;

        // Parse the SPECIAL keyword
        thisEl = fakeDOM.getValue (thisPage, "SPECIAL").toUpperCase();
        if (thisEl.length > 0 ) {
            xmlSpecial = thisEl.split( ' ' );
            thisEl = xmlSpecial.shift();    // Pop off the keyword. Leave the arguments...
        }

        switch (thisEl) {
            case "IGNORE":
                continue;

            case "WEEKDAYOFMONTH":
                // The Nth occurrence of a specific day of week in the month. Ex: 2nd Monday in August. SPECIAL=<Occurrence1-6> <DayOfWeek0-6> [<delta>]

                if (xmlSpecial.length === 2 || xmlSpecial.length === 3) {
                    var specialDate = new Date(result.date.valueOf());

                    // Account for the offset by faking like we're looking for the non-offset day.
                    if (xmlSpecial.length === 3){
                        specialDate.setDate(specialDate.getDate() - xmlSpecial[2]);
                    }

                    // Need to check month here since some deltas might move the month. (yea, we want type conversion -- no triple equal)
                    if (specialDate.getMonth() == xmlMonth && xmlSpecial[1] == specialDate.getDay() && xmlSpecial[0] == Math.ceil(specialDate.getDate() / 7)) {
                        break;  // Match
                    }
                }

                continue;          // No match... next record

            case "LASTWEEKDAYOFMONTH":
                // The last occurence of a specific day of week in the month.

                if (tMonth == xmlMonth && xmlSpecial.length == 1 && xmlSpecial[0] == tDay) {
                    var specialDate = new Date(result.date.valueOf());

                    specialDate.setDate(specialDate.getDate() + 7);

                    if (specialDate.getMonth() != tMonth) {
                        break;          // Match
                    }
                }

                continue;       // No match... next record

            case "WEEKDAYONORAFTER":
                // Must occur on a weekday (TODO BUG: Requires tDate to be 3 or larger.)
                // TODO BUG: Need to improve tax day calculations. For example, Tuesday April 18 is tax day in 2017 due to a Monday holiday.

                if (tMonth == xmlMonth && tDay != 0 && tDay != 6) {
                    // Match: Normal date is on a Saturday or Sunday this year so move to Monday...
                    if (tDay == 1 && (1 == tDate - xmlDate || 2 == tDate - xmlDate)) {
                        break;
                    }

                    // Match: Normal date is on a weekday this year. No change...
                    if (tDate == xmlDate) {
                        break;
                    }
                }

                continue;

            case "SPECIFICYEARS":
                // Occurs only on specific years. SPECIAL=<StartYear> <Interval> [<EndYear>]

                if (xmlSpecial.length == 2 || (xmlSpecial.length == 3 && tYear <= xmlSpecial[2]) ) {
                    if ( tYear >= xmlSpecial[0] && tMonth == xmlMonth && tDate == xmlDate) {
                        if ((tYear - xmlSpecial[0]) % xmlSpecial[1] == 0) {
                            break;          // Found a match...
                        }
                    }
                }
                
                continue;

            case "CHRISTIAN":
                // Special handling for Christian holidays. SPECIAL=CHRISTIAN <holiday> [<delta>]
                if (xmlSpecial.length == 1 || xmlSpecial.length == 2) {
                    xmlSpecial[0] = xmlSpecial[0].toUpperCase();

                    if (xmlSpecial[0] == "CHRISTMAS" && tMonth == 11 && tDate === 25) {
                            break;  // match
                    } else if (xmlSpecial[0] == "ADVENT") {
                        // 4th Sunday before Christmas
                        var specialDate = new Date(tYear, tMonth, tDate);
                        var eventDate = new Date(tYear, 11, 25);
                        eventDate.setDate(eventDate.getDate() - ((7 - eventDate.getDay()) + 21));

                        // Account for the offset by faking like we're looking for the non-offset day.
                        if (xmlSpecial.length === 2) {
                            specialDate.setDate(specialDate.getDate() - xmlSpecial[1]);
                        }

                        if (specialDate.valueOf() === eventDate.valueOf()) {
                            break;      // match
                        }
                    } else if (xmlSpecial[0] == "EASTER") {
                        var specialDate = new Date(tYear, tMonth, tDate);
                        var eventDate = getEasterW ( tYear );

                        if ( specialDate.valueOf() === eventDate.valueOf()) {
                            break;      // match
                        }
                    }
                }
                continue;

            case "HEBREW":
                // Special handling for Hebrew calendar. SPECIAL = HEBREW [<delayed>]. MONTH and DAY are the Hebrew month number and day.
                // <delayed>, if present and "true" will match Sunday if the date falls on Saturday. This is useful for Tisha B'Av.

                var delayed = (xmlSpecial.length && xmlSpecial[0].toLowerCase() == "true") ? true : false;

                // If target day is Saturday and delayed == true, it's never a match.
                if (delayed && tDay != 6) {

                    // Check for a natural match first...
                    var jd = gregorianToJulian(tYear, tMonth, tDate);
                    var hebDate = julianToHebrew(jd);

                    if (matchOrNaN(xmlYear, hebDate.yy, xmlMonth, hebDate.mm, xmlDay, hebDate.dd) {
                        break;      // Match
                    }

                    // If delayed == true and today is Sunday, check if day before was a match
                    if (delayed == true & tDay == 0) {
                        jd -= 1;
                        hebDate = julianToHebrew(jd);

                        if (matchOrNaN(xmlYear, hebDate.yy, xmlMonth, hebDate.mm, xmlDay, hebDate.dd) {
                            break;      // Match
                        }
                    }
                }
                continue;

            case "ISLAMIC":
                // Special handling for Islamic calendar. SPECIAL = ISLAMIC. MONTH and DAY are the Islamic month number and day.
                continue;   // TBD: Not supported yet.

                var delayed = (xmlSpecial.length && xmlSpecial[0].toLowerCase() == "true") ? true : false;

                // If target day is Saturday and delayed == true, it's never a match.
                if (delayed && tDay != 6) {

                    // Check for a natural match first...
                    var jd = gregorianToJulian(tYear, tMonth, tDate);
                    var hebDate = julianToHebrew(jd);

                    if (matchOrNaN(xmlYear, hebDate.yy, xmlMonth, hebDate.mm, xmlDay, hebDate.dd) {
                        break;      // Match
                    }

                    // If delayed == true and today is Sunday, check if day before was a match
                    if (delayed == true & tDay == 0) {
                        jd -= 1;
                        hebDate = julianToHebrew(jd);

                        if (matchOrNaN(xmlYear, hebDate.yy, xmlMonth, hebDate.mm, xmlDay, hebDate.dd) {
                            break;      // Match
                        }
                    }
                }
                continue;

            case "FRIDAY13":
                // Event occurs when it's Friday the 13th
                if (tDate == 13 && tDay == 5 && matchOrNaN(xmlMonth, tMonth, xmlDate, tDate, xmlYear, tYear)) {
                    break;              // Match
                }
                continue;

            case "LISTOFDATES":
                // Event occurs on a specific list of dates. SPECIAL=<YYYY-MM-DD> <...>
                var specialDate = this.toISOStringNoTZ( result.date );

                if ( xmlSpecial.indexOf( specialDate ) !== -1 ) {
                    break;              // Match
                }

                continue;

            case "":
            default:
                // Clear xmlYear for BIRTHDAY and ANNIVERSARY types...
                if (xmlType === "BIRTHDAY" || xmlType === "ANNIVERSARY") {
                    xmlYear = Number.NaN;
                }

                // Fall through to FIXED to check for a match...

            case "FIXED":
                if ( matchOrNaN(xmlMonth, tMonth, xmlDate, tDate, xmlYear, tYear) ) {
                    if (!isNaN (xmlYear)) {
                        xmlAge = Number.NaN;    // If the Year is intact, clear Age -- fix-up for "FIXED" case.
                    }
                    break;      // Match...
                }

                continue;

        }

        // If you get here, you have a match and should populate the result object...

        thisEl = fakeDOM.getValue(thisPage, "NAME");

        if ( thisEl.length !== 0 ) {
            switch ( xmlType ) {
                case "HOLIDAY":
                    result.holidays.push ( thisEl );
                    break;

                case "BIRTHDAY":
                    result.birthdays.push ( {name: thisEl, age: xmlAge} );
                    break;

                case "ANNIVERSARY":
                    result.anniversaries.push ( {name: thisEl, age: xmlAge} );
                    break;

                case "IGNORE":
                case "GENERAL":
                default:
                    break;
            }
        }

        // Sayings and authors are singular -- first one wins.
        if ( result.saying.length === 0 ) {
            result.saying = fakeDOM.getValue( thisPage, "SAYING" );
            result.sayingWeb = fakeDOM.getValue( thisPage, "WEB" );
            result.sayingSpoken = fakeDOM.getValue( thisPage, "SPOKEN" );

            if ( result.saying.length !== 0 ) {
                result.author = fakeDOM.getValue ( thisPage, "AUTHOR");
            }
        }

        result.isValid = true;

        if (bFindAll === false) {
            break;
        }
    }
}

PAD.prototype.getFormattedResult = function ( result, fmt ) {
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

    if ( result.isValid ) {
        fmtResult.title = result.title;
        fmtResult.version = result.version;
        fmtResult.date = this.getFormattedDate( result.date, fmt );
        fmtResult.dDay = this.getFormattedDate( result.date, "DAY" );
        fmtResult.dMonth = this.getFormattedDate( result.date, "MONTH" );
        fmtResult.dYear = this.getFormattedDate( result.date, "YEAR" );
        fmtResult.dDOW = this.getFormattedDate( result.date, "DOW" );
        fmtResult.holidays = this.getFormattedHoliday ( result.holidays );
        fmtResult.birthdays = this.getFormattedBirthday ( result.birthdays );
        fmtResult.anniversaries = this.getFormattedAnniversary ( result.anniversaries );
        fmtResult.saying = this.getFormattedSaying( result, fmt );
        fmtResult.author = "- " + result.author;
    }
    return fmtResult;
}

PAD.prototype.getFormattedSaying = function ( result, fmt ) {
    var s = "";

    if ( result && result.isValid ) {
        switch ( fmt ) {
            case "SPOKEN":
                s = result.sayingSpoken;
                break;

            case "WEB":
                s = result.sayingWeb;
                break;
        }

        if ( s.length === 0 ) {
            s = result.saying;
        }

        if ( fmt !== "WEB" && result.saying.length > 0 ) {
            if ( result.author.length > 0 ) {
                s = "As " + result.author + " says..." + s + ".";
            } else {
                s = s + ".";
            }
        }
    }
    return s;
}

PAD.prototype.getFormattedDate = function ( d, fmt ) {
    var dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var s = "";

    switch ( fmt ) {
        // For CSV, output as "YEAR,MONTH,DAY,MONTH-NAME,DAY-OF-WEEK"
        // Example: "2017,5,12,May,Friday"
        case "CSV":
            s = d.getFullYear() + "," + d.getMonth() + "," + d.getDate() + "," + monthNames[d.getMonth()] + "," + dowNames[d.getDay()];
            break;

        // Suitable for speech output
        // Example: "Friday May 12th" if current year and "Friday May 12th 2017" otherwise.
        case "SPOKEN":
            var today = new Date();

            s = dowNames[d.getDate()] + " " + monthNames[d.getMonth()] + " " + this.getFormattedOrdinal( d.getDate() );

            if ( today.getFullYear() !== d.getFullYear() ) {
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
        default:
            s = dowNames[d.getDay()] + ", " + monthNames[d.getMonth()] + d.getDate() + ", " + d.getFullYear();
            break;
    }
    return s ;
}

PAD.prototype.getFormattedHoliday = function ( holidays ) {
    var s = "";

    if ( holidays.length ) {
        while ( holidays.length ) {
            if ( s.length > 0 ) {
                s += ", and ";
            }
            s += holidays.shift();
        }
        s = "It's " + s + ".";
    }
    return s;
}

PAD.prototype.getFormattedAnniversary = function ( anniversaries ) {
    // Sample output:
    // One name:
    //     "Joe and Sally are celebrating their 30th anniversary today."
    //
    // Multiple names:
    //     "Joe and Sally are celebrating their 30th anniversary today, and Billy and Ann are celebrating their 5th anniversary today."
    //

    var s = "";

    if ( anniversaries.length ) {
        while ( anniversaries.length ) {
            if ( s.length > 0 ) {
                s += ", and ";
            }

            var anniversary = anniversaries.shift();

            s += anniversary.name;

            if ( isNaN( anniversary.age ) ) {
                s += " are having an anniversary today"
            } else {
                s += " are celebrating their " + this.getFormattedOrdinal( anniversary.age ) + " anniversary today";
            }

        }
        s += ".";
    }
    return s;
}

PAD.prototype.getFormattedBirthday = function ( birthdays ) {
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

    if ( birthdays.length === 1) {
        s = birthdays[0].name;

        if ( isNaN(birthdays[0].age) ) {
            s += " is having a birthday today."
        } else {
            s += " is turning " + birthdays[0].age + " today.";
        }
    } else if ( birthdays.length !== 0 ){
        while ( birthdays.length ) {
            if ( s.length > 0 ) {
                if ( birthdays.length > 1) {
                    s += ", ";
                } else {
                    s += " and ";
                }
            }
            
            var birthday = birthdays.shift();

            s += birthday.name;

            if ( !isNaN ( birthday.age ) ) {
                postfix += "It's " + birthday.name + "'s " + this.getFormattedOrdinal (birthday.age) + ". " ;
            }
        }
        s += " are having birthday's today. " + postfix;
    }

    return s;
}

PAD.prototype.getFormattedOrdinal = function ( n ) {

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

    if ( n >= 20 ) {
        s = Math.floor ( n / 10 ).toString();
        n = Math.floor ( n % 10 );
    }

    return s + ORDINAL_AGE[n];
}

// Pass in comparison pairs. Returns true if, for each pair, if first is NaN or if the numbers match
// TODO: Research if there is a more natural way to handle this...
function matchOrNaN() {
    if (arguments.length % 2 != 0) {        // Even number of arguments is required
        return false;
    }
    for (var i = 0; i < arguments.length; i += 2) {
        if (!isNaN(arguments[i]) && arguments[i] != arguments[i + 1]) {
            return false;
        }
    }

    return true;
}


// Internal support functions

function getEasterW ( year ) {
    // Calculates Western Easter
    // Adapted rom https://en.wikipedia.org/wiki/Computus#Algorithms

    var a, b, c, d, e;
    var rMonth, rDate;

    // Dates before 1900 and after 2299 are not supported...
    if      ( year < 1900 ) { year = 1900; } 
    else if ( year > 2299 ) { year = 2299; }

    a = year % 19;

    if ( year < 2200 ) {
        b = (11 * a + 5) % 30;
    } else {
        b = ( 11 * a + 4) % 30;
    }

    if ( b === 0 || (b === 1 && a > 10)) {
        c = b + 1;
    } else {
        c = b;
    }
    if ( c >= 1 && c <= 19 ) {
        rMonth = 3;  // April
    } else /* if ( c >= 20 && c <= 29 ) */ {
        rMonth = 2;  // March
    }
    rDate = (50 - c) % 31;

    var result = new Date(year, rMonth, rDate);
    result.setDate(result.getDate() + (7 - result.getDay()));     // Align to next Sunday (even if it falls on a Sunday)

    return result;
}

// Various Calendar system conversion functions
// Adapted from http://www.math.harvard.edu/computing/javascript/Calendar/


/*  MOD  --  Modulus function which works for non-integers.  */

function calMod(a, b) {
    return a - (b * Math.floor(a / b));
}

//  AMOD  --  Modulus function which returns numerator if modulus is zero

function calAmod(a, b) {
    return mod(a - 1, b) + 1;
}

//  Julian / Gregorian Conversion ===================
// GREGORIAN_EPOCH = 1721425.5;

// Is it leap year? Credit to Kevin P. Rice

function gregorianIsLeap(year) {
    // Copied from https://stackoverflow.com/questions/3220163/how-to-find-leap-year-programatically-in-c/11595914#11595914
    return (year & 3) == 0 && ((year % 25) != 0 || (year & 15) == 0);
}

// Convert Gregorian year, month (0-based), day to Julian Date
function gregorianToJulian(year, month, day) {
    month += 1;             // Convert to 1-based month
    yminus = year - 1;      // Simplify calculations below
    return 1721424.5 + (365 * yminus) + Math.floor(yminus / 4) - Math.floor(yminus / 100) + Math.floor(yminus / 400)
         + Math.floor((((367 * month) - 362) / 12) + ((month <= 2) ? 0 :(leap_gregorian(year) ? -1 : -2)) + day);
}

// Convert Julian date to Javascript Date (Gregorian).
function julianToGregorian(jd) {
    var wjd = Math.floor(jd - 0.5) + 0.5;           // Always align to 0.5 (Julian days start at noon)
    var depoch = wjd - 1721425.5;                   // Delta from GREGORIAN_EPOCH
    var quadricent = Math.floor(depoch / 146097);
    var dqc = mod(depoch, 146097);
    var cent = Math.floor(dqc / 36524);
    var dcent = mod(dqc, 36524);
    var quad = Math.floor(dcent / 1461);
    var dquad = mod(dcent, 1461);
    var yindex = Math.floor(dquad / 365);
    var year = (quadricent * 400) + (cent * 100) + (quad * 4) + yindex;

    if (!((cent == 4) || (yindex == 4))) {
        year++;
    }

    // Let JS do the math for the month and day... 
    return new Date(year, 0, wjd - gregorianToJulian(year, 0, 1));
}

// Julian / Hebrew Conversion ===================
var HEBREW_EPOCH = 347995.5;

// Hebrew leap year utilities
function hebrewIsLeap(year) {
    return calMod(((year * 7) + 1), 19) < 7;
}

function hebrewyearMonths(year) {
    return hewbrewIsLeap(year) ? 13 : 12;
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

    return ((next - present) == 356) ? 2 : (((present - last) == 382) ? 1 : 0);
}

//  How many days are in a Hebrew year ?

function hebrewYearDays(year) {
    return hebrewToJulian(year + 1, 7, 1) - hebrewtoJulian(year, 7, 1);
}

//  How many days are in a given month of a given year

function hebrewMonthDays(year, month) {
    //  First of all, dispose of fixed-length 29 day months

    if (month == 2 || month == 4 || month == 6 ||
        month == 10 || month == 13) {
        return 29;
    }

    //  If it's not a leap year, Adar has 29 days

    if (month == 12 && !hebrewIsLeap(year)) {
        return 29;
    }

    //  If it's Heshvan, days depend on length of year

    if (month == 8 && !(calMod(hebrewYearDays(year), 10) == 5)) {
        return 29;
    }

    //  Similarly, Kislev varies with the length of year

    if (month == 9 && (calMod(hebrewYearDays(year), 10) == 3)) {
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

    if (month < 7) {
        var mon;
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
    var jd = Math.floor(jd) + 0.5;
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
        mm: month,
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
            return result === null ? "" : result[1];
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
