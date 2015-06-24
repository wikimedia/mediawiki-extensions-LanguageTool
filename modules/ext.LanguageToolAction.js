( function () {
/*!
 * VisualEditor UserInterface LanguageToolAction class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * LanguageTool action.
 *
 * @class
 * @extends ve.ui.Action
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 */
mw.languageToolAction = function VeUiLanguageToolAction( surface ) {
	// Parent constructor
	ve.ui.Action.call( this, surface );
};

/* Inheritance */

OO.inheritClass( mw.languageToolAction, ve.ui.Action );

/* Static Properties */

mw.languageToolAction.static.name = 'languageTool';

/**
 * List of allowed methods for the action.
 *
 * @static
 * @property
 */
mw.languageToolAction.static.methods = [ 'extract', 'send' ];

/* Methods */

/**
 * Extract text from all text nodes
 *
 * @method
 * @return {boolean} Action was executed
 */
mw.languageToolAction.prototype.extract = function () {
		var nodes = [];
		var model = ve.init.target.getSurface().getModel();
		function getTextNodes( obj ) {
			var i;
 
			for ( i = 0; i < obj.children.length; i++ ) {
				if ( obj.children[i].type == 'text'){
					nodes.push(obj.children[i]);
				}
 
				if ( obj.children[i].children ) {
					getTextNodes( obj.children[i] );
				}
			}
		}
		getTextNodes(ve.init.target.getSurface().getModel().getDocument().getDocumentNode());
		return nodes;
	}

/**
 * Send text to LanguageTool server
 *
 * @method
 * @return {boolean} Action was executed
 */
mw.languageToolAction.prototype.send = function () {
		var textNodes = this.extract();
		var model = ve.init.target.getSurface().getModel();
		var text = "";
		for (var nodeI = 0; nodeI < textNodes.length; nodeI++) {
			var node = textNodes[nodeI];
			var nodeRange = node.getRange();
			var nodeText = model.getLinearFragment(nodeRange).getText();
			text += nodeText;
			//console.log(nodeText);
		}
		//console.log(text);
		var lang = mw.config.get( 'wgPageContentLanguage' );
		//console.log(lang);
		var params = "language=" + lang + "&text=" + text;
		//console.log(params);
		$.ajax('https://tools.wmflabs.org/languageproofing', {data: {language: lang,  text: text}}).done(function(d){console.log(window.d=d)})
		return params;
	}

/*xhr request part*/
// Create the XHR object.
mw.languageToolAction.prototype.createCORSRequest = function (method, url) {
	var xhr = new XMLHttpRequest();
	if ("withCredentials" in xhr) {
    	// XHR for Chrome/Firefox/Opera/Safari.
    	xhr.open(method, url, true);
  	} else if (typeof XDomainRequest != "undefined") {
    	// XDomainRequest for IE.
    	xhr = new XDomainRequest();
    	xhr.open(method, url, true);
  	} else {
    	// CORS not supported.
    	xhr = null;
  	}
  	return xhr;
}

/*
// Helper method to parse the title tag from the response.
function getTitle(text) {
  return text.match('<title>(.*)?</title>')[1];
}
*/

// Make the actual CORS request.
mw.languageToolAction.prototype.sendWrong = function () {
	/*var url = "http://tools.wmflabs.org/languageproofing/";
	var xhr = this.createCORSRequest('POST', url);
	xhr.setRequestHeader('Content-Type', 'text/xml');
	xhr.setRequestHeader('charset', 'UTF-8');
	//xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
	if (!xhr) {
    	alert('CORS not supported');
    	return;
  	}

  	// Response handlers.
  	
  	xhr.onload = function() {
	    var text = xhr.responseXML;
	    console.log(text);
    	//var title = getTitle(text);
    	//alert('Response from CORS request to ' + url + ': ' + title);
  	};
	
  	xhr.onerror = function() {
    	alert('Woops, there was an error making the request.');
  	};
  	console.log( this.extractParams() );
  	xhr.send( this.extractParams() );
  	*/
  	var lang = mw.config.get( 'wgPageContentLanguage' );

  	$.ajax('https://tools.wmflabs.org/languageproofing', {data: {language:'en',  text: 'a simple test'}}).done(function(d){console.log(window.d=d)})
  	return;
}

/* Registration */

ve.ui.actionFactory.register( mw.languageToolAction );

}() );