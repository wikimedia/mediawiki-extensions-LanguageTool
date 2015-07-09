( function () {
/*!
 * VisualEditor UserInterface LanguageToolAction class.
 *
 * @copyright 2011-2015
 * Ankita Kumari
 * Eran Rosenthal
 * Amir E. Aharoni
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
	this.$errors = $( '<div>' ).addClass( 'hiddenSpellError' );
	this.initialFragment = null;
	this.fragments = [];
	this.cssNames = [];

	this.surface.$selections.append( this.$errors );
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
mw.languageToolAction.static.methods = [ 'send' ];

/* Methods */

/**
 * Send text to LanguageTool server
 *
 * @method
 * @return {NULL} Action was executed
 */
mw.languageToolAction.prototype.send = function () {
	var model, data, mapper, i, textArray, text, lang,
		self = this;

	model = ve.init.target.getSurface().getModel();

	data = model.getDocument().data.getData();

	mapper = [];
	for ( i = 0; i < data.length; i++ ){
		if ( ( typeof data[i]) === 'string' || ( typeof data[i][0] ) === 'string' ) {
			mapper.push(i);
		}
	}

	textArray = [];
	for ( i = 0; i < mapper.length; i++ ) {
		if( ( typeof data[mapper[i]] ) === 'string'){
			textArray[i] = data[mapper[i]];
		} else {
			textArray[i] = data[mapper[i]][0];
		}
	}

	text = textArray.join( '' );

	// TODO: Get the language from VE's data model
	lang = mw.config.get( 'wgPageContentLanguage' );

	$.ajax( {
		type: 'POST',
		dataType: 'xml',
		url: 'http://tools.wmflabs.org/languageproofing/',
		data: { language: lang, text: text }
	} ).done( function( responseXML ) {
		self.openDialog.apply( self, [ responseXML, mapper ] );
	} );

	return;
}

mw.languageToolAction.prototype.openDialog = function ( responseXML, mapper ) {
	var languageCode, previousSpanStart, cssName,
		suggestionIndex, suggestion, spanStart, spanEnd,
		range, fragment, ruleId;

	this.suggestions = this.processXML( responseXML );

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
			fragment = this.surfaceModel.getLinearFragment( range, true );

			ruleId = suggestion.ruleid;
			if ( ruleId === 'SENTENCE_WHITESPACE' ) {
				continue;
			}

			this.fragments.push( this.surfaceModel.getLinearFragment( range, true, true ) );

			if ( ruleId.indexOf('SPELLER_RULE') >= 0 ||
				ruleId.indexOf('MORFOLOGIK_RULE') === 0 ||
				ruleId === 'HUNSPELL_NO_SUGGEST_RULE' ||
				ruleId === 'HUNSPELL_RULE'
			) {
				cssName = 'hiddenSpellError';
			} else {
				cssName = 'hiddenGrammarError';
			}
			this.cssNames.push( cssName );
			suggestion.used = true;
		}
	}
	this.highlightFragments();
}

/**
 * Render subset of search result fragments
 *
 * @param {ve.Range} range Range of fragments to render
 */
mw.languageToolAction.prototype.highlightFragments = function () {
	var i, j, rects, $result, top;

	this.$errors.empty();
	for ( i = 0; i < this.fragments.length; i++ ) {
		rects = this.surface.getView().getSelectionRects( this.fragments[i].getSelection() );
		$result = $( '<div>' ).addClass( this.cssNames[i] );
		for ( j = 0; j < rects.length; j++ ) {
			$result.append( $( '<div>' ).css( {
				top: rects[j].top,
				left: rects[j].left,
				width: rects[j].width,
				height: rects[j].height
			} ) );
		}
		this.$errors.append( $result );
	}
};

mw.languageToolAction.prototype.processXML = function ( responseXML ) {
	var errors, i, suggestion, suggestionsStr, errorOffset, errorLength, url;

	this.suggestions = [];
	this._wordwrap = mw.languageToolAction.prototype._wordwrap.bind( this );
	errors = responseXML.getElementsByTagName( 'error' );

	for ( i = 0; i < errors.length; i++ ) {
		suggestion = {};

		// I didn't manage to make the CSS break the text, so we add breaks with Javascript:
		suggestion[ 'description' ] = this._wordwrap(
			errors[ i ].getAttribute( 'msg' ), 50, '<br/>'
		);
		suggestion[ 'suggestions' ] = [];
		suggestionsStr = errors[i].getAttribute( 'replacements' );

		if ( suggestionsStr ) {
			suggestion[ 'suggestions' ] = suggestionsStr;
		}

		errorOffset = parseInt( errors[ i ].getAttribute( 'offset' ) );
		errorLength = parseInt( errors[ i ].getAttribute( 'errorlength' ) );
		suggestion[ 'offset' ] = errorOffset;
		suggestion[ 'errorlength' ] = errorLength;
		suggestion[ 'type' ] = errors[ i ].getAttribute( 'category' );
		suggestion[ 'ruleid' ] = errors[ i ].getAttribute( 'ruleId' );
		suggestion[ 'subid' ] = errors[ i ].getAttribute( 'subId' );
		url = errors[ i ].getAttribute( 'url' );

		if ( url ) {
			suggestion[ 'moreinfo' ] = url;
		}

		this.suggestions.push( suggestion );
	}

	return this.suggestions;
}

// Wrapper code by James Padolsey
// Source: http://james.padolsey.com/javascript/wordwrap-for-javascript/
// License: 'This is free and unencumbered software released into the public domain.',
// see http://james.padolsey.com/terms-conditions/
mw.languageToolAction.prototype._wordwrap = function( str, width, brk, cut ) {
	var regex;

	width = width || 75;
	brk = brk || '\n';
	cut = cut || false;

	if ( !str ) {
		return str;
	}

	regex = '.{1,' + width + '}(\\s|$)' + ( cut ? '|.{' +width+ '}|.+$' : '|\\S+?(\\s|$)');

	return str.match( new RegExp(regex, 'g') ).join( brk );
};
// End of wrapper code by James Padolsey

/* Registration */

ve.ui.actionFactory.register( mw.languageToolAction );

}() );
