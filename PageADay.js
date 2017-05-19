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

// Return an ISO-like string but with local time.
PAD.prototype.toISOStringNoTZ = function ( d ) {
    var noTZ = new Date( d.getTime() - d.getTimezoneOffset() * 60 * 1000 );

    return noTZ.toISOString();
}

// Set the local time to be the passed GMT time.
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
    var tMonth, tDate, tYear, tDay;
    var xmlType, xmlMonth, xmlDate, xmlYear;
    var xmlAge;
    var xmlSpecial = [];

    // We're going to be using these alot. Reduce the overhead of Date() function calls.
    tMonth = result.date.getMonth();
    tDate = result.date.getDate();
    tYear = result.date.getFullYear();
    tDay = result.date.getDay();

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
                // The Nth occurrence of a specific day of week in the month. Ex: 2nd Monday in August. SPECIAL=<Occurrence1-6> <DayOfWeek0-6> <optional: delta)

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
                // Occurs only on specific years. SPECIAL=<StartYear> <Interval>

                if (tMonth == xmlMonth && tDate == xmlDate) {
                    if (xmlSpecial.length == 2 && ((tYear - xmlSpecial[0]) % xmlSpecial[1]) == 0) {
                        break;          // Found a match...
                    }
                }

                continue;

            case "LISTOFDATES":
                // Event occurs on a specific list of dates. SPECIAL=<YYYY-MM-DD> <...>
                var specialDate = this.toISOStringNoTZ( result.date ).substr( 0, 10 );
                //var specialDate = result.date.toISOString().substring( 0, 10 );

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
                if ((isNaN(xmlMonth) || tMonth == xmlMonth) && (isNaN(xmlDate) || tDate == xmlDate) && (isNaN (xmlYear ) || tYear == xmlYear)) {
                    break;      // Match...
                }

                continue;

        }

        // If you get here, you have a match and should populate the result object...

        thisEl = fakeDOM.getValue ( thisPage, "NAME");

        if ( thisEl.length !== 0 ) {
            switch ( xmlType ) {
                case "IGNORE":
                    break;

                case "HOLIDAY":
                    result.holidays.push ( thisEl );
                    break;

                case "BIRTHDAY":
                    result.birthdays.push ( {name: thisEl, age: xmlAge} );
                    break;

                case "ANNIVERSARY":
                    result.anniversaries.push ( {name: thisEl, age: xmlAge} );
                    break;

                // no default -- above cases require extra handling. 

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
