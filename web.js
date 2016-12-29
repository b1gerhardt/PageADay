'use strict'
// PAD the Page-A-Day generator
// Written by Barry Gerhardt
// 2016-12-28
//
// This JS contains the web wrapper for the PAD class

var MyPAD = new PAD();

function PADWebInit() {
    // Process date for web prototype
    document.forms[0].onsubmit = PADWebGetQuote();

    MyPAD.loadXML("pageadaydata.xml");
}

function PADWebGetQuote() {
    // Get user selected date and fix timezone so the full date object is midnight local time on the proper day
    MyPAD.getQuote(document.forms[0]["nameUserDate"].value);

    var result = MyPAD.result;

    document.getElementById("PADTitle").innerHTML = result.title;

    if (result.isValid == false) {
        document.getElementById("PADQuote").innerHTML = "Invalid Date...";
        document.getElementById("PADHoliday").innerHTML = "";
        document.getElementById("PADEvent").innerHTML = "";
        document.getElementById("PADBirthday").innerHTML = "";
        document.getElementById("PADSaying").innerHTML = "";
        document.getElementById("PADAuthor").innerHTML = "";
    } else {
        document.getElementById("PADQuote").innerHTML = "Quote for " + result.date.toDateString() + "...";
        document.getElementById("PADHoliday").innerHTML = "Holiday: " + result.holiday;
        document.getElementById("PADEvent").innerHTML = "Event: " + result.anniversary;
        document.getElementById("PADBirthday").innerHTML = "Birthday: " + result.birthday;
        document.getElementById("PADSaying").innerHTML = "Saying: " + result.saying;
        document.getElementById("PADAuthor").innerHTML = "Author: " + result.author;

    }

    return false; // TBD: Always return false for now to avoid a page reload that would clear the results


}
