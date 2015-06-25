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
				if ( obj.children[i].type === 'text'){
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
 * @return {NULL} Action was executed
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
		}
		var lang = mw.config.get( 'wgPageContentLanguage' );
		var params = "language=" + lang + "&text=" + text;
		$.ajax(
		{
			type: 'POST',
			dataType: 'text',
			url: 'http://127.0.0.1:8081/', 
			data: {language: lang,  text: text}
		}
		)
		.done(function(d)
		{
			// Example: Creating and opening a message dialog window.
			var messageDialog = new OO.ui.MessageDialog();
			// Create and append a window manager.
			var windowManager = new OO.ui.WindowManager();
			$( 'body' ).append( windowManager.$element );
			windowManager.addWindows( [ messageDialog ] );
			// Open the window.
			windowManager.openWindow( messageDialog, {
    			title: 'LanguageTool Response',
    			message: d
			} );	
		});
		return;
	}

/* Registration */

ve.ui.actionFactory.register( mw.languageToolAction );

}() );
