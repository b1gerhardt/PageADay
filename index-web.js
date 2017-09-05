'use strict';
// PAD the Page-A-Day generator
// Written by Barry Gerhardt
// 2016-12-28
//
// This JS contains the web wrapper for the PAD class

var MyPAD = new PAD( "" );

// Change this to change where the data comes from...
var xmlSource = 'pageadaydata.xml';

// Pre-load images for better response...
for ( var i = 1; i <= 12; i++ ) {
    var image = new Image();
    image.src = "./artassets/medium-" + i + ".png";
}

function PADWebInit() {
    // Start the asynch XML data source load
    PADWebLoadXML( xmlSource );

    // Initialize to today for first page load
    var ymd = new Ymd(new Date());

    document.forms[0]["nameStartDate"].value = ymd.toString();
    document.forms[0]["nameEndDate"].value = ymd.toString();
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
    PADWebProcessForm( "StartDate" );
}

function PADWebProcessForm(command) {
    var startDate = (new Ymd(document.forms[0]["nameStartDate"].value)).toDate();
    var endDate = (new Ymd(document.forms[0]["nameEndDate"].value)).toDate();

    switch ( command ) {
        case "Today":
            startDate = new Date();
            break;

        case "Previous":
            startDate.setDate( startDate.getDate() - 1 );
            break;

        case "Next":
            startDate.setDate( startDate.getDate() + 1 );
            break;

        case "Export":
            break;

        case "StartDate":
        default:
            break;
    }

    if ( endDate < startDate ) {
        endDate = startDate;
    }

    // Update Form...
    document.forms[0]["nameStartDate"].value = (new Ymd(startDate)).toString();
    document.forms[0]["nameEndDate"].value = (new Ymd(endDate)).toString();

    var result = MyPAD.generatePage((new Ymd(startDate)).toString());

    //document.getElementById( "PADExport" ).innerHTML = ""; // Clear export (TODO: clean up presentation)

    if ( result.isValid === false ) {
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

        document.getElementById( "PADPicture" ).src = "./artassets/medium-" + ( result.ymd.mm + 1 ) + ".png";

        document.getElementById( "PADVersion" ).innerHTML = fmtResult.title + " version " + fmtResult.version;
        document.getElementById( "PADMonthYear" ).innerHTML = fmtResult.ymdS.mm + " " + fmtResult.ymdS.yy;
        document.getElementById( "PADDay" ).innerHTML = fmtResult.ymdS.dd;
        document.getElementById( "PADDOW" ).innerHTML = fmtResult.ymdS.dow;
        document.getElementById( "PADSaying" ).innerHTML = fmtResult.saying;
        document.getElementById( "PADAuthor" ).innerHTML = fmtResult.author;
        document.getElementById( "PADHoliday" ).innerHTML = fmtResult.holidays;
        document.getElementById( "PADBirthday" ).innerHTML = fmtResult.birthdays;
        document.getElementById( "PADAnniversary" ).innerHTML = fmtResult.anniversaries;
    }
}

function PADWebDoExport() {
    // Ensure we get the date in local time as the user sees it.
    var startDate = MyPAD.toDateObject(document.forms[0]["nameStartDate"].value);
    var endDate = MyPAD.toDateObject(document.forms[0]["nameEndDate"].value);
    var s = "";

    // Always do at least the first date (even if the second date is earlier)
    do {
        var result = MyPAD.generatePage((new Ymd(startDate)).toString());

        if ( result.isValid === true ) {
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
