'use strict';
/**
    Copyright 2016 - 2017 Barry GerhardtAll Rights Reserved.
    Derived from historyBuff Amazon Alexa Sample.

    Licensed under The MIT License (the "License"). I copy of the License is in the "license" file accompanying this project. 
    This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
    See the License for the specific language governing permissions and limitations under the License.

    NOTE: The original Amazon sample (this file only) was licensed under Apache License, Version 2.0 (http://aws.amazon.com/apache2.0). 
    TODO: Reconcile licenses and make sure they are both consistent and proper given derived sources.
*/

/**
 * This skill produces a Page-A-Day response for either the current day or a specific requested date. 
 * Operates as one-shot model only.
 *

 Example user interactions:
    User:  "Alexa, ask Page-A-Day about December thirtieth 2016."
    Alexa: "Your Page-A-Day for Friday, December thirtieth 2016 is [...]"

	User: "Alexa, open Page-A-Day"
	Alexa: "Your Page-A-Day for today, Friday, December thirtieth 2016 is [...]"

 * Examples:
 * User:  "Alexa, ask Page-A-Day about December thirtieth 2016."
 * Alexa: "Your Page-A-Day for Friday, December thirtieth 2016 is [...]"
 *
 * User:  "Alexa, open Page-A-Day"
 * Alexa: "Your Page-A-Day for today, Friday, December thirtieth 2016 is [...]"
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
 *                     Setting to Pacific is the best compromise since it only breaks midnight - 3:00a for the east coast vs. 
 *                     giving the wrong date starting at 4:00p on the west coast.
 *                     TODO: Still broken if the user asks for "today" or "<date>" where <date> = today since those are returned as dates and we lose
 *                           the ability to determine what the user actually said.
 *   MyPAD          -- Instance of the Page-A-Day object
 */
const APP_ID         = 'amzn1.ask.skill.cc717bf1-68de-41ba-ba1e-a9eced0440fe'; 
const https          = require( 'https' );
const AlexaSkill     = require( './AlexaSkill' );
const alexaDateUtil  = require( './alexaDateUtil' );
const PAD            = require( './PageADay' );
const xmlURL         = 'https://dl.dropboxusercontent.com/u/78793611/pageadaydata.xml';
const tzFudge_ms     = -8 * 60 * 60 * 1000; 
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
    // TODO: Replace with getQuote...
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
    var speechText = "<p>Page-A-Day.</p> <p>What day would you like to hear?</p>";
    var cardOutput = "Page-A-Day. What day would you like to hear?";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.

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
    var repromptText = "With Page-A-Day, you can get information about events, birthdays and anniversaries for any day. For example, you could say today, or January twenty-first, or you can say exit. What day would you like?";
    var genericText = "";
    var date = "";

    // If the user provides a date, then use that, otherwise use today.
    // Note: Can't get timezone for a device and server returns GMT. So, we can fix-ish the time for not date but can't fix if a date (or "today") is provided.
    // Hack: Added a custom slot to capture "today." This fixes the no date and "today" utterances. tomorrow is still broken but can be fixed... TODO.
    if ( daySlot && daySlot.value ) {
        date = new Date( daySlot.value );
    } else {
        date = new Date();
        date.setTime( date.getTime() + tzFudge_ms ); 
    }

    loadXML( xmlURL, function ( xmlRaw ) {
        MyPAD.xmlRaw = xmlRaw;
        var result = MyPAD.getQuote( date );

        if ( result.isValid === false ) {
            response.tell ("There was a problem getting that page. Please try again later." );

        } else {
            console.log ( "Title: " + result.title + " version " + result.version + ".");

            var speechText = "<p>" + result.title + " Page-A-Day for " + alexaDateUtil.getFormattedDate(result.date) + ", </p>";
            var cardTitle = result.title + " Page-A-Day";
            var cardContent = "For " + alexaDateUtil.getFormattedDate(result.date) + " ";
        
            if (result.holiday.length > 0) {
                genericText = result.holiday;
                speechText += "<p> " + genericText + "</p> ";
                cardContent += genericText + ". ";
            }
            if (result.anniversary.length > 0) {
                genericText = result.anniversary + " are having an anniversary today.";
                speechText += "<p> " + genericText + "</p> ";
                cardContent += genericText + " ";
            }
            if (result.birthday.length > 0) {
                genericText = "It's " + result.birthday + "'s birthday today.";
                speechText += "<p> " + genericText + "</p> ";
                cardContent += genericText + " ";
            }
            if (result.saying.length > 0) {
                genericText = "As " + result.author + " says... " + result.saying + ".";
                speechText += "<p>" + genericText + ".</p> ";
                cardContent += genericText + " ";
            }

            // speechText += "<p>Want info for another date?</p>";

            var speechOutput = {
                speech: "<speak>" + speechText + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            var repromptOutput = {
                speech: repromptText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            // TODO: tellWithCard is broken and I haven't had a chance to easily debug. Changing to just tell for now...
            response.tell( speechOutput );
            //response.tellWithCard( speechOutput, repromptOutput, cardTitle, cardContent );
        }
    } );
}

// Create the handler that responds to the Alexa Request.
exports.handler = function ( event, context ) {
    // Create an instance of the PageADaySkill.
    var skill = new PageADaySkill();
    skill.execute( event, context );
};

