
( function () {
/*!
 * VisualEditor UserInterface HistoryCommand class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * UserInterface history command.
 *
 * @class
 * @extends ve.ui.Command
 *
 * @constructor
 * @param {string} name
 * @param {string} method
 */
mw.languageToolCommand = function VeUiHistoryCommand( name, method ) {
	// Parent constructor
	mw.languageToolCommand.super.call( this, name, 'languageTool', method );
	/*
	this.check = {
		undo: 'canUndo',
		redo: 'canRedo'
	}[method];
	*/
};

/* Inheritance */

OO.inheritClass( mw.languageToolCommand, ve.ui.Command );

/* Methods */

/**
 * @inheritdoc
 */
mw.languageToolCommand.prototype.isExecutable = function ( fragment ) {
	var surface = fragment.getSurface();

	// Parent method
	return mw.languageToolCommand.super.prototype.isExecutable.apply( this, arguments ) 
		// && surface[this.check].call( surface );
};

/* Registration */

ve.ui.commandRegistry.register( new mw.languageToolCommand( 'extract', 'extract' ) );

ve.ui.commandRegistry.register( new mw.languageToolCommand( 'send', 'send' ) );
ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'languageTool', 'window', 'open', { args: ['languageTool'] }
	)
);


}() );