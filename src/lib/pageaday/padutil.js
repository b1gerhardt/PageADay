/* jslint node: true */
/* jshint node: true */
/* eslint no-extra-parens: { "nestedBinaryExpressions": false } */

'use strict';

////////////////////////////////////////////////////////////
//
// Ymd -- Date support for Page-A-Day. Ensures timezone differences don't affect results.
//
// Supports input and output in string, date, and {yy: year, mm: month, dd: date, dow: day} format (ymd)
//
// Usage:
//    var ymd = new Ymd ( year, month, date );          // All values are numbers. Month is 0-based
//    var ymd = new Ymd ( d );                          // Takes a Date object. Local time is used to determine yy, mm, dd values
//    var ymd = new Ymd ( "YYYY-MM-DD" );               // String returned by browser <input type="date"> controls
//
// Additional methods:
//    Ymd.setYmd( <as above> );                         // Used to update the objects value. Usage is the same as instantiation.
//    Ymd.toString();                                   // Returns a string in "YYYY-MM-DD" format.
//    Ymd.toDate();                                     // Returns a new Date object set to midnight local time.
//                                                      // Using local time means you can use Date methods to change the date
//
// Properties:
//   yy     // Number representing the year or undefined
//   mm     // Number representing the 0-based month or undefined
//   dd     // Number representing the 1-based date or undefined
//   dow    // Number representing the day or week. 0=Sunday, 1=Monday, ..., 6=Saturday or undefined
//          // dow should not be set directly. It is only calculated when {yy,mm,dd} represent a valid date.
//
// Notes:
//  1. Use caution when passing a Date object since the function may run in a different time zone.
//  2. Use caution when using Date.toISOString() to create a "YYYY-MM-DD" string since the conversion to zulu time might change the date.
//  3. Only use Ymd.toDate() output locally in your function. Avoid passing it it as a return value or parameter.
//  4. It is valid to pass undefined for any value. The PAD methods use this extensively to compare xml data.
//
////////////////////////////////////////////////////////////

function Ymd(d) {
    this.setYmd = function (d) {
        switch (Object.prototype.toString.call(d)) {
            case "[object String]":
                d = new Date(d.substr(0, 10));
                d.setTime(d.getTime() + (d.getTimezoneOffset() * 60000));     // Convert zulu to local time

            /* falls through */

            case "[object Date]":
                this.yy = d.getFullYear();
                this.mm = d.getMonth();
                this.dd = d.getDate();
                this.dow = d.getDay();
                break;

            case "[object Number]":
                this.yy = arguments[0];
                this.mm = arguments[1];
                this.dd = arguments[2];
                this.dow = (new Date(this.yy, this.mm, this.dd)).getDay();
                break;

            default:
                this.yy = this.mm = this.dd = this.dow = undefined;
                break;
        }
    };
    this.toString = function () {
        return (new Date(this.yy, this.mm, this.dd)).toISOString().substr(0, 10);
    };
    this.toDate = function () {
        var d = new Date(this.yy, this.mm, this.dd);
        d.setTime(d.getTime() + (d.getTimezoneOffset() * 60000));           // Convert zulu to local time
        return d;
    };

    this.setYmd.apply(this, arguments);
}

// This code is run in both a client-side browser and server-side node.js. 
// When loaded with a nodes.js "required" statement, module is declared and this assignment helps control scope.
// When loaded with a browser script statement, module is not declared.
if (typeof module !== 'undefined') {
    module.exports = Ymd;
}
