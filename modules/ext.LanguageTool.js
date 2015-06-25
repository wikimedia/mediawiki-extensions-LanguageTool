( function () {

	/**
	 * @class mw.languageTool
	 * @singleton
	 */
	mw.languageTool = function VeUiMWLanguageTool( toolGroup, config ) {
			ve.ui.DialogTool.call( this, toolGroup, config );
		};
	OO.inheritClass( mw.languageTool, ve.ui.DialogTool );
	mw.languageTool.static.name = 'LanguageTool';
	mw.languageTool.static.group = 'object';
	mw.languageTool.static.icon = 'picture';
	mw.languageTool.static.title = 'LanguageTool';
	mw.languageTool.static.commandName = 'send';
	ve.ui.toolFactory.register( mw.languageTool );
}() );
