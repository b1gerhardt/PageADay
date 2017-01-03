# PageADay
Page-A-Day Calendar for Web, Alexa and Print

## HISTORY
2016-12-03 Checked-in 1.0 version. Core logic is complete and can be accessed via a simple web interface.
2016-12-28 Added basic Alexa skill wrapper

## ABSTRACT
This project is a Page-A-Day calendar app. The goal is to support Web, Alexa and Print (well, actually mail merge) outputs.
The Web interface will display a single "page" for any date selected. Default is "today"
The Alexa skill interface will say the "page." 
The print interface has not been fully designed yet. The goal is allow the same data set to be used to generate a full year calendar 
that can be printed. 

## JAVASCRIPT CLASS USAGE
The XML Schema provides for three types of pages: HOLIDAYS, PAGES and DEFAULT.

	* HOLIDAYS contains a collection of records that describe holidays and other events. The intent is for these records to be more or less generic. That is, national holidays, religious holidays, etc. The XML Schema (pageaday.xsd) defines special TYPEs handle both static holidays and those that move each year. All records from this collection are read and merged as appropriate.
	* PAGES contains the main entries. The intent is for these to be primarily static days. You can enter just DAY and MONTH to have a record apply to every year. Or, you can enter DAY, MONTH and YEAR if you only want it to apply to a specific year. This is useful, for example, to highlight milestone anniveraries or birthdays while keeping a more generic message for other years. More specific records should appear first since only the first match is used from this collection.
	* DEFAULT contains a single record that will be used if nothing else matches.

The Page-A-Day result is a pseudo-merge of HOLIDAYS(all matching) + PAGES(first match) + DEFAULT(complete any empty fields.

The XML schema and source desribe additional detail.

## TODO LIST
1. Ask for the next holiday, anniversary or birthday
2. Restructure XML Schema so Birthdays and Anniversarys are more natural to enter and support starting year so we can say "Happy Nth Birthday", etc.
3. Support enhanced content for voice (either Alexa SSML or MP3), Web (links, pictures), and Print (pictures)
4. Support differentiated response for voice, web and print. For example, voice might say "Happy 32nd Anniversary Mary and Joe" while Web and Print would say "Mary and Joe 32nd Anniversay"
5. Support list of un-dated sayings. Avoid duplicates throughout the year and ensure same order every year (use year as random seed)

## WEB USAGE

The page takes no parameters. It will allow you to select a date and will display the quote information for that date

## ALEXA USAGE

Currently supports only one-shot model.

### Examples

Example user interactions:
    User:  "Alexa, ask Page-A-Day about December thirtieth 2016."
    Alexa: "Your Page-A-Day for Friday, December thirtieth 2016 is [...]"

	User: "Alexa, open Page-A-Day"
	Alexa: "Your Page-A-Day for today, Friday, December thirtieth 2016 is [...]"

## PRINT USAGE

TODO: Not supported yet.
Plan is to support input parameter of date, date range or year. Then, output XML that can be used as input to mailmerge. Possibly, just output HTML rendered pages?

# DEVELOPER NOTES

## Setup
To run this skill you need to do two things. The first is to deploy the code in lambda, and the second is to configure the Alexa skill to use Lambda.

### AWS Lambda Setup
1. Go to the AWS Console and click on the Lambda link. Note: ensure you are in us-east or you won't be able to use Alexa with Lambda.
2. Click on the Create a Lambda Function or Get Started Now button.
3. Skip the blueprint
4. Name the Lambda Function "Page-A-Day-Skill".
5. Select the runtime as Node.js
6. Go to the the src directory, select all files and then create a zip file, make sure the zip file does not contain the src directory itself, otherwise Lambda function will not work.
7. Select Code entry type as "Upload a .ZIP file" and then upload the .zip file to the Lambda
8. Change the Handler to index-alexa.handler (this refers to the main js file in the zip).
9. Create a basic execution role and click create.
10. Leave the Advanced settings as the defaults.
11. Click "Next" and review the settings then click "Create Function"
12. Click the "Event Sources" tab and select "Add event source"
13. Set the Event Source type as Alexa Skills kit and Enable it now. Click Submit.
14. Copy the ARN from the top right to be used later in the Alexa Skill Setup

### Alexa Skill Setup
1. Go to the [Alexa Console](https://developer.amazon.com/edw/home.html) and click Add a New Skill.
2. Set "Page-A-Day" for the skill name and "page a day" as the invocation name, this is what is used to activate your skill.
3. Copy the Intent Schema from the included IntentSchema.json. 
   (Note, this skill only uses built-in slots so there is no need to enter any custom slot types)
4. Copy the Sample Utterances from the included SampleUtterances.txt. Click Next.
5. Select the Lambda ARN for the skill Endpoint and paste the ARN copied from above. Click Next.
6. [optional] go back to the skill Information tab and copy the appId. Paste the appId into the index.js file for the variable APP_ID,
   then update the lambda source zip file with this change and upload to lambda again, this step makes sure the lambda function only serves request from authorized source.
7. You are now able to start testing your sample skill! You should be able to go to the [Echo webpage](http://echo.amazon.com/#skills) and see your skill enabled.
8. In order to test it, try to say some of the Sample Utterances from the Examples section below.
9. Your skill is now saved and once you are finished testing you can continue to publish your skill.

