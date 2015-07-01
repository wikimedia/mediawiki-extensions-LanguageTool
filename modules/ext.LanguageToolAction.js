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

	function getTextNodes( obj ) {
		var i;

		for ( i = 0; i < obj.children.length; i++ ) {
			if ( obj.children[i].type === 'text') {
				nodes.push( obj.children[i] );
			}

			if ( obj.children[i].children ) {
				getTextNodes( obj.children[i] );
			}
		}
	}

	getTextNodes( ve.init.target.getSurface().getModel().getDocument().getDocumentNode() );

	return nodes;
};

/**
 * Send text to LanguageTool server
 *
 * @method
 * @return {NULL} Action was executed
 */
mw.languageToolAction.prototype.send = function () {
	var textNodes, model, text, nodeI, node, nodeRange, nodeText, lang;

	textNodes = this.extract();
	model = ve.init.target.getSurface().getModel();
	text = '';

	for ( nodeI = 0; nodeI < textNodes.length; nodeI++ ) {
		node = textNodes[nodeI];
		nodeRange = node.getRange();
		nodeText = model.getLinearFragment( nodeRange ).getText();
		text = text + '\n' + nodeText;
	}

	// TODO: Get the language from VE's data model
	lang = mw.config.get( 'wgPageContentLanguage' );

	$.ajax( {
		type: 'POST',
		// dataType: 'xml',
		url: 'http://tools.wmflabs.org/languageproofing/',
		data: { language: lang,  text: text }
	} ).done(
		this.openDialog
		//this.processXML
	);

	return;
};

mw.languageToolAction.prototype.openDialog = function ( responseXML ) {
	var suggestions, messageDialog, windowManager, errors, i, response;

	//var processXML = this.processXML.bind( this );
	suggestions = this.processXML( responseXML );
	console.log('suggestions');
	console.log(suggestions);

	messageDialog = new OO.ui.MessageDialog();

	// Create and append a window manager
	windowManager = new OO.ui.WindowManager();
	$( 'body' ).append( windowManager.$element );
	windowManager.addWindows( [ messageDialog ] );

	errors = responseXML.getElementsByTagName( 'error' );
	console.log( errors );

	response = '';

	for ( i = 0; i < errors.length; i++ ) {
		response = response + 'ERROR ' + i + ' :\n';
		response = response + 'error : ' + errors[i].getAttribute( 'msg' ) + '\n';
		response = response + 'context : ' + errors[i].getAttribute( 'context' ) + '\n';
		messageDialog.setData( 'error', errors[i].getAttribute( 'msg' ) );
		messageDialog.setData( 'context', errors[i].getAttribute( 'context' ));
	}

	console.log( response );
	// Example: Creating and opening a message dialog window.
	// Open the window.
	windowManager.openWindow( messageDialog, {
		title: 'LanguageTool Response',
		message: response
	} );
};

mw.languageToolAction.prototype.processXML = function ( responseXML ) {
	console.log('entered');
	this.suggestions = [];
	var errors = responseXML.getElementsByTagName('error');
	for (var i = 0; i < errors.length; i++) {
		var suggestion = {};
		// I didn't manage to make the CSS break the text, so we add breaks with Javascript:
		suggestion["description"] = this._wordwrap(errors[i].getAttribute("msg"), 50, "<br/>");
		suggestion["suggestions"] = [];
		var suggestionsStr = errors[i].getAttribute("replacements");
		if (suggestionsStr) {
			suggestion["suggestions"] = suggestionsStr;
		}
		var errorOffset = parseInt(errors[i].getAttribute("offset"));
		var errorLength = parseInt(errors[i].getAttribute("errorlength"));
		suggestion["offset"] = errorOffset;
		suggestion["errorlength"] = errorLength;
		suggestion["type"] = errors[i].getAttribute("category");
		suggestion["ruleid"] = errors[i].getAttribute("ruleId");
		suggestion["subid"] = errors[i].getAttribute("subId");
		var url = errors[i].getAttribute("url");
		if (url) {
			suggestion["moreinfo"] = url;
		}
		this.suggestions.push(suggestion);
	}
	console.log( this.suggestions );

	return this.suggestions;
}

// Wrapper code by James Padolsey
// Source: http://james.padolsey.com/javascript/wordwrap-for-javascript/
// License: "This is free and unencumbered software released into the public domain.",
// see http://james.padolsey.com/terms-conditions/
mw.languageToolAction.prototype._wordwrap = function(str, width, brk, cut) {
	brk = brk || '\n';
	width = width || 75;
	cut = cut || false;
	if (!str) { return str; }
	var regex = '.{1,' +width+ '}(\\s|$)' + (cut ? '|.{' +width+ '}|.+$' : '|\\S+?(\\s|$)');
	return str.match( new RegExp(regex, 'g') ).join( brk );
};
// End of wrapper code by James Padolsey

/* Registration */

ve.ui.actionFactory.register( mw.languageToolAction );

}() );
