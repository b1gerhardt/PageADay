'use strict';
// PAD the Page-A-Day generator
// Written by Barry Gerhardt
// 2016-12-28
//
// This JS contains the web wrapper for the PAD class

var MyPAD = new PAD( "" );

// Change this to change where the data comes from...
var xmlSource = 'pageadaydatav5.xml';


function PADWebInit() {
    // Start the asynch XML data source load
    PADWebLoadXML( xmlSource );

    // Initialize to today for first page load
    var s = MyPAD.toISOStringNoTZ( new Date( Date.now() ) ).substr( 0, 10 );

    document.forms[0]["nameStartDate"].value = s;
    document.forms[0]["nameEndDate"].value = s;
}

function PADWebLoadXML( src ) {
    var xhttp = new XMLHttpRequest();

    xhttp.overrideMimeType( "text/xml" );

    xhttp.onreadystatechange = function () {
        if ( this.readyState === 4 && this.status === 200 ) {
            console.log( "Data loaded successfully" );
            //MyPAD.xmlRaw = this.responseText;
            //MyPAD.initData( this.responseText );
            PADWebDataReady( this.responseText );
        }
    };

    xhttp.open( "GET", src, true );
    xhttp.send();
}

function PADWebDataReady( xml ) {
    MyPAD.initData( xml );
    PADWebGetQuote( 0 );
}

function PADWebGetQuote(delta) {
    // Get user selected date and fix timezone so the full date object is midnight local time on the proper day
    var d = MyPAD.getDateNoTZ( new Date( document.forms[0]["nameStartDate"].value ) );

    if ( delta ) {
        d.setDate( d.getDate() + delta );
        document.forms[0]["nameStartDate"].value = MyPAD.toISOStringNoTZ( d ).substr( 0, 10 );
    }

    //MyPAD.getQuote(new Date(document.forms[0]["nameStartDate"].value));
    var result = MyPAD.getQuote( d );

    //document.getElementById( "PADExport" ).innerHTML = ""; // Clear export (TODO: clean up presentation)

    if (result.isValid == false) {
        document.getElementById( "PADVersion" ).innerHTML = "";
        document.getElementById( "PADMonthYear" ).innerHTML = "";
        document.getElementById( "PADDay" ).innerHTML = "";
        document.getElementById( "PADDOW" ).innerHTML = "";
        document.getElementById( "PADSaying" ).innerHTML = "Error loading data";
        document.getElementById( "PADAuthor" ).innerHTML = "";
        document.getElementById( "PADHoliday" ).innerHTML = "";
        document.getElementById( "PADBirthday" ).innerHTML = "";
        document.getElementById( "PADAnniversary" ).innerHTML = "";
    } else {
        var fmtResult = MyPAD.getFormattedResult( result, "WEB" );

        document.getElementById( "PADPicture" ).src = "./artassets/medium-" + ( Number( result.date.getMonth() ) + 1 ) + ".png";

        document.getElementById( "PADVersion" ).innerHTML = fmtResult.title + " version " +fmtResult.version;
        document.getElementById( "PADMonthYear" ).innerHTML = fmtResult.dMonth + " " + fmtResult.dYear;
        document.getElementById( "PADDay" ).innerHTML = fmtResult.dDay;
        document.getElementById( "PADDOW" ).innerHTML = fmtResult.dDOW;
        document.getElementById( "PADSaying" ).innerHTML = fmtResult.saying;
        document.getElementById( "PADAuthor" ).innerHTML = fmtResult.author;
        document.getElementById( "PADHoliday" ).innerHTML = fmtResult.holidays;
        document.getElementById( "PADBirthday" ).innerHTML = fmtResult.birthdays;
        document.getElementById( "PADAnniversary" ).innerHTML = fmtResult.anniversaries;
    }

    // This is now processed via a button and onclick. No need to return anything.
    //return false; // TBD: Always return false for now to avoid a page reload that would clear the results
}

function PADWebDoExport() {
    return;     // TODO: Add a frame for the export. Hide web view. Use <li> for each

    // Ensure we get the date in local time as the user sees it.
    var startDate = MyPAD.getDateNoTZ( new Date( document.forms[0]["nameStartDate"].value ) );
    var endDate = MyPAD.getDateNoTZ( new Date( document.forms[0]["nameEndDate"].value ) );
    var s = "";

    // Always do at least the first date (even if the second date is earlier)
    do {
        var result = MyPAD.getQuote( startDate );

        if ( result.isValid == true ) {
            var fmtResult = MyPAD.getFormattedResult( result, "CSV" );
            // The CSV format is as follows: YEAR, MONTH, DAY, MONTH-NAME, DAY-OF-WEEK, HOLIDAYS, ANNIVERSARIES, BIRTHDAYS, SAYING, AUTHOR
            s += fmtResult.date + ",";
            s += "\"" + fmtResult.holidays + "\",";
            s += "\"" + fmtResult.anniversaries + "\",";
            s += "\"" + fmtResult.birthdays + "\",";
            s += "\"" + result.saying + "\",";
            s += "\"" + result.author + "\"\n";
        }

        startDate.setDate( startDate.getDate() + 1 );

    } while ( startDate <= endDate );

    document.getElementById( "PADExport" ).innerHTML = s;

}