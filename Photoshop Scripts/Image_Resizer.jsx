// Check if a document is open
if (app.documents.length > 0) {
  preferences.rulerUnits = Units.INCHES;
  var doc = app.activeDocument;
  //check if photo is landscape or portrait
  var isVert = doc.height > doc.width;
  var needsResize = isVert ? doc.height > 10 : doc.width > 10;
  // Check if the current resolution is lower than 250ppi
  if (doc.resolution < 250) {
    if (needsResize) {
      if (isVert) {
        doc.resizeImage(undefined, 10, 250, ResampleMethod.BICUBIC)
      } else {
        doc.resizeImage(10, undefined, 250, ResampleMethod.BICUBIC)
      }
    }
    else {
      doc.resizeImage(undefined, undefined, 250, ResampleMethod.BICUBIC)
    }
    
    doc.bitsPerChannel = BitsPerChannelType.EIGHT;
  }
  
  // Check if the current resolution is higher than 300ppi
  if (doc.resolution > 300) {
    if (needsResize) {
      if (isVert) {
        doc.resizeImage(undefined, 10, 300, ResampleMethod.BICUBIC)
      } else {
        doc.resizeImage(10, undefined, 300, ResampleMethod.BICUBIC)
      }
    }
    else {
      doc.resizeImage(undefined, undefined, 300, ResampleMethod.BICUBIC)
    }
    doc.bitsPerChannel = BitsPerChannelType.EIGHT;
  }
}