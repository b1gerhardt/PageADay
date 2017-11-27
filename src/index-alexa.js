'use strict';
/**
 * Copyright 2016 - 2017 Barry Gerhardt
 * All Rights Reserved.
 * Derived from historyBuff Amazon Alexa Sample. The original sample contained the following license text:
 *
 *     Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the 
 *     License. A copy of the License is located at http://aws.amazon.com/apache2.0/. This file is distributed on an "AS IS" BASIS, 
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing 
 *     permissions and limitations under the License.
 *
 * This file is licensed under the same terms. 
 *
 */

/**
 * This skill produces a Page-A-Day response for either the current day or a specific requested date. 
 * Operates as one-shot model only.
 *
 *
 * Example user interactions:
 *   User:  "Alexa, ask Page-A-Day about December thirtieth 2016."
 *   Alexa: "Your Page-A-Day for Friday, December thirtieth 2016 is [...]"
 *
 *   User:  "Alexa, open Page-A-Day for today"
 *   Alexa: "Your Page-A-Day for today, Friday, December thirtieth 2016 is [...]"
 *
 *   User:  "Alexa, open Page-A-Day"
 *   Alexa: "This skill is a Page-A-Day calendar. What day would you like hear?"
 *   User:  "Tomorrow"
 *   Alexa: "Your Page-A-Day for tomorrow, Saturday, December thirty-first 2016 is [...]"
 *
 * TODO: 
 *   Learn about persisting data (see score keeper sample) to allow users to specify their own data set
 *   If persistance won't work, build a web server to support account linking.
 */


/**
 * Globals:
 *   APP_ID         -- App ID for the skill. Replace with 'amzn1.echo-sdk.ams.app.[your-unique-value-here]';
 *                     ARN: arn:aws:lambda:us-east-1:365676617702:function:Page-A-Day-Skill
 *   https          -- loads https prototype and helper functions
 *   XMLHttpRequest -- Required for loading XML doc into DOM for parsing
 *   AlexaSkill     -- loads AlexaSkill prototype and helper functions
 *   alexaDateUtil  -- load date and time utilities to format responses appropriate for speech output.
 *   pageaday       -- loads PageADay prototype and helper functions
 *   xmlURL         -- location of the Page-A-Day XML data
 *   tzFudge_ms     -- Fake the timezone to Pacific-ish (GMT - 8 hours-ish). "Alexa Time" is always GMT.
 *                     Setting to Pacific gives reasonable results for most US users when they ask for relative dates such as 
 *                     "today" or "tomorrow." It will be incorrect around midnight for almost everyone. But, this is better than
 *                     being incorrect around 4:00p pacific without the shift.
 *                     Note: This is a static time shift hack -- it doesn't account for daylight savings.
 *   MyPAD          -- Instance of the Page-A-Day object (TODO: Store in session data vs. as global)
 */
const APP_ID         = 'amzn1.ask.skill.cc717bf1-68de-41ba-ba1e-a9eced0440fe'; 
const https          = require( 'https' );
const AlexaSkill     = require( './lib/alexa/alexaskills' );
const PAD            = require( './lib/pageaday/pageaday' );
const xmlURL         = 'https://www.pageaday.org/pageadaydatav5.xml';
const tzFudge_ms     = -8 * 60 * 60 * 1000;
const dayFudge_ms    = 24 * 60 * 60 * 1000;
var MyPAD = new PAD( "" );

/**
 * Page-A-Day is a child of AlexaSkill.
 */
var PageADaySkill = function () {
    AlexaSkill.call( this, APP_ID );
};

// Extend AlexaSkill
PageADaySkill.prototype = Object.create( AlexaSkill.prototype );
PageADaySkill.prototype.constructor = PageADaySkill;

PageADaySkill.prototype.eventHandlers.onSessionStarted = function ( sessionStartedRequest, session ) {
    console.log( "PageADaySkill onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId );

    // any session init logic would go here
};

PageADaySkill.prototype.eventHandlers.onLaunch = function ( launchRequest, session, response ) {
    console.log( "PageADaySkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId );

    getWelcomeResponse( response );
};

PageADaySkill.prototype.eventHandlers.onSessionEnded = function ( sessionEndedRequest, session ) {
    console.log( "PageADaySkill onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId );

    // any session cleanup logic would go here
};

PageADaySkill.prototype.intentHandlers = {

    "GetPageADayIntent": function ( intent, session, response ) {
        handlePageADayRequest( intent, session, response );
    },

    "AMAZON.HelpIntent": function ( intent, session, response ) {
        var speechText = "With Page-A-Day, you can get information about events, birthdays and anniversaries for any day. " +
            "Plus, you get a fun quote! " + 
            "For example, you could say today, or January twenty-first, or you can say exit. What day would you like?";
        var repromptText = "Which day do you want?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask( speechOutput, repromptOutput );
    },

    "AMAZON.CancelIntent": function ( intent, session, response ) {
        var speechOutput = {
            speech: "Goodbye",
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell( speechOutput );
    }
};

/**
 * Load the data...
 */

function loadXML( url, eventCallback ) {
    https.get( url, function ( res ) {
        var body = '';

        res.on( 'data', function ( chunk ) {
            body += chunk;
        } );

        res.on( 'end', function () {
            eventCallback( body );
        } );
    } ).on( 'error', function ( e ) {
        console.log( "Got error: ", e );
    } );
}

/**
 * Function to handle the onLaunch skill behavior
 */

function getWelcomeResponse( response ) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var cardTitle = "Page-A-Day";
    var repromptText = "This skill is a Page-A-Day calendar. What day would you like hear?";
    var speechText = "<p>Page-A-Day</p> <p>What day would you like to hear?</p>";
    var cardOutput = "What day would you like to hear?";

    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.askWithCard( speechOutput, repromptOutput, cardTitle, cardOutput );
}

/**
 * Loads data and prepares the speech to reply to the user.
 */

function handlePageADayRequest( intent, session, response ) {
    var daySlot = intent.slots.day;
    var genericText = "";
    var date = "";

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs

    // If the user provides a date, then use that, otherwise use today.
    // Hack: Added a custom slot to capture relative date utterances (today, tomorrow, yesterday). Without it, Alexa converts "today" 
    // to an actual date based on GMT. Without this hack, when a user says "Alexa, ask Page-A-Day for today" they will get tomorrow
    // if it's after about 4:00p on the West Coast. 
    //
    // Note to Alexa team: While I understand the need to maintain privacy, there is no harm in returning the local-time adjusted
    // date for these utterances since Alexa already converts this to a date. Yes, there are ways a developer could reverse engineer
    // the local time zone by being clever. That can be mitigated via the publishing process and possibly a new intent type.  

    if ( daySlot && daySlot.value ) {
        date = new Date( daySlot.value );
    } else {
        var todaySlot = intent.slots.mytoday.value || "";
        var timeFudge = tzFudge_ms;

        date = new Date();

        if ( todaySlot === "yesterday" ) {
            timeFudge -= dayFudge_ms;
        } else if ( todaySlot === "tomorrow" ) {
            timeFudge += dayFudge_ms;
        }

        date.setTime( date.getTime() + timeFudge );

    }

    loadXML( xmlURL, function ( xmlRaw ) {
        MyPAD.xmlRaw = xmlRaw;
        var result = MyPAD.generatePage((new Ymd(date)).toString());

        if ( result.isValid === false ) {
            response.tell ("There was a problem getting that page. Please try again later." );

        } else {
            console.log( "Title: " + result.title + " version " + result.version + "." );
            var formattedResult = MyPAD.getFormattedResult( result, "SPEECH" );

            var speechText = "<p>" + formattedResult.title + " Page-A-Day for " + formattedDate + "</p>";
            var cardTitle = formattedResult.title + " Page-A-Day";
            var cardContent = formattedResult.date + ". ";

            if ( formattedResult.holidays.length > 0 ) {
                speechText += "<p> " + formattedResult.holidays + "</p> ";
                cardContent += formattedResult.holidays + "\n";
            }

            if ( formattedResult.birthdays.length > 0 ) {
                speechText += "<p> Birthdays:" + formattedResult.birthdays + "</p> ";
                cardContent += "Birthdays: " + formattedResult.birthdays + "\n";
            }

            if (formattedResult.anniversaries.length > 0) {
                speechText += "<p> Anniversaries: " + formattedResult.anniversaries + "</p> ";
                cardContent += "Anniversaries: " + formattedResult.anniversaries + "\n";
            }

            if ( formattedResult.saying.length > 0 ) {
                speechText += "<p> " + formattedResult.saying + "</p> ";
                cardContent += formattedResult.saying + "\n";
            }

            var speechOutput = {
                speech: "<speak>" + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };

            response.tellWithCard( speechOutput, cardTitle, cardContent );
        }
    } );
}

// Create the handler that responds to the Alexa Request.
exports.handler = function ( event, context ) {
    // Create an instance of the PageADaySkill.
    var skill = new PageADaySkill();
    skill.execute( event, context );
};

