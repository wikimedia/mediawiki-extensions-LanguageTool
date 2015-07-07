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
	this.surfaceModel = this.surface.getModel();
	this.surrogateAttribute = 'onkeypress';
	this.surrogateAttributeDelimiter = "---#---";
	this.ignoredRulesIds = [ 'SENTENCE_WHITESPACE' ];
	this.ignoredSpellingErrors = [];
	this.$findResults = $( '<div>' ).addClass( 'hiddenSpellError' );
	this.initialFragment = null;
	this.fragments = [];
	this.surface.$selections.append( this.$findResults );
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
	var textNodes, model, text, nodeI, node, nodeRange, nodeText, lang, self,
		data, textArray, mapper, i;

	textNodes = this.extract();
	model = ve.init.target.getSurface().getModel();

	data = ve.init.target.getSurface().getModel().getDocument().data.getData();

	mapper = [];
	for( i = 0; i < data.length; i++ ){
		if( (typeof data[i]) === 'string' || ( typeof data[i][0] ) === 'string')
			mapper.push(i);
	}
	textArray = [];

	for( i = 0; i < mapper.length; i++ ){
		if( ( typeof data[mapper[i]] ) === 'string'){
			textArray[i] = data[mapper[i]];
		}
		else{
			textArray[i] = data[mapper[i]][0];
		}
	}

	text = textArray.join('');

	// TODO: Get the language from VE's data model
	lang = mw.config.get( 'wgPageContentLanguage' );
	self = this;

	$.ajax( {
		type: 'POST',
		dataType: 'xml',
		url: 'http://tools.wmflabs.org/languageproofing/',
		data: {language: lang,  text: text}
	} ) .done( function( responseXML ) {
		self.openDialog.apply( self, [ responseXML, mapper ] );
	} );

	return;
}

mw.languageToolAction.prototype.openDialog = function ( responseXML, mapper ) {
	var range, fragment, surfaceModel, languageCode, previousSpanStart,
		suggestionIndex, suggestion, spanStart, spanEnd, ruleId, cssName;

	this.suggestions = this.processXML( responseXML );
	surfaceModel = this.surface.getModel();

	// TODO: Get the language from VE's data model
	languageCode = mw.config.get( 'wgPageContentLanguage' );
	previousSpanStart = -1;

	// iterate backwards as we change the text and thus modify positions:
	for ( suggestionIndex = this.suggestions.length - 1; suggestionIndex >= 0; suggestionIndex-- ) {
		suggestion = this.suggestions[suggestionIndex];

		if (!suggestion.used) {
			spanStart = suggestion.offset;
			spanEnd = spanStart + suggestion.errorlength;

			if (previousSpanStart != -1 && spanEnd > previousSpanStart) {
				// overlapping errors - these are not supported by our underline approach,
				// as we would need overlapping <span>s for that, so skip the error:
				continue;
			}

			previousSpanStart = spanStart;
			range = new ve.Range( mapper[ spanStart ], mapper[ spanEnd ] );
			fragment = surfaceModel.getLinearFragment( range, true );

			ruleId = suggestion.ruleid;
			if ( ruleId === 'SENTENCE_WHITESPACE' ) {
				continue;
			}
			fragment.annotateContent( 'set', 'textStyle/highlight' );

			cssName;

			if ( ruleId.indexOf('SPELLER_RULE') >= 0 ||
				ruleId.indexOf('MORFOLOGIK_RULE') === 0 ||
				ruleId === 'HUNSPELL_NO_SUGGEST_RULE' ||
				ruleId === 'HUNSPELL_RULE'
			) {
				cssName = 'hiddenSpellError';
			} else {
				cssName = 'hiddenGrammarError';
			}

			suggestion.used = true;
		}
	}
}

mw.languageToolAction.prototype.processXML = function ( responseXML ) {
	var errors, i, suggestion, suggestionsStr, errorOffset, errorLength, url;

	this.suggestions = [];
	this._wordwrap = mw.languageToolAction.prototype._wordwrap.bind( this );
	errors = responseXML.getElementsByTagName('error');

	for ( i = 0; i < errors.length; i++ ) {
		suggestion = {};
		// I didn't manage to make the CSS break the text, so we add breaks with Javascript:
		suggestion['description'] = this._wordwrap(errors[i].getAttribute('msg'), 50, '<br/>');
		suggestion['suggestions'] = [];
		suggestionsStr = errors[i].getAttribute('replacements');

		if (suggestionsStr) {
			suggestion['suggestions'] = suggestionsStr;
		}

		errorOffset = parseInt(errors[i].getAttribute('offset'));
		errorLength = parseInt(errors[i].getAttribute('errorlength'));
		suggestion['offset'] = errorOffset;
		suggestion['errorlength'] = errorLength;
		suggestion['type'] = errors[i].getAttribute('category');
		suggestion['ruleid'] = errors[i].getAttribute('ruleId');
		suggestion['subid'] = errors[i].getAttribute('subId');
		url = errors[i].getAttribute('url');

		if (url) {
			suggestion['moreinfo'] = url;
		}
		this.suggestions.push(suggestion);
	}

	return this.suggestions;
}

// Wrapper code by James Padolsey
// Source: http://james.padolsey.com/javascript/wordwrap-for-javascript/
// License: 'This is free and unencumbered software released into the public domain.',
// see http://james.padolsey.com/terms-conditions/
mw.languageToolAction.prototype._wordwrap = function( str, width, brk, cut ) {
	var regex;

	brk = brk || '\n';
	width = width || 75;
	cut = cut || false;

	if (!str) {
		return str;
	}

	regex = '.{1,' +width+ '}(\\s|$)' + (cut ? '|.{' +width+ '}|.+$' : '|\\S+?(\\s|$)');

	return str.match( new RegExp(regex, 'g') ).join( brk );
};
// End of wrapper code by James Padolsey

/* Registration */

ve.ui.actionFactory.register( mw.languageToolAction );

}() );