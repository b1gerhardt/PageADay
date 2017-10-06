# PageADay
Page-A-Day Calendar for Web, Alexa and Print. Currently hosted at: http://pageaday.org

## History
* 2016-12-03 Checked-in first functioning version. Core logic is complete and can be accessed via a simple web interface.
* 2016-12-28 Added basic Alexa skill wrapper
* 2017-10-05 Updated to reflect latest implementation and plans

## Abstract
This project is a Page-A-Day calendar app. The goal is to support Web, Alexa and Print (via mail merge) with a single Javascript source that
works both in browsers and Node.js.

The **Web** interface displays a single Page-A-Day page for any date selected. Default is *today*.  
The **Alexa** skill interface speaks the Page-A-Day page.  
The **print** interface has not been fully designed yet. The goal is allow the same data set to be used to
generate a full year calendar that can be printed.

## Creating A Dataset
The XML Schema (`pageaday.xsd`) defines the Page-A-Day data structure.

The header describes the **Title**, **Version**, and **Theme** of the data. **Theme**, when implemented, will simplify 
creating data sets by adding a **Saying** from various web API's when no explicit **Saying** is provided.
The __\<PAGES\>__ tag contains the database and __<\PAGE\>__ tags contain each record.

Full documentation on creating a dataset is provided at http://pageaday.org/how-to.html. 

## Using the PAD "class"
Load the XML dataset into memory. Then, instantiate a new PAD object:

```javascript
    var dataset = <raw XML dataset>;

    // This is an expensive function. It parses the entire XML to create a first-pass structured copy of the data.
    var MyPAD = new PAD( dataset );

    // dataset may now be destroyed if desired.
```

You can generate a Page-A-Day result as follows:

```javascript
    // Replace "YYYY-MM-DD" with a specific date. For example "2017-01-21"
    var result = MyPAD.generatePage("YYYY-MM-DD");
```

The Page-A-Day result can be parsed and formatted directly. Or, use the function below to beautify the result for a given output type:

```javascript
    // Valid output types are: "WEB", "SPOKEN", and "CSV" (not currently implemented)
    var fmtResult = MyPAD.getFormattedResult( result, "WEB" );
```

For browser-based implementations, use `index-web.js` as a template.  
For Node.js-based implementations, use `node-tester.js` as a template.
For Alexa-based implementations, use `index-alexa.js` as a template.

## Web Usage

If called with no parameters, returns the Page-A-Day result for _today_ (based on the timezone where the code is executing).  
Optional parameters are `Path` and `Date`. For example:

```URI
    http://pageaday.org?Path=http://yourdomain.com/data.xml&Date=2017-01-21
```

## Alexa Usage

Currently supports only one-shot model.

### Examples

Example user interactions:  
   User:  "Alexa, ask Page-A-Day about December thirtieth 2016."  
   Alexa: "Your Page-A-Day for Friday, December thirtieth 2016 is [...]"

   User: "Alexa, open Page-A-Day"  
   Alexa: "Your Page-A-Day for today, Friday, December thirtieth 2016 is [...]"  

## Print Usage

Not supported yet.  
Plan is to support input parameter of date, date range or year.
Then, output CSV that can be used as input to mailmerge or a full set of rendered pages for direct printing.

# Developer Notes for Setting Up an Alexa Skill

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

## Icon and Image Copyright Notice

The current icons being used (as of 2017-05-08) were downloaded from clker.com and are
in the public domain.  The art was originally uploaded (and presumably created) by 
Frantz Leuenberger.

Images used for the Web are from Microsoft Publisher clip-art.
