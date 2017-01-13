'use strict';
// PAD the Page-A-Day generator
// Written by Barry Gerhardt
// 2016-12-28
//
// This JS contains the web wrapper for the PAD class

var MyPAD = new PAD( "" );

// Change this to change where the data comes from...
var xmlSource = 'https://dl.dropboxusercontent.com/u/78793611/pageadaydatav5.xml';


function PADWebInit() {
    // Process date for web prototype
    document.forms[0].onsubmit = function () { return PADWebGetQuote() };

    PADWebLoadXML( xmlSource );
}

function PADWebLoadXML( src ) {
    var xhttp = new XMLHttpRequest();

    xhttp.overrideMimeType( "text/xml" );

    xhttp.onreadystatechange = function () {
        if ( this.readyState === 4 && this.status === 200 ) {
            MyPAD.xmlRaw = this.responseText;
            console.log( "Data loaded successfully" );
        }
    };

    xhttp.open( "GET", src, true );
    xhttp.send();
}

function PADWebPrettyDate(d) {
    var dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    var result = dowNames[d.getDay()] + ", " + monthNames[d.getMonth()] + d.getDate() + ", " + d.getFullYear();

    return result;
}

function PADWebGetQuote() {
    // Get user selected date and fix timezone so the full date object is midnight local time on the proper day
    MyPAD.getQuote(new Date(document.forms[0]["nameUserDate"].value));

    var result = MyPAD.result;

    document.getElementById("PADTitle").innerHTML = result.title + " version " + result.version;

    if (result.isValid == false) {
        document.getElementById("PADQuote").innerHTML = "Invalid Date...";
        document.getElementById("PADHoliday").innerHTML = "";
        document.getElementById("PADAnniversary").innerHTML = "";
        document.getElementById("PADBirthday").innerHTML = "";
        document.getElementById("PADSaying").innerHTML = "";
        document.getElementById("PADAuthor").innerHTML = "";
    } else {
        document.getElementById("PADQuote").innerHTML = "Quote for " + PADWebPrettyDate(result.date) + "...";
        document.getElementById( "PADHoliday" ).innerHTML = "Holiday: " + MyPAD.getFormattedHoliday( result.holidays );
        document.getElementById( "PADAnniversary" ).innerHTML = "Anniversary: " + MyPAD.getFormattedAnniversary( result.anniversaries );
        document.getElementById( "PADBirthday" ).innerHTML = "Birthday: " + MyPAD.getFormattedBirthday( result.birthdays );
        document.getElementById("PADSaying").innerHTML = "Saying: " + result.saying;
        document.getElementById("PADAuthor").innerHTML = "Author: " + result.author;

    }

    return false; // TBD: Always return false for now to avoid a page reload that would clear the results
}
