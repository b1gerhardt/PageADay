'use strict'
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

var PAD = function () {
    // padDoc contains the parsed XML data 
    this.xmlDOM = undefined;
    // padResult contains the output for the matched date when isValid = true
    this.result = {
        isValid: false,
        title: "",
        date: this.normalizeDate(new Date.now()),
        holiday: "",
        birthday: "",
        anniversary: "",
        saying: "",
        author: ""
    }
};

PAD.prototype.initResult = function () {
    this.result.isValid = false;
    this.result.title = "";
    this.result.date = this.normalizeDate(new Date.now());
    this.result.holiday = "";
    this.result.birthday = "";
    this.result.anniversary = "";
    this.result.saying = "";
    this.result.author = "";
}

PAD.prototype.loadXML = function (xmlfile) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            this.xmlDOM = this.responseXML;          // TODO: this.xmlDOM probably won't work since we're in the xhttp callback. Learn how to do this correctly.
        }
    };

    xhttp.open("GET", xmlFile, true);
    xhttp.send();
}

// Force date to align to midnight on current day. This simplifies date manipulation
PAD.prototype.normalizeDate = function (d) {
    return d.setTime(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
}

// Sets the target date using the passed date object. If no date is passed, uses today.
PAD.prototype.setDate = function (d) {
    var padDate = d || new Date.now();
    this.padResult.date = this.normalizeDate(d);
}

PAD.prototype.getQuote = function (d) {
    if (d) {
        this.setDate(d);
    }

    this.buildQuote();
}

PAD.prototype.buildQuote = function () {
    this.initResult();
    
    // Just in case the doc isn't loaded yet...
    if (this.xmlDOM == undefined) {
        this.result.saying = "Data did not load in time...";
    } else {
        this.parseSection (this.xmlDOM.getElementsByTagName("HOLIDAYS"),this.result,true);
        this.parseSection (this.xmlDOM.getElementsByTagName("PAGES"),this.result,false);
        this.parseSection (this.xmlDOM.getElementsByTagName("DEFAULT"),this.result,false);
    }

    return this.result;
}

PAD.prototype.parseSection = function (xmlSection, result, bFindAll) {
    if ( !xmlSection || xmlSection.length === 0 ) {
        return;
    }

    var xmlPages = xmlSection[0].getElementsByTagName("PAGE");
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
        thisEl = thisPage.getElementsByTagName("TYPE");
        thisEl.length == 0 ? xmlType = "" : xmlType = thisEl[0].innerHTML;

        // Adjust for data(1-based) and Javascript (0-based)
        thisEl = thisPage.getElementsByTagName("MONTH");
        thisEl.length == 0 ? xmlMonth = undefined : xmlMonth = parseInt(thisEl[0].innerHTML, 10) - 1;

        // Day of month (Date in Javascript)
        thisEl = thisPage.getElementsByTagName("DAY");
        thisEl.length == 0 ? xmlDate = undefined : xmlDate = parseInt(thisEl[0].innerHTML, 10);

        thisEl = thisPage.getElementsByTagName("YEAR");
        thisEl.length == 0 ? xmlYear = undefined : xmlYear = parseInt(thisEl[0].innerHTML, 10);

        thisEl = thisPage.getElementsByTagName("SPECIAL");
        thisEl.length == 0 ? xmlSpecial.length = 0 : xmlSpecial = thisEl[0].innerHTML.split(' ');

        switch (xmlType) {
            case "WeekdayOfMonth":
                // The Nth occurrence of a specific day of week in the month. Ex: 2nd Monday in August. SPECIAL=<Occurrence1-6> <DayOfWeek0-6> <optional: delta)

                if (xmlSpecial.length == 2 || xmlSpecial.length == 3) {
                    var specialDate = new Date(result.date.valueOf());

                    // Account for the offset by faking like we're looking for the non-offset day.
                    if (xmlSpecial.length == 3){
                        specialDate.setDate(specialDate.getDate() - xmlSpecial[2]);
                    }

                    // Need to check month here since some deltas might move the month.
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
                     && tMonth == parseInt(xmlSpecial[j].substring(5, 7)) - 1
                     && tDate == parseInt(xmlSpecial[j].substring(8, 10))) {
                        break;
                    }
                }

                if (j < xmlSpecial.length) {
                    break;          // Match. TODO: Avoid this awkward handling (best alternate is a break with label (aka: goto) but I'd like to do better)
                }

                continue;

            case "Fixed":
            case "":
                if ((xmlMonth == undefined || tMonth == xmlMonth) && (xmlDate == undefined || tDate == xmlDate) && (xmlYear == undefined || tYear == xmlYear)) {
                    break;      // Match...
                }

                continue;

            case "Ignore":
            default:
                continue;
        }

        // If you get here, you have a match and should populate the result object...

        // Holidays, birthdays and anniversarys are additive...

        thisEl = thisPage.getElementsByTagName("HOLIDAY");
        if (thisEl.length != 0) {
            if (result.holiday.length > 0) {
                result.holiday += " and ";
            }
            result.holiday += thisEl[0].innerHTML;
        }

        thisEl = thisPage.getElementsByTagName("BIRTHDAY");
        if (thisEl.length != 0) {
            if (result.birthday.length > 0) {
                result.birthday += " and ";
            }
            result.birthday+= thisEl[0].innerHTML;
        }

        thisEl = thisPage.getElementsByTagName("EVENT");
        if (thisEl.length != 0) {
            if (result.anniversary.length > 0) {
                result.anniversary += " and ";
            }
            result.anniversary += thisEl[0].innerHTML;
        }

        // Sayings and authors are singular -- first one wins.

        thisEl = thisPage.getElementsByTagName("SAYING");
        if (thisEl.length != 0 && result.saying == "") {
            result.saying = thisEl[0].innerHTML;

            thisEl = thisPage.getElementsByTagName("AUTHOR");
            thisEl.length == 0 ? result.author = "" : result.author = thisEl[0].innerHTML;
        }

        result.isValid = true;

        if (bFindAll == false) {
            break;
        }
    }
}

