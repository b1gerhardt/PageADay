
// FUTURE ENHANCEMENTS AND CHANGES:
// 1. Simplify and normalize Excel data source. Maybe use Excel date serial numbers and convert. Or, just add non-schema fields to show a more readable date
// 2. Generate a full year calendar (probably as an XML)
// 3. Add URL links for web version of output
// 4. Add Media links for audio version of output
// 5. Add pronunciation hints and inflection for audio version of output
// 6. Take alternate file as input.
//
// TODO TO FINISH:
// 1. Create GITHUB account and check in code (so I can refer people to hit)
// 2. Learn how to create an Alexa skill and go through the tutorial
// 3. Update to support as an Alexa skill
// 4. Output a web page with the day's page (should match the printed version). Do this for the web interface as well.

var padDoc = undefined;     // This will contain the parse XML file when it is loaded

function PADInit() {
    // Process date for web prototype
    document.forms[0].onsubmit = function () { return PADGetQuote() };

    PADLoadXML("pageadaydata.xml");
}

function PADGetQuote() {
    // Get user selected date and fix timezone so the full date object is midnight local time on the proper day
    var dateField = new Date(document.forms[0]["nameUserDate"].value);
    dateField.setTime(dateField.getTime() + dateField.getTimezoneOffset() * 60 * 1000);

    var padQuote = new PADBuildQuote(padDoc, dateField);

    if (padQuote.isValid == false) {
        document.getElementById("PADQuote").innerHTML = "Invalid Date...";
        document.getElementById("PADHoliday").innerHTML = "";
        document.getElementById("PADEvent").innerHTML = "";
        document.getElementById("PADBirthday").innerHTML = "";
        document.getElementById("PADSaying").innerHTML = "";
        document.getElementById("PADAuthor").innerHTML = "";
    } else {
        document.getElementById("PADQuote").innerHTML = "Quote for " + padQuote.date.toDateString() + "...";
        document.getElementById("PADHoliday").innerHTML = "Holiday: " + padQuote.holiday;
        document.getElementById("PADEvent").innerHTML = "Event: " + padQuote.event;
        document.getElementById("PADBirthday").innerHTML = "Birthday: " + padQuote.birthday;
        document.getElementById("PADSaying").innerHTML = "Saying: " + padQuote.saying;
        document.getElementById("PADAuthor").innerHTML = "Author: " + padQuote.author;

    }

    return false; // TBD: Always return false for now to avoid a page reload that would clear the results
}

function PADBuildQuote(xmlDoc, targetDate) {
    var quote = new QuoteObj(targetDate);

    // Just in case the doc isn't loaded yet...
    if (xmlDoc == undefined) {
        quote.saying = "Data did not load in time...";
    } else {
        PADParseSection(xmlDoc.getElementsByTagName("HOLIDAYS"), quote, true);
        PADParseSection(xmlDoc.getElementsByTagName("PAGES"), quote, false);
        PADParseSection(xmlDoc.getElementsByTagName("DEFAULT"), quote, false);
    }

    return quote;
}

function PADParseSection(xmlSection, quote, bFindAll) {
    if (xmlSection.length == 0) {
        return;
    }

    var xmlPages = xmlSection[0].getElementsByTagName("PAGE");
    var i, j, thisPage, thisEl;
    var tMonth, tDate, tYear, tDay;
    var xmlType, xmlMonth, xmlDate, xmlYear;
    var xmlSpecial = [];

    // We're going to be using these alot. Reduce the overhad of Date() function calls.
    tMonth = quote.date.getMonth();
    tDate = quote.date.getDate();
    tYear = quote.date.getFullYear();
    tDay = quote.date.getDay();

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
        thisEl.length == 0 ? xmlMonth = 0 : xmlMonth = parseInt(thisEl[0].innerHTML, 10) - 1;

        thisEl = thisPage.getElementsByTagName("DAY");      // Day of month (Date in Javascript)
        thisEl.length == 0 ? xmlDate = 0 : xmlDate = parseInt(thisEl[0].innerHTML, 10);

        thisEl = thisPage.getElementsByTagName("YEAR");
        thisEl.length == 0 ? xmlYear = 0 : xmlYear = parseInt(thisEl[0].innerHTML, 10);

        thisEl = thisPage.getElementsByTagName("SPECIAL");
        thisEl.length == 0 ? xmlSpecial.length = 0 : xmlSpecial = thisEl[0].innerHTML.split(' ');

        switch (xmlType) {
            // The Nth occurrence of a specific day of week in the month. Ex: 2nd Monday in August. SPECIAL=<Occurrence1-6> <DayOfWeek0-6> <optional: delta)
            case "WeekdayOfMonth":
                if (xmlSpecial.length == 2 || xmlSpecial.length == 3) {
                    var specialDate = new Date(quote.date.valueOf());

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

            // The last occurence of a specific day of week in the month.
            case "LastWeekdayOfMonth":
                if (tMonth == xmlMonth && xmlSpecial.length == 1 && xmlSpecial[0] == tDay) {
                    var specialDate = new Date(quote.date.valueOf());

                    specialDate.setDate(specialDate.getDate() + 7);

                    if (specialDate.getMonth() != tMonth) {
                        break;          // Match
                    }
                }

                continue;       // No match... next record

            // Must occur on a weekday (TODO BUG: Requires tDate to be 3 or larger.)
            case "WeekdayOnOrAfter":
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

            // Occurs only on specific years. SPECIAL=<StartYear> <Interval>
            case "SpecificYears":
                if (tMonth == xmlMonth && tDate == xmlDate) {
                    if (xmlSpecial.length == 2 && ((tYear - xmlSpecial[0]) % xmlSpecial[1]) == 0) {
                        break;          // Found a match...
                    }
                }

                continue;

                // Event occurs on a specific list of dates. SPECIAL=<YYYY-MM-DD> <...>
            case "ListOfDates":
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
                if ((xmlMonth == "" || tMonth == xmlMonth) && (xmlDate == "" || tDate == xmlDate) && (xmlYear == "" || tYear == xmlYear)) {
                    break;      // Match...
                }

                continue;

            case "Ignore":
            default:
                continue;
        }

        // If you get here, you have a match and should populate the quote object...

        // Holidays, birthdays and events are additive...

        thisEl = thisPage.getElementsByTagName("HOLIDAY");
        if (thisEl.length != 0) {
            if (quote.holiday.length > 0) {
                quote.holiday += " and ";
            }
            quote.holiday += thisEl[0].innerHTML;
        }

        thisEl = thisPage.getElementsByTagName("BIRTHDAY");
        if (thisEl.length != 0) {
            if (quote.birthday.length > 0) {
                quote.birthday += " and ";
            }
            quote.birthday+= thisEl[0].innerHTML;
        }

        thisEl = thisPage.getElementsByTagName("EVENT");
        if (thisEl.length != 0) {
            if (quote.event.length > 0) {
                quote.event += " and ";
            }
            quote.event += thisEl[0].innerHTML;
        }

        // Sayings and authors are singular -- first one wins.

        thisEl = thisPage.getElementsByTagName("SAYING");
        if (thisEl.length != 0 && quote.saying == "") {
            quote.saying = thisEl[0].innerHTML;

            thisEl = thisPage.getElementsByTagName("AUTHOR");
            thisEl.length == 0 ? quote.author = "" : quote.author = thisEl[0].innerHTML;
        }

        quote.isValid = true;

        if (bFindAll == false) {
            break;
        }
    }
}

function PADLoadXML(xmlFile) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            padDoc = this.responseXML;
        }
    };

    xhttp.open("GET", xmlFile, true);
    xhttp.send();
}

function QuoteObj(d) {
    this.isValid = false;
    this.date = new Date(d);
    this.holiday = "";
    this.birthday = "";
    this.event = "";
    this.saying = "";
    this.author = "";
}

QuoteObj.prototype.clone = function () {
    q = new QuoteObj(this.date);
    q.isValid = this.isValid;
    q.holiday = this.holiday;
    q.birthday = this.birthday;
    q.event = this.event;
    q.saying = this.saying;
    q.author = this.author;
    return q;
}