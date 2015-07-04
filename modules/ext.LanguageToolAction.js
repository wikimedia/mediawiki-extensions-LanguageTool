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
			if ( obj.children[i].type === 'text'){
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
	text = "";

	for ( nodeI = 0; nodeI < textNodes.length; nodeI++ ) {
		node = textNodes[nodeI];
		nodeRange = node.getRange();
		nodeText = model.getLinearFragment( nodeRange ).getText();
		text = text + "\n" + nodeText;
	}

	// TODO: Get the language from VE's data model
	lang = mw.config.get( 'wgPageContentLanguage' );

	$.ajax( {
		type: 'POST',
		//dataType: 'xml',
		url: 'http://tools.wmflabs.org/languageproofing/',
		data: { language: lang,  text: text }
	} ).done(
		this.openDialog
	);

	return;
};

mw.languageToolAction.prototype.openDialog = function ( responseXML ) {
	var messageDialog, windowManager, errors, i, response;

	messageDialog = new OO.ui.MessageDialog();

	// Create and append a window manager
	windowManager = new OO.ui.WindowManager();
	$( 'body' ).append( windowManager.$element );
	windowManager.addWindows( [ messageDialog ] );

	errors = responseXML.getElementsByTagName( "error" );
	console.log( errors );

	response = "";

	for ( i = 0; i < errors.length; i++ ) {
		response = response + "ERROR " + i + " :\n";
		response = response + "error : " + errors[i].getAttribute( 'msg' ) + "\n";
		response = response + "context : " + errors[i].getAttribute( 'context' ) + "\n";
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

/* Registration */

ve.ui.actionFactory.register( mw.languageToolAction );

}() );
