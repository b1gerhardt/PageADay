'use strict';
// PAD the Page-A-Day generator
// Written by Barry Gerhardt
// 2016-12-28
//
// This JS contains the Page-A-Day class, PAD. 
//
// FUTURE ENHANCEMENTS AND CHANGES:
// 1. Simplify and normalize Excel data source. Maybe use Excel date serial numbers and convert. Or, just add non-schema fields to show a more readable date
// 2. Generate a full year calendar (probably as an XML)
// 3. Add URL links for web version of output
// 4. Add Media links for audio version of output
// 5. Add pronunciation hints and inflection for audio version of output
// 6. Take alternate file as input.
//
// TODO TO FINISH:
// 1. Refactor as class using new stuff from ECMA5 spec
// 2. Update to support as an Alexa skill
// 3. Output a web page with the day's page (should match the printed version). Do this for the web interface as well.

var PAD = function (xml) {
    this.xmlRaw = xml;
    //this.fakeDOM = new fakeDOM();
    this.result = {
        isValid: false,
        title: "",
        version: "",
        //date: this.normalizeDate( new Date( Date.now() ) ),
        date: undefined,
        holiday: "",
        birthday: "",
        anniversary: "",
        saying: "",
        author: ""
    }
};

PAD.prototype.initResult = function (d) {
    this.result.isValid = false;
    this.result.title = "";
    this.result.version = "";
    this.setDate(d);
    this.result.holiday = "";
    this.result.birthday = "";
    this.result.anniversary = "";
    this.result.saying = "";
    this.result.author = "";
}

// Force date to align to midnight on current day. This simplifies date manipulation
PAD.prototype.normalizeDate = function (d) {
    d.setTime(d.getTime() + d.getTimezoneOffset() * 60 * 1000);

    return d;
}

// Sets the target date using the passed date object. If no date is passed, uses today.
PAD.prototype.setDate = function (d) {
    var padDate = d || new Date(Date.now());
    this.result.date = this.normalizeDate(d);
}

PAD.prototype.getQuote = function (d) {
    this.initResult(d);

    var data = this.xmlRaw;
    var result = this.result;
    
    // Just in case the doc isn't loaded yet...
    if (data.length === 0) {
        result.saying = "Data did not load in time...";
    } else {
        result.title   = fakeDOM.getValue (data, "TITLE");
        result.version = fakeDOM.getValue (data, "VERSION");
        
        this.parseSection (fakeDOM.getValue(data, "HOLIDAYS"), result,true);
        this.parseSection(fakeDOM.getValue(data, "PAGES"), result, true);
        this.parseSection(fakeDOM.getValue(data, "DEFAULT"), result, false);
    }

    console.log(result.title + ", " + result.version + ", " + result.saying + " (isValid=" + result.isValid + ")" );

    return result;
}

PAD.prototype.parseSection = function (data, result, bFindAll) {
    if ( !data || data.length === 0 ) {
        return;
    }

    var xmlPages = fakeDOM.getValueArray ( data, "PAGE" );

    if ( !xmlPages ){
        return;
    }

    var i, j, thisPage, thisEl;
    var tMonth, tDate, tYear, tDay;
    var xmlType, xmlMonth, xmlDate, xmlYear;
    var xmlSpecial = [];

    // We're going to be using these alot. Reduce the overhad of Date() function calls.
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
        xmlType = fakeDOM.getValue ( thisPage, "TYPE");

        // Adjust for data(1-based) and Javascript (0-based)
        xmlMonth = parseInt(fakeDOM.getValue (thisPage, "MONTH"), 10) - 1;

        // Day of month (Date in Javascript)
        xmlDate = parseInt(fakeDOM.getValue (thisPage, "DAY"), 10);
        xmlYear = parseInt(fakeDOM.getValue (thisPage, "YEAR"), 10);

        xmlSpecial = fakeDOM.getValue (thisPage, "SPECIAL");
        if (xmlSpecial.length > 0 ) {
            xmlSpecial = xmlSpecial.split (' ');
        }

        switch (xmlType) {
            case "WeekdayOfMonth":
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

            case "LastWeekdayOfMonth":
                // The last occurence of a specific day of week in the month.

                if (tMonth == xmlMonth && xmlSpecial.length == 1 && xmlSpecial[0] == tDay) {
                    var specialDate = new Date(result.date.valueOf());

                    specialDate.setDate(specialDate.getDate() + 7);

                    if (specialDate.getMonth() != tMonth) {
                        break;          // Match
                    }
                }

                continue;       // No match... next record

            case "WeekdayOnOrAfter":
                // Must occur on a weekday (TODO BUG: Requires tDate to be 3 or larger.)

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

            case "SpecificYears":
                // Occurs only on specific years. SPECIAL=<StartYear> <Interval>

                if (tMonth == xmlMonth && tDate == xmlDate) {
                    if (xmlSpecial.length == 2 && ((tYear - xmlSpecial[0]) % xmlSpecial[1]) == 0) {
                        break;          // Found a match...
                    }
                }

                continue;

            case "ListOfDates":
                // Event occurs on a specific list of dates. SPECIAL=<YYYY-MM-DD> <...>

                for (j = 0 ; j < xmlSpecial.length; j++) {
                    if (tYear == xmlSpecial[j].substring(0, 4)
                     && tMonth == parseInt(xmlSpecial[j].substring(5, 7), 10) - 1
                     && tDate == parseInt(xmlSpecial[j].substring(8, 10), 10)) {
                        break;
                    }
                }

                if (j < xmlSpecial.length) {
                    break;          // Match. TODO: Avoid this awkward handling (best alternate is a break with label (aka: goto) but I'd like to do better)
                }

                continue;

            case "Fixed":
            case "":
                if ((isNaN(xmlMonth) || tMonth == xmlMonth) && (isNaN(xmlDate) || tDate == xmlDate) && (isNaN (xmlYear ) || tYear == xmlYear)) {
                    break;      // Match...
                }

                continue;

            case "Ignore":
            default:
                continue;
        }

        // If you get here, you have a match and should populate the result object...

        // Holidays, birthdays and anniversarys are additive...

        thisEl = fakeDOM.getValue ( thisPage, "HOLIDAY");
        if (thisEl.length !== 0) {
            if (result.holiday.length !== 0) {
                result.holiday += " and ";
            }
            result.holiday += thisEl;
        }

        thisEl = fakeDOM.getValue ( thisPage, "BIRTHDAY");
        if (thisEl.length !== 0) {
            if (result.birthday.length > 0) {
                result.birthday += " and ";
            }
            result.birthday+= thisEl;
        }

        thisEl = fakeDOM.getValue ( thisPage, "EVENT");
        if (thisEl.length !== 0) {
            if (result.anniversary.length > 0) {
                result.anniversary += " and ";
            }
            result.anniversary += thisEl;
        }

        // Sayings and authors are singular -- first one wins.
        if ( result.saying.length === 0 ) {
            result.saying = fakeDOM.getValue ( thisPage, "SAYING");

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

//
// extremely cheap XML searching functions
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
// When loaded with a nodes.js requored statement, module is declared and this assignment helps control scope.
// When loaded with a browser script statement, module is not declared.
if ( typeof module !== "undefined" ) {
    module.exports = PAD;
}
