var main = function() {
    //set dialog mode to never interact so no popups appear when script is executing
    var currIL = app.scriptPreferences.userInteractionLevel;
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
    //get the indd folder
    var fol = Folder.selectDialog("Choose the folder containing the INDD files");
    if (!fol) { return; } //user canceled
    //create the highquality output fol
    var outfol = Folder(fol + "/PDFs");
    if (!outfol.exists) { outfol.create(); } //user canceled
    //create the small file output fol in the user's temp dir
    var smallFileOutfol = Folder(Folder.temp + "/small_pdfs");
    if (!smallFileOutfol.exists) { smallFileOutfol.create(); } //user canceled
    //get all indd files
    var fs = fol.getFiles("*.indd");
    fs.sort(function(a,b) {
        var rx = /pg \d+/gi;
        var aname = decodeURI(a.name); //nm of files
        var bname = decodeURI(b.name);
        var am = aname.match(rx); //successful rx test
        var bm = bname.match(rx);
        if (!am) {
            return -1;
        }
        if (!bm) {
            return 1;
        }
        //assumes that there is a space between pg and #
        var anum = Number(am[0].split(" ")[1]);
        var bnum = Number(bm[0].split(" ")[1]);
        return anum > bnum;
    });
    var i = 0;
    var n = fs.length;
    //use the two builtin Adobe presets. If Adobe for some reasons changes these names, this would need to be updated, tho unlikely
    var pdfExport = app.pdfExportPresets.itemByName("[High Quality Print]");
    var smallExport = app.pdfExportPresets.itemByName("[Smallest File Size]");
    //a UI progress bar for the h-q export 
    var wi = new Window('palette');
        wi.location = [100, 100];
        wi.text = "Processing";
        wi.pbar = wi.add('progressbar', undefined, 0, n);
        wi.pbar.preferredSize.width = 300;

        wi.show();
    for (i; i < n; i++) {
        wi.pbar.value++;
        //only process pages that have the pg # code
        //we use decodeURI to read spaces correctly
        if (/pg \d/gi.test(decodeURI(fs[i].name))) {
            processFile(fs[i], pdfExport, outfol, smallFileOutfol, smallExport);
        }
    }
    try {
        wi.close();
        wi.destroy()
    } catch(e){}
    //call epub function
    processEpub(fs[0], outfol, smallFileOutfol, smallExport);
    //clean out the small pdfs
    cleanoutfol(smallFileOutfol);
    app.scriptPreferences.userInteractionLevel = currIL;
    alert("Done!");
}

//func to delete all small pdf files
var cleanoutfol = function(fol) {
    var fs = fol.getFiles();
    var i = fs.length;
    while(i--) {
        try { fs[i].remove(); } catch(e) {}
    }
}

//func to process the epub
var processEpub = function(f, outfol, smallFileOutfol, preset){
    //get all pdf files in tmp fol (array)
    var fs = smallFileOutfol.getFiles("*.pdf*");
    var n = fs.length;
    //opens the first indd doc found in original input fol
    var doc = app.open(f);
    //sorts the pdf array by pg #
    fs.sort(function(a,b) {
        var rx = /pg \d+/gi;
        var aname = decodeURI(a.name); //nm of files
        var bname = decodeURI(b.name);
        var am = aname.match(rx); //successful rx test
        var bm = bname.match(rx);
        if (!am) {
            return -1;
        }
        if (!bm) {
            return 1;
        }
        //assumes that there is a space between pg and #
        var anum = Number(am[0].split(" ")[1]);
        var bnum = Number(bm[0].split(" ")[1]);
        return anum > bnum;
    });
    var i = 0;
    var p, r;
    //ui for epub progress
    var wi = new Window('palette');
        wi.location = [100, 100];
        wi.text = "Processing ePub";
        wi.pbar = wi.add('progressbar', undefined, 0, n);
        wi.pbar.preferredSize.width = 300;

        wi.show();
    for (i; i < n; i++) {
        wi.pbar.value++;
        //add a page after first page in doc, make it blank with no master/parent page
        p = doc.pages.add();
        p.appliedMaster = null;
        //adds a rectangle and sets its bounds to the page's bounds
        r = p.rectangles.add();
        r.geometricBounds = p.bounds;
        //places the pdf
        r.place(fs[i]);
    }
    try {
        wi.close();
        wi.destroy()
    } catch(e){}
    //get the date for filename
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var dd = ("0" + d.getDate()).slice(-2);
    var fname = yyyy + mm + dd + "-FULL-NEWSPAPER.pdf";
    //remove the first page since it was an original page, then export
    doc.pages[0].remove();
    doc.exportFile(ExportFormat.PDF_TYPE, File(outfol + "/" + fname), false, preset);
    doc.close(SaveOptions.NO);
}

//main page processing file
var processFile = function(f, preset, outfol, smallFileOutfol, smallExport) {
    try {
        var doc = app.open(f);
    } catch(e) {
        alert("Couldn't open doc " + decodeURI(f.name) +  ". " + e);
    }
    //replace indd ext with pdf, then do export
    var fname = decodeURI(f.name).replace(/\.indd$/gi,".pdf");
    doc.exportFile(ExportFormat.PDF_TYPE, File(outfol + "/" + fname), false, preset);
    doc.exportFile(ExportFormat.PDF_TYPE, File(smallFileOutfol + "/" + fname), false, smallExport);
    doc.close(SaveOptions.NO);
}

main();