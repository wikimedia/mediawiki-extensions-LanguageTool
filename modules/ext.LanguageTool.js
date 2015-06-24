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
	mw.languageTool.static.group = 'dialog';
	mw.languageTool.static.icon = 'picture';
	mw.languageTool.static.title = 'LanguageTool';
	mw.languageTool.static.commandName = 'languageTool';
	mw.languageTool.static.activeWindow = 'languageTool';
	//mw.languageTool.static.modelClasses = [ ve.dm.MWBlockImageNode, ve.dm.MWInlineImageNode ];
	//mw.languageTool.static.commandName = 'media';
	//mw.languageTool.static.autoAddToCatchall = false;
	//mw.languageTool.static.autoAddToGroup = false;
	ve.ui.toolFactory.register( mw.languageTool );
}() );
