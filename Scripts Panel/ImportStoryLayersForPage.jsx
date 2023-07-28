//@include "JSON-js/json2.js"
//@include "wwn-env.js";
// noinspection ES6ConvertVarToLetConst,SpellCheckingInspection

/*
Retrieve story content from an API endpoint and bring it into InDesign content layers.
Created for the Western Wayne News, https://westernwaynenews.com/
Originally authored by Brian Pifer, modified by Chris Hardie.
IMPORTANT: The first lines in this file that look like comments are actually preprocessor
directives that Adobe JSX understands; DO NOT DELETE.
 */

/*
Read a JSON object from a file on disk and return the data.
@param File
@returns JSON object
 */
const readJSONFile = function (f) {
    f.encoding = "UTF-8";
    f.open("r");
    var data = f.read();
    f.close();
    if (data === "") {
        alert("No JSON found, something is wrong.");
        return null;
    }
    data = JSON.parse(data);
    // To debug, uncomment:
    // printObj(data);
    return data;
};

/*
Take the JSON data retrieved from the API and convert it into something useful to InDesign
 */
var processData = function(json, page, doc, imgFol) {
    var count = Number(json.count);
    var bystyle = doc.paragraphStyles.itemByName("Byline");
    if (isNaN(count)) {
        alert("Could not get # of stories from 'count' field. Check data and try again.");
        return;
    }
    if (0 === count) {
        alert("No stories ready for placement were found for this page. All done!");
        return;
    }
    var grouptemplate = page.parent.groups.itemByName("story_group");
    if (!grouptemplate.isValid) {
        alert("Could not get 'story_group' group on page's spread. Exiting.");
        return;
    }
    var i = 0;
    var storyLay, o, ln;
    for (i; i < count; i++) {
        o = json.data[i];
        ln = o.id;
        if (!o.headline) {
            alert("No headline for " + o.id + ". Headline won't be used for layername");
        }
        else {
            ln += "_" + o.headline.toLowerCase().split(" ").join("_");
        }
        storyLay = doc.layers.itemByName(ln);
        if (!storyLay.isValid) {
            storyLay = doc.layers.add({name: ln});
            //only process stories that did not already have a layer
            processStory(storyLay, o, grouptemplate, bystyle, imgFol);
        }
    }
}

/*
For certain patterns in the text, convert to appropriate character styles
Do this for both body copy and cutlines
 */
var findReplace = function(story) {
    var findWhats = [
        "\\*\\*([^**]+)\\*\\*",   // 0. Bold
        "_([^_|\\r]+)_",    // 1. Italics
        "^\\\\?*(?<! )",  // 2. Bullet points
        "\\n+"  // Line breaks
    ];
   
    myChangeGrep(
        {findWhat: findWhats[3]}, 
        {changeTo: "\\r"},
        story
    );
    myChangeGrep(
        {findWhat: findWhats[1], appliedParagraphStyle: "Bodycopy"}, 
        {changeTo: "$1", appliedCharacterStyle: "Body Italic"},
        story
    );
    myChangeGrep(
        {findWhat: findWhats[0], appliedParagraphStyle: "Bodycopy"}, 
        {changeTo: "$1", appliedCharacterStyle: "Body Bold"},
        story
    );
    myChangeGrep(
        {findWhat: findWhats[1], appliedParagraphStyle: "Cutline"}, 
        {changeTo: "$1", appliedCharacterStyle: "Photo credit"},
        story
    );
    
    myChangeGrep(
        {findWhat: findWhats[2]}, 
        {changeTo: "n~>", appliedCharacterStyle: "Bullet 11 pt."},
        story
    );

}

/*
For a valid story, fill out the contents of the InDesign layer
 */
var processStory = function(layer, obj, grouptemplate, bystyle, imgFol) {
    var g = grouptemplate.duplicate(layer);
    var headTf = g.textFrames.itemByName("headline");
    var subTf = g.textFrames.itemByName("subhead");
    var bodyTf = g.textFrames.itemByName("body");
    var cutlineTf = g.textFrames.itemByName("cutline");
    var imgFrame = g.rectangles.itemByName("img");
    //do headline
    if (obj.headline) {
        headTf.parentStory.contents = obj.headline;
    }
    else {
        headTf.remove();
    }
    //do subhead
    if (obj.subhead) {
        subTf.parentStory.contents = obj.subhead;
    }
    else {
        subTf.remove();
    }
    //do body
    if (obj.body) {
        bodyTf.parentStory.contents = obj.body;
        if (obj.byline) {
            bodyTf.parentStory.insertionPoints.item(0).contents = obj.byline + "\r";
            if (bystyle.isValid) {
                bodyTf.parentStory.insertionPoints.item(0).applyParagraphStyle(bystyle);
            }
        }
        findReplace(bodyTf.parentStory);
    }
    else {
        alert("No body copy found for " + obj.id);
    }
    //do cutline
    if (obj.cutline) {
        cutlineTf.parentStory.contents = obj.cutline;
        findReplace(cutlineTf.parentStory);
    }
    else {
        cutlineTf.remove();
    }
    //do img
    if (obj.image_url) {
        try {
            var img = getMacImage(obj.image_url, imgFol);
            //var img = imgFol.getFiles("*.jpg")[0];
            imgFrame.place(img);
            imgFrame.fit(FitOptions.FRAME_TO_CONTENT);
        } catch(e) {
            alert("Could not get image from " + obj.image_url + ". " + e);
        }
    }
    else {
        imgFrame.remove();
    }
}

//----------------------------------------------------------------
// Utility Functions
//----------------------------------------------------------------

//helper function to print an object
var printObj = function(obj) {
    for (var i in obj) {
        $.writeln("\t" + i + ": " + obj[i]);
        if (obj[i] instanceof Object) {
            printObj(obj[i]);
        }
    }
}

var parsePageNum = function(s) {
    var rx = /pg \d+/gi;
    if (!rx.test(s)) {
        alert("Cannot get page number from " + s);
        return undefined;
    }
    return s.match(rx)[0].split(" ")[1];
}


/*
Helper funciton to facilitate easy, robust grep/regex replacements
 */
var myChangeGrep = function( findPrefs, changePrefs, story ) {

    app.findGrepPreferences = NothingEnum.NOTHING;
    app.changeGrepPreferences = NothingEnum.NOTHING;
    app.findChangeGrepOptions.includeMasterPages = true;

    for ( var i in findPrefs ) {
        app.findGrepPreferences[i] = findPrefs[i];
    }
    for ( var j in changePrefs ) {
        app.changeGrepPreferences[j] = changePrefs[j];
    }
    story.changeGrep( true );

    app.findGrepPreferences = NothingEnum.NOTHING;
    app.changeGrepPreferences = NothingEnum.NOTHING;
};

/*
For Windows operating systems, set up the environment and process the data.
Not currently complete, so commented out.
 */
// var win = function() {
//     if (app.documents.length === 0) {
//         alert("Open the page and try again.");
//         return;
//     }
//     //var currFolder = app.activeScript.parent.absoluteURI;
//     var imgFol = Folder.selectDialog("Choose the image folder");
//     if (!imgFol) { return; }
//     var jsonF = File(Folder.desktop + "/j.json");
//     var doc = app.activeDocument;
//     var page = doc.pages[0];
//     var pageNum = parsePageNum(decodeURI(doc.name));
//     if (typeof(pageNum) == "undefined") {
//         return;
//     }
//     var json = readJSONFile(jsonF);
//     processData(json, page, doc, imgFol);
// }

/*
For Mac operating systems, set up the environment and process the data.
 */
var mac = function() {
    if (app.documents.length === 0) {
        alert("Open the page and try again.");
        return;
    }
    var currFolder = app.activeScript.parent.absoluteURI;
    var respF = wwnEnv.apiUrl + '?page=';
    var respB = "&key=" + wwnEnv.apiKey;

    // var imgFol = Folder.selectDialog("Choose the image folder");
    // if (!imgFol) { return; }
    var imgFol = '/tmp/';
    var doc = app.activeDocument;
    var page = doc.pages[0];
    var pageNum = parsePageNum(decodeURI(doc.name));
    if (typeof(pageNum) == "undefined") {
        return;
    }
    var url = respF + pageNum + respB;
    try {
        var jsonF = getJSONFile(currFolder, url);
    } catch(e) {
        alert(e);
        return;
    }
    var json = readJSONFile(jsonF);
    processData(json, page, doc, imgFol);
}

// var getMacImage = function(exporturl, assetFolderPath) {

//     try {
//         var fileName = exporturl.slice(exporturl.lastIndexOf("/") + 1);
//         var ff = File(assetFolderPath + "/" + fileName);
//         if (!ff.exists) {
//             app.system("curl -L -o " + ff.fsName + " " + exporturl);
//         }
//         var c = 0;
//         while(!ff.exists) {
//             $.sleep(1);
//             c++;
//             if (c>1000) {
//                 throw new Error("More than 10 seconds elapsed to download " + exporturl);
//             }
//         }
//
//         return ff;
//     }
//     catch(e) {
//         throw new Error("Error downloading asset from " + exporturl + ". " + e);
//     }
// };

/*
Uses curl to download a JSON url to designated path
Requires that we are on Mac (using Applescript for curl call)
If needed, can refactor for VBA to handle Windows environment
*/
var getJSONFile = function(path, exporturl) {
    try {
        var fileName = "storiesTmp.json";
        var ff = File(path + "/" + fileName);
        ff.encoding = "UTF-8";
        var curlCommand = "\"curl -L -o '" + ff.fsName + "' " + "'" + exporturl + "'";
        var asCode = 'do shell script ' + curlCommand + '"';
        app.doScript(asCode, ScriptLanguage.APPLESCRIPT_LANGUAGE);
        return ff;
    }
    catch(e) {
        throw new Error("Error downloading json from " + exporturl + ". " + e);
    }
};

var main = function() {
    if (/win/gi.test($.os)) {
        alert('This script does not currently work on Windows.')
        // win();
    }
    else {
        mac();
    }
}

main();