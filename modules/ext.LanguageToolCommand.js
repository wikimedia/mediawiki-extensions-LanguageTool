( function () {
/**
 * UserInterface LanguageTool command.
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
};

/* Inheritance */

OO.inheritClass( mw.languageToolCommand, ve.ui.Command );

/* Methods */

/**
 * @inheritdoc
 */
mw.languageToolCommand.prototype.isExecutable = function ( fragment ) {
	// Parent method
	return mw.languageToolCommand.super.prototype.isExecutable.apply( this, arguments );
};

/* Registration */
ve.ui.commandRegistry.register( new mw.languageToolCommand( 'send', 'send' ) );
ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'languageTool', 'window', 'toggle', { args: [ 'LanguageTool' ] }
	)
);

}() );
