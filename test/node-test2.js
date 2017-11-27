const https = require('https');
const http = require('http');

var urlPrefix = 'http://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&explaintext=&exsectionformat=plain&redirects=&titles=';
var url = urlPrefix + "January_21";

var themeAry = [];
var themeText = "";
var pending = true;

console.log("About to call https.get()");

http.get(url, (res) => {
    console.log("https.get response callback...");
    var body = '';
    var count = 0;

    res.on('data', (chunk) => {
        count += 1;
        body += chunk;
        console.log("Got chunk. Total chunks: " + count);
    });

    res.on('end', () => {
        var text = inputText.substring(inputText.indexOf("\\nEvents\\n") + 10, inputText.indexOf("\\n\\n\\nBirths"));
        var themeAry = text.split();
        var pending = false;
        console.log("Got end. Size of data: " + body.length);
    });
}).on('error', (e) => {
    console.log("Got error: ", e);
});

console.log("Finished calling https.get()");

var loops = 0;
while (pending) {
    loops += 1;

    if ( loops > 10000 ) {
        break;
    }
}

console.log("Waited for " + loops + " loops.");

console.log ("Result: " + themeAry);

process.exit();
