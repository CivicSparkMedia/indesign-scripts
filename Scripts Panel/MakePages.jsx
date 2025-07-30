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

    // Get user input for issue date and page count
    var issueDate = getIssueDate();
    if (!issueDate) {
        alert("Issue date is required. Exiting.");
        return;
    }

    var pageCount = getPageCount();
    if (!pageCount) {
        alert("Page count is required. Exiting.");
        return;
    }

    var currFolder = app.activeScript.parent.absoluteURI;
    var respF = wwnEnv.breakoutApiUrl + "?key=" + wwnEnv.apiKey + "&page_count=" + pageCount;

    try {
        var jsonF = getJSONFile(currFolder, respF);
    } catch(e) {
        alert(e);
        return;
    }
    var json = readJSONFile(jsonF);
    try {
        createPages(json.data, tmplt, outfol, issueDate, pageCount);
    } catch(e) {
        alert(e);
        return;
    }
}

/**
 * Prompt user for issue date with validation
 */
var getIssueDate = function() {
    while (true) {
        var dateInput = prompt("Enter the issue date (YYYY-MM-DD format):\nExample: 2024-07-29", "2024-01-01");

        if (dateInput === null) {
            return null; // User canceled
        }

        // Validate date format
        var datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(dateInput)) {
            alert("Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-07-29)");
            continue;
        }

        // Validate that it's a real date
        var dateParts = dateInput.split("-");
        var year = parseInt(dateParts[0], 10);
        var month = parseInt(dateParts[1], 10);
        var day = parseInt(dateParts[2], 10);

        var testDate = new Date(year, month - 1, day);
        if (testDate.getFullYear() !== year ||
            testDate.getMonth() !== month - 1 ||
            testDate.getDate() !== day) {
            alert("Invalid date. Please enter a valid date.");
            continue;
        }

        return dateInput;
    }
}

/**
 * Prompt user for page count with validation
 */
var getPageCount = function() {
    while (true) {
        var countInput = prompt("Enter the number of pages (positive integer only):", "16");

        if (countInput === null) {
            return null; // User canceled
        }

        var pageCount = parseInt(countInput, 10);

        // Simple trim function for InDesign compatibility
        var trimmedInput = countInput.replace(/^\s+|\s+$/g, '');

        if (isNaN(pageCount) || pageCount <= 0 || pageCount.toString() !== trimmedInput) {
            alert("Invalid page count. Please enter a positive integer (e.g., 16, 24, 32)");
            continue;
        }

        return pageCount;
    }
}

var createPages = function(json, tmplt, outfol, issueDate, pageCount) {
    // Use user-provided values instead of JSON values
    if (isNaN(pageCount)) {
        throw new Error("Invalid page count provided");
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

    try {
        processPageNumber(doc, pageNum);
    } catch(e) {
        alert("Page number population error for page " + pageNum + ": " + e);
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

/**
 * Helper function to find and replace a custom text variable
 */
var setCustomTextVariable = function(doc, variableName, newContent) {
    try {
        var textVar = doc.textVariables.itemByName(variableName);
        if (!textVar.isValid) {
            throw new Error("Text variable '" + variableName + "' does not exist in document");
        }

        if (textVar.variableType === VariableTypes.CUSTOM_TEXT_TYPE) {
            textVar.variableOptions.contents = newContent;
        } else {
            throw new Error("Text variable '" + variableName + "' is not a custom text variable type");
        }
    } catch(e) {
        throw new Error("Could not set text variable '" + variableName + "': " + e);
    }
}

var populateDate = function(doc, issueDate) {
    var split = issueDate.split("-");
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    try {
        var ms = months[parseInt(split[1],10)-1];
        var ds = parseInt(split[2],10).toString();
        var dateString = ms + " " + ds + ", " + split[0];

        setCustomTextVariable(doc, "Issue Date", dateString);
    } catch(e) {
        throw new Error("Could not populate date: " + e);
    }
}

var processPageNumber = function(doc, pageNumber) {
    try {
        var pageNumString = pageNumber.toString();
        setCustomTextVariable(doc, "Issue Page", pageNumString);
    } catch(e) {
        throw new Error("Could not populate page number: " + e);
    }
}

var overrideMasterItems = function(doc) {
    var pg = doc.pages.item(0);
    var allItems = pg.appliedMaster.allPageItems;
    var variablesToReplace = ["Issue Date", "Issue Page"]; // Add other variable names here as needed

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