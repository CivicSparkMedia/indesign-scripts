//@include "JSON-js/json2.js"
//@include "wwn-env.js";

/*
issue_date: “2023-09-13”
page_count: 28,
pages: 
1
color: true
layout: “Front”
2
color: true
layout: “Even”
…
5
color: false
layout: “Postmaster box”



*/
/*
//@include "JSON-js/json2.js"
//@include "wwn-env.js";
// noinspection ES6ConvertVarToLetConst,SpellCheckingInspection

*/
var main = function() {
    var tmplt = File.openDialog("Choose the template");
    if (!tmplt) { // || /indd?t?$/gi.test(tmplt.name)) { //user canceled or file is not indd/t
        throw new Error("Could not open template.");
        return;
    }
    var outfol = Folder.selectDialog("Choose the output folder");
    if (!outfol) { return; } //user canceled
    var currFolder = app.activeScript.parent.absoluteURI;
    var respF = wwnEnv.breakoutApiUrl;
    try {
        var jsonF = getJSONFile(currFolder, respF);
    } catch(e) {
        alert(e);
        return;
    }
    var json = readJSONFile(jsonF);
    try {
        createPages(json, tmplt, outfol);
    } catch(e) {
        alert(e);
        return;
    }
 }

 //----------------------------------------


var createPages = function(json, tmplt, outfol) {
    var issueDate = json.issue_date;
    var pageCount = Number(json.page_count);
    if (isNaN(pageCount)) {
        throw new Error("Could not get page count from json");
    }
    var pageArr = json.pages;
    var i = pageArr.length;
    while(i--) {
        try {
            processPage(pageArr[i], tmplt, outfol, issueDate);
        } catch(e) {
            alert(e);
        }
    }
}

var processPage = function(pageData, tmplt, outfol, issueDate) {
    try {
        var doc = app.open(tmplt, true, OpenOptions.OPEN_COPY);
    } catch(e) {
        throw new Error("Could not open document from " + decodeURI(tmplt.name) + ". " + e);
    }
    var pageNum = pageData.pageNum;
    var colorOrBw = pageData.color ? " COLOR" : " BW";
    var evenOrOdd = pageNum % 2 == 0 ? "Even" : "Odd";
    var fname = "WWN pg " + pageNum + colorOrBw;
    var layout = pageData.layout;
    if (typeof(layout) == "undefined") {
        layout = evenOrOdd;
    }
    try {
        var pp = getParentPage(layout, colorOrBw, evenOrOdd, doc);
    } catch(e) {
        alert(e);
        doc.close(SaveOptions.NO);
        return;
    }

    doc.pages.item(0).appliedMaster = pp;
    overrideMasterItems(doc);
    doc.pages.item(0).name = pageNum;

    try {
        populateDate(doc, issueDate);
    } catch(e) {
        alert(e);
    }
    doc.save(File(outfol + "/" + fname + ".pdf"));
    doc.close(SaveOptions.NO);
}

//--------
//take the json issue date, parse it, and place in document's Date Text Variable instance

var populateDate = function(doc, issueDate) {
    var split = issueDate.split("-");
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    try {
        var ms = months[parseInt(split[1],10)-1];
    } catch(e) {
        throw new Error("Could not get month string from " + issueDate);
    }
    try {
        var ds = parseInt(split[2],10).toString();
    } catch(e) {
        throw new Error("Could not get date string from " + issueDate);
    }
    try {
        doc.textVariables.itemByName("Date").customTextVariablePreferences.contents = ms + " " + ds + ", " + split[0];
    } catch(e) {
        throw new Error("Could not set text variable Date: " + e);
    }
}

//---------------------------------------
//override all items from parent to first page of doc
//lock items on parent that you don't want to override
var overrideMasterItems = function(doc) {
    var pg = doc.pages.item(0);
    var allItems = pg.appliedMaster.allPageItems;
    var n = allItems.length;
    while(n--) {
      try { allItems.override(pg) }
      catch(e) {}
    }
  }

//-------------------------

//colorOrBw has a space in front: " COLOR" or " BW";
//we try three different vaiations of the name
//all master spreads should use B as prefix
//returns a MasterSpread object
var getParentPage = function(layout, colorOrBw, evenOrOdd, doc, pageNum) {
    // var nm1 = layout + colorOrBw + " " + evenOrOdd;
    // var nm2 = layout + " " + evenOrOdd;
    // var nm3 = layout;
    // var ms = doc.masterSpreads.itemByName("B-" + nm1);
    // if (!ms.isValid) {
    //     ms = doc.masterSpreads.itemByName("B-" + nm2);
    //     if (!ms.isValid) {
    //         ms = doc.masterSpreads.itemByName("B-" + nm3);
    //         if (!ms.isValid)  {
    //             throw new Error("Could not get master spread name for: " + layout + ">>" + evenOrOdd + ">>" + colorOrBw);
    //         }
    //     }
    // }
    ms = doc.masterSpreads.itemByName("C-Odd");

    return ms;

}
//-------------------------
//from prev script
var readJSONFile = function(f) {
    f.encoding = "UTF-8";
    f.open("r");
    var data = f.read();
    f.close();
    if (data == "") { 
        alert("No such order found. Try again.");
        return null; 
    }
    data = JSON.parse(data);
    f.remove(); //delete the json when we're done with it
    //printObj(data);
    return data;
};

/*
Uses curl to download a JSON url to designated path
Requires that we are on Mac (using Applescript for curl call)
If needed, can refactor for VBA to handle Windows environment
*/
var getJSONFile = function(path, exporturl) {
    try {
        var fileName = "breakoutTmp.json";
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

var unitTest = function() {
    alert(new Date("2023-09-13").toDateString());
}

//unitTest();
main();