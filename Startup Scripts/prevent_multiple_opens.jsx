// WWN prevent multiple opens
// source: https://github.com/t3n/indesign-prevent-multiple-opens/blob/master/prevent-multiple-opens.jsx


#targetengine "preventMultipleOpens"

var eventListenerOpen = app.addEventListener("afterOpen", createTxtFile);
var eventListenerClose = app.addEventListener("beforeClose", deleteTxtFile);
var userName = (app.userName != "Unknown User Name") ? app.userName : "unknown user";

function customAlert(message, delaySeconds, title) {

    title = title || 'Alert';
    var alertWindow = new Window('palette', title);
    var control_text = alertWindow.add('edittext', [0, 0, 400, 100], message, {multiline: false});

    if(delaySeconds == 0){
        var control_close = alertWindow.add('button', undefined, 'Close');
        control_close.onClick = function(){
            if(alertWindow){
				alertWindow.hide();
				app.activeDocument.close();
            }
        };
    }

    alertWindow.show();
    alertWindow.update();

    if(delaySeconds > 0){
        $.sleep(delaySeconds * 1000);
        alertWindow.hide();
        alertWindow = null;
    }
}

function createTxtFile(event) {
	try {
		var doc = event.parent.activeSpread.parent;
		var txtFilePath = decodeURI(doc.fullName.absoluteURI.replace(/indd$/i, "txt"));
		if (txtFilePath != null) {
			var txtFile = new File(txtFilePath);
			txtFile.encoding = "UTF-8";

			if (!txtFile.exists) {
				txtFile.open("w");
				txtFile.write(userName);
				txtFile.close();
			}
			else {
				txtFile.open("r");
				var userNameSaved = txtFile.read();
				txtFile.close();

				if (userNameSaved != userName) {
					customAlert('This Document is already opened by ' + userNameSaved, 0, 'Warning!');
				}
			}
		}
        else {
            //alert(doc.fullName.absoluteURI.replace(/indd$/i, "txt") + " path info is null");
        }
	}
	catch(err) {
		//alert("Create event err: " + err);
	}
}

function deleteTxtFile(event) {
	try {
		var doc = event.parent.activeSpread.parent;
		var txtFilePath = decodeURI(doc.fullName.absoluteURI.replace(/indd$/i, "txt"));

		if (txtFilePath != null) {
			var txtFile = new File(txtFilePath);

			if (txtFile.exists) {
				txtFile.open("r");
				var userNameSaved = txtFile.read();
				txtFile.close();

				if (userNameSaved == userName) {
					txtFile.remove();
				}
			}
		}
		else {
			//alert(doc.fullName.absoluteURI.replace(/indd$/i, "txt") + " path info is null");
		}
	}
	catch(err) {
        //alert("Debugging deleteTxtFile error: " + err);
    }
}