# PageADay
Page-A-Day Calendar for Web, Alexa and Print

HISTORY
2016-12-03 Checked-in 1.0 version. Core logic is complete and can be accessed via a simple web interface.
2016-12-28 Added basic Alexa skill wrapper

ABSTRACT
This project is a Page-A-Day calendar app. The goal is to support Web, Alexa and Print (well, actually mail merge) outputs.
The Web interface will display a single "page" for any date selected. Default is "today"
The Alexa skill interface will say the "page." 
The print interface has not been fully designed yet. The goal is allow the same data set to be used to generate a full year calendar 
that can be printed. 

USAGE
The XML Schema provides for three types of pages: HOLIDAYS, PAGES and DEFAULT.

HOLIDAYS contains a collection of records that describe holidays and other events. The intent is for these records to be more or less generic. That is, national holidays, religious holidays, etc. The XML Schema (pageaday.xsd) defines special TYPEs handle both static holidays and those that move each year. All records from this collection are read and merged as appropriate.

PAGES contains the main entries. The intent is for these to be primarily static days. You can enter just DAY and MONTH to have a record apply to every year. Or, you can enter DAY, MONTH and YEAR if you only want it to apply to a specific year. This is useful, for example, to highlight milestone anniveraries or birthdays while keeping a more generic message for other years. More specific records should appear first since only the first match is used from this collection.

DEFAULT contains a single record that will be used if nothing else matches.

The Page-A-Day result is a pseudo-merge of HOLIDAYS(all matching) + PAGES(first match) + DEFAULT(complete any empty fields.

The XML schema and source desribe additional detail.
