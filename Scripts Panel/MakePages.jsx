//@include "JSON-js/json2.js"
//@include "wwn-env.js";
// noinspection ES6ConvertVarToLetConst,SpellCheckingInspection

var main = function() {
    var tmplt = File.openDialog("Choose the template");
    if (!tmplt || !/indd?t?$/gi.test(tmplt.name)) {
        return;
    }
    var outfol = Folder.selectDialog("Choose the output folder");
    if (!outfol) { return; }

    var currFolder = app.activeScript.parent.absoluteURI;
    var respF = wwnEnv.breakoutApiUrl + "?key=" + wwnEnv.apiKey;

    try {
        var jsonF = getJSONFile(currFolder, respF);
    } catch(e) {
        alert(e);
        return;
    }
    var json = readJSONFile(jsonF);
    try {
        createPages(json.data, tmplt, outfol);
    } catch(e) {
        alert(e);
        return;
    }
}

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
    var colorType = pageData.color ? "COLOR" : "BW";
    var evenOrOdd = pageNum % 2 == 0 ? "Even" : "Odd";
    var fname = "WWN pg " + pageNum + " " + colorType;

    // Use layout from JSON directly - no fallbacks
    var layout = pageData.layout;
    if (!layout) {
        throw new Error("No layout specified in JSON for page " + pageNum);
    }

    try {
        var masterSpread = getMasterSpread(doc, layout, pageData);
    } catch(e) {
        alert("Master spread error for page " + pageNum + ": " + e);
        doc.close(SaveOptions.NO);
        return;
    }

    doc.pages.item(0).appliedMaster = masterSpread;
    doc.pages.item(0).appliedSection.continueNumbering = false;
    doc.pages.item(0).appliedSection.pageNumberStart = pageNum;
    overrideMasterItems(doc);

    try {
        populateDate(doc, issueDate);
    } catch(e) {
        alert("Date population error for page " + pageNum + ": " + e);
    }

    doc.save(File(outfol + "/" + fname + ".indd"));
    doc.close(SaveOptions.NO);
}

/**
 * Find the master spread that exactly matches the layout from JSON
 */
var getMasterSpread = function(doc, layout, pageData) {
    var masterSpreads = doc.masterSpreads;

    // Search for exact match of layout name within master spread names
    for (var i = 0; i < masterSpreads.length; i++) {
        var spreadName = masterSpreads[i].name;

        // Check if master spread name contains the layout
        // This handles prefixes like "B-", "C-", "D-", "H-" automatically
        if (spreadName.indexOf(layout) >= 0) {
            return masterSpreads[i];
        }
    }

    // If no match found, list available masters for debugging
    var availableMasters = [];
    for (var i = 0; i < masterSpreads.length; i++) {
        availableMasters.push(masterSpreads[i].name);
    }

    throw new Error("No master spread found for layout '" + layout + "'. " +
        "Available masters: " + availableMasters.join(", "));
}

var populateDate = function(doc, issueDate) {
    var split = issueDate.split("-");
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    try {
        var ms = months[parseInt(split[1],10)-1];
        var ds = parseInt(split[2],10).toString();
        var dateString = ms + " " + ds + ", " + split[0];

        var dateVar = doc.textVariables.itemByName("Issue Date");
        if (!dateVar.isValid) {
            throw new Error("Text variable 'Issue Date' does not exist in document");
        }

        if (dateVar.variableType === VariableTypes.CUSTOM_TEXT_TYPE) {
            dateVar.variableOptions.contents = dateString;
        } else {
            throw new Error("Text variable 'Issue Date' is not a custom text variable type");
        }
    } catch(e) {
        throw new Error("Could not set text variable: " + e);
    }
}

var overrideMasterItems = function(doc) {
    var pg = doc.pages.item(0);
    var allItems = pg.appliedMaster.allPageItems;
    var variablesToReplace = ["Issue Date"]; // Add other variable names here as needed

    for (var i = 0; i < allItems.length; i++) {
        try {
            var item = allItems[i];

            // Only check unlocked text frames
            if (!item.locked && item.constructor.name === "TextFrame") {
                var shouldOverride = false;

                try {
                    var variables = item.textVariableInstances;
                    for (var v = 0; v < variables.length; v++) {
                        var varName = variables[v].associatedTextVariable.name;

                        // Check if this text frame contains any variables we want to replace
                        for (var n = 0; n < variablesToReplace.length; n++) {
                            if (varName === variablesToReplace[n]) {
                                shouldOverride = true;
                                break;
                            }
                        }
                        if (shouldOverride) break;
                    }
                } catch(e) {
                    // If we can't check variables, don't override
                    shouldOverride = false;
                }

                if (shouldOverride) {
                    item.override(pg);
                }
            }
        } catch(e) {
            // Ignore items that can't be checked or overridden
        }
    }
}

var readJSONFile = function(f) {
    f.encoding = "UTF-8";
    f.open("r");
    var data = f.read();
    f.close();
    if (data == "") {
        alert("No such order found. Try again.");
        return null;
    }
    try {
        data = JSON.parse(data);
    } catch(e) {
        alert("Error parsing JSON data " + data + ". " + e);
    }
    f.remove();
    return data;
};

var getJSONFile = function(path, exporturl) {
    try {
        var fileName = "breakoutTmp.json";
        var ff = File(path + "/" + fileName);
        ff.encoding = "UTF-8";
        var curlCommand = "\"curl -L --insecure -o '" + ff.fsName + "' " + "'" + exporturl + "'";
        var asCode = 'do shell script ' + curlCommand + '"';
        app.doScript(asCode, ScriptLanguage.APPLESCRIPT_LANGUAGE);
        return ff;
    } catch(e) {
        throw new Error("Error downloading json from " + exporturl + ". " + e);
    }
};

main();