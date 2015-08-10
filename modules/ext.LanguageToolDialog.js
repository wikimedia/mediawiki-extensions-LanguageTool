( function () {
'use strict';

/*!
 * VisualEditor extension LanguageToolDialog class.
 *
 * @copyright
  Amir E. Aharoni
  Eran Rosenthal
  Ankita Kumari
 */

/**
 * LanguageTool dialog.
 *
 * @class
 * @extends ve.ui.ToolbarDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
mw.LanguageToolDialog = function VeUiLanguageToolDialog( config ) {
	// Parent constructor
	mw.LanguageToolDialog.super.call( this, config );

	// Pre-initialization
	this.$element.addClass( 've-ui-findAndReplaceDialog' );
};

/* Inheritance */

OO.inheritClass( mw.LanguageToolDialog, ve.ui.ToolbarDialog );

mw.LanguageToolDialog.static.name = 'LanguageTool';

mw.LanguageToolDialog.static.title = OO.ui.deferMsg( 'visualeditor-find-and-replace-title' );

/**
 * Maximum number of results to render
 *
 * @property {number}
 */
mw.LanguageToolDialog.static.maxRenderedResults = 100;

/* Methods */

/**
 * @inheritdoc
 */
mw.LanguageToolDialog.prototype.initialize = function () {
	// Parent method
	mw.LanguageToolDialog.super.prototype.initialize.call( this );

	// Properties
	this.surface = null;
	this.errors = [];
	this.ranges = [];
	this.$errors = $( '<div>' ).addClass( 've-ui-findAndReplaceDialog-findResults' );
	this.initialFragment = null;
	this.fragments = [];
	this.results = 0;
	// Range over the list of fragments indicating which ones where rendered,
	// e.g. [1,3] means fragments 1 & 2 were rendered
	this.renderedFragments = null;
	this.replacing = false;
	this.focusedIndex = 0;
	this.query = null;
	this.findText = new OO.ui.TextInputWidget( {
		placeholder: ve.msg( 'visualeditor-find-and-replace-find-text' ),
		readOnly: true
	} );
	this.sendButton = new OO.ui.ButtonWidget( {
		icon: 'check',
		iconTitle: 'LanguageTool'
	} );
	this.previousButton = new OO.ui.ButtonWidget( {
		icon: 'previous',
		iconTitle: ve.msg( 'visualeditor-find-and-replace-previous-button' ) + ' ' +
			ve.ui.triggerRegistry.getMessages( 'findPrevious' ).join( ', ' )
	} );
	this.nextButton = new OO.ui.ButtonWidget( {
		icon: 'next',
		iconTitle: ve.msg( 'visualeditor-find-and-replace-next-button' ) + ' ' +
			ve.ui.triggerRegistry.getMessages( 'findNext' ).join( ', ' )
	} );
	this.replaceText = new OO.ui.TextInputWidget( {
		placeholder: ve.msg( 'visualeditor-find-and-replace-replace-text' ),
		readOnly: true
	} );
	this.replaceButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-find-and-replace-replace-button' )
	} );

	var optionsGroup = new OO.ui.ButtonGroupWidget( {
			classes: [ 've-ui-findAndReplaceDialog-cell' ],
			items: [
				this.sendButton
			]
		} ),
		navigateGroup = new OO.ui.ButtonGroupWidget( {
			classes: [ 've-ui-findAndReplaceDialog-cell' ],
			items: [
				this.previousButton,
				this.nextButton
			]
		} ),
		replaceGroup = new OO.ui.ButtonGroupWidget( {
			classes: [ 've-ui-findAndReplaceDialog-cell' ],
			items: [
				this.replaceButton
			]
		} ),
		doneButton = new OO.ui.ButtonWidget( {
			classes: [ 've-ui-findAndReplaceDialog-cell' ],
			label: ve.msg( 'visualeditor-find-and-replace-done' )
		} ),
		$findRow = $( '<div>' ).addClass( 've-ui-findAndReplaceDialog-row' ),
		$replaceRow = $( '<div>' ).addClass( 've-ui-findAndReplaceDialog-row' );

	// Events
	this.onWindowScrollDebounced = ve.debounce( this.onWindowScroll.bind( this ), 250 );
	this.updateFragmentsDebounced = ve.debounce( this.updateFragments.bind( this ) );
	this.renderFragmentsDebounced = ve.debounce( this.renderFragments.bind( this ) );
	this.sendButton.connect( this, { click: 'send' } );
	this.nextButton.connect( this, { click: 'findNext' } );
	this.previousButton.connect( this, { click: 'findPrevious' } );
	this.replaceButton.connect( this, { click: 'onReplaceButtonClick' } );
	doneButton.connect( this, { click: 'close' } );

	// Initialization
	this.findText.$input.prop( 'tabIndex', 1 );
	this.replaceText.$input.prop( 'tabIndex', 2 );
	this.$content.addClass( 've-ui-findAndReplaceDialog-content' );
	this.$body
		.append(
			$findRow.append(
				$( '<div>' ).addClass( 've-ui-findAndReplaceDialog-cell ve-ui-findAndReplaceDialog-cell-input' ).append(
					this.findText.$element
				),
				navigateGroup.$element,
				optionsGroup.$element
			),
			$replaceRow.append(
				$( '<div>' ).addClass( 've-ui-findAndReplaceDialog-cell ve-ui-findAndReplaceDialog-cell-input' ).append(
					this.replaceText.$element
				),
				replaceGroup.$element,
				doneButton.$element
			)
		);
};

/**
 * @inheritdoc
 */
mw.LanguageToolDialog.prototype.getSetupProcess = function ( data ) {
	data = data || {};
	return mw.LanguageToolDialog.super.prototype.getSetupProcess.call( this, data )
		.first( function () {
			var text, fragment = data.fragment;

			this.surface = data.surface;
			this.surface.$selections.append( this.$errors );

			// Events
			this.surface.getModel().connect( this, { documentUpdate: this.updateFragmentsDebounced } );
			this.surface.getView().connect( this, { position: this.renderFragmentsDebounced } );
			this.surface.getView().$window.on( 'scroll', this.onWindowScrollDebounced );

			text = fragment.getText();
			if ( text && text !== this.findText.getValue() ) {
				this.findText.setValue( text );
			}

			this.initialFragment = fragment;
		}, this );
};

/**
 * @inheritdoc
 */
mw.LanguageToolDialog.prototype.getReadyProcess = function ( data ) {
	return mw.LanguageToolDialog.super.prototype.getReadyProcess.call( this, data )
		.next( function () {
			this.findText.focus().select();
		}, this );
};

/**
 * @inheritdoc
 */
mw.LanguageToolDialog.prototype.getTeardownProcess = function ( data ) {
	return mw.LanguageToolDialog.super.prototype.getTeardownProcess.call( this, data )
		.next( function () {
			var selection,
				surfaceView = this.surface.getView(),
				surfaceModel = this.surface.getModel();

			// Events
			this.surface.getModel().disconnect( this );
			surfaceView.disconnect( this );
			this.surface.getView().$window.off( 'scroll', this.onWindowScrollDebounced );

			// If the surface isn't selected, put the selection back in a sensible place
			if ( surfaceModel.getSelection() instanceof ve.dm.NullSelection ) {
				if ( this.fragments.length ) {
					// Either the active search result...
					selection = this.fragments[ this.focusedIndex ].getSelection();
				} else if ( !( this.initialFragment.getSelection() instanceof ve.dm.NullSelection ) ) {
					// ... or the initial selection
					selection = this.initialFragment.getSelection();
				}
			}
			if ( selection ) {
				surfaceModel.setSelection( selection );
			} else {
				// If the selection wasn't changed, focus anyway
				surfaceView.focus();
			}
			this.fragments = [];
			this.surface = null;
		}, this );
};

/**
 * Handle window scroll events
 */
mw.LanguageToolDialog.prototype.onWindowScroll = function () {
	if ( this.renderedFragments.getLength() < this.errors.length ) {
		// If viewport clipping is being used, reposition results based on the current viewport
		this.renderFragments();
	}
};

/**
 * Update search result fragments
 */
mw.LanguageToolDialog.prototype.updateFragments = function () {
	var i, l,
		surfaceModel = this.surface.getModel(),
		documentModel = surfaceModel.getDocument(),
		ranges = [],
		find = this.findText.getValue();

	this.send();
	this.query = find;
	this.findText.setValidityFlag();

	this.fragments = [];
	if ( this.query ) {
		ranges = documentModel.findText( this.query, true );
		for ( i = 0, l = ranges.length; i < l; i++ ) {
			this.fragments.push( surfaceModel.getLinearFragment( ranges[ i ], true, true ) );
		}
	}
	this.results = this.fragments.length;
	this.focusedIndex = Math.min( this.focusedIndex, this.results ? this.results - 1 : 0 );
	this.nextButton.setDisabled( !this.results );
	this.previousButton.setDisabled( !this.results );
	this.replaceButton.setDisabled( !this.results );
};

/**
 * Position results markers
 */
mw.LanguageToolDialog.prototype.renderFragments = function () {
	if ( this.replacing ) {
		return;
	}

	var i, selection, viewportRange,
		start = 0,
		end = this.errors.length;

	// When there are a large number of results, calculate the viewport range for clipping
	if ( this.errors > 50 ) {
		viewportRange = this.surface.getView().getViewportRange();
		for ( i = 0; i < this.errors; i++ ) {
			selection = this.fragments[ i ].getSelection();
			if ( viewportRange && selection.getRange().start < viewportRange.start ) {
				start = i + 1;
				continue;
			}
			if ( viewportRange && selection.getRange().end > viewportRange.end ) {
				end = i;
				break;
			}
		}
	}

	// When there are too many results to render, just render the current one
	if ( end - start <= this.constructor.static.maxRenderedResults ) {
		this.renderRangeOfFragments( new ve.Range( start, end ) );
	} else {
		this.renderRangeOfFragments( new ve.Range( this.focusedIndex, this.focusedIndex + 1 ) );
	}
};

/**
 * Render subset of search result fragments
 *
 * @param {ve.Range} range Range of fragments to render
 */
mw.LanguageToolDialog.prototype.renderRangeOfFragments = function ( range ) {
	var i, j, jlen, rects, $result, top;

	this.$errors.empty();
	for ( i = range.start; i < range.end; i++ ) {
		rects = this.surface.getView().getSelectionRects( this.fragments[ i ].getSelection() );
		$result = $( '<div>' ).addClass( 've-ui-findAndReplaceDialog-findResult' );
		top = Infinity;
		for ( j = 0, jlen = rects.length; j < jlen; j++ ) {
			top = Math.min( top, rects[ j ].top );
			$result.append( $( '<div>' ).css( {
				top: rects[ j ].top,
				left: rects[ j ].left,
				width: rects[ j ].width,
				height: rects[ j ].height
			} ) );
		}
		$result.data( 'top', top );
		this.$errors.append( $result );
	}
	this.renderedFragments = range;
	this.highlightFocused();
	this.displayInformation();
};

/**
 * Highlight the focused result marker
 *
 * @param {boolean} scrollIntoView Scroll the marker into view
 */
mw.LanguageToolDialog.prototype.highlightFocused = function ( scrollIntoView ) {
	var $result, rect, top,
		offset, windowScrollTop, windowScrollHeight,
		surfaceView = this.surface.getView();

	if ( this.errors.length ) {
		this.findText.setLabel(
			ve.msg( 'visualeditor-find-and-replace-results', this.focusedIndex + 1, this.errors.length )
		);
	} else {
		this.findText.setLabel(
			''
		);
		return;
	}

	this.$errors
		.find( '.ve-ui-findAndReplaceDialog-findResult-focused' )
		.removeClass( 've-ui-findAndReplaceDialog-findResult-focused' );

	if ( this.renderedFragments.containsOffset( this.focusedIndex ) ) {
		$result = this.$errors.children().eq( this.focusedIndex - this.renderedFragments.start )
			.addClass( 've-ui-findAndReplaceDialog-findResult-focused' );

		top = $result.data( 'top' );
	} else if ( scrollIntoView ) {
		// If we're about to scroll into view and the result isn't rendered, compute the offset manually.
		rect = surfaceView.getSelectionBoundingRect( this.fragments[ this.focusedIndex ].getSelection() );
		top = rect.top;
	}

	if ( scrollIntoView ) {
		surfaceView = this.surface.getView();
		offset = top + surfaceView.$element.offset().top;
		windowScrollTop = surfaceView.$window.scrollTop() + this.surface.toolbarHeight;
		windowScrollHeight = surfaceView.$window.height() - this.surface.toolbarHeight;

		if ( offset < windowScrollTop || offset > windowScrollTop + windowScrollHeight ) {
			$( 'body, html' ).animate( { scrollTop: offset - ( windowScrollHeight / 2  ) }, 'fast' );
		}
	}
};

/**
 * Find the next result
 */
mw.LanguageToolDialog.prototype.findNext = function () {
	this.focusedIndex = ( this.focusedIndex + 1 ) % this.errors.length;
	this.highlightFocused( true );
	this.displayInformation();
};

/**
 * Find the previous result
 */
mw.LanguageToolDialog.prototype.findPrevious = function () {
	this.focusedIndex = ( this.focusedIndex + this.errors.length - 1 ) % this.errors.length;
	this.highlightFocused( true );
	this.displayInformation();
};

/**
 * Handle click events on the replace button
 */
mw.LanguageToolDialog.prototype.onReplaceButtonClick = function () {
	var end;

	if ( !this.errors.length ) {
		return;
	}

	this.replace( this.focusedIndex );

	// Find the next fragment after this one ends. Ensures that if we replace
	// 'foo' with 'foofoo' we don't select the just-inserted text.
	end = this.fragments[ this.focusedIndex ].getSelection().getRange().end;
	// updateFragmentsDebounced is triggered by insertContent, but call it immediately
	// so we can find the next fragment to select.
	this.updateFragments();
	if ( !this.errors.length ) {
		this.focusedIndex = 0;
		return;
	}
	while ( this.fragments[ this.focusedIndex ] && this.fragments[ this.focusedIndex ].getSelection().getRange().end <= end ) {
		this.focusedIndex++;
	}
	// We may have iterated off the end
	this.focusedIndex = this.focusedIndex % this.errors.length;
};

/**
 * Replace the result at a specified index
 *
 * @param {number} index Index to replace
 */
mw.LanguageToolDialog.prototype.replace = function ( index ) {
	var replaceArr, replace = this.replaceText.getValue();
	replaceArr = replace.split( '#' );
	replace = replaceArr[ 0 ];
	this.fragments[ index ].insertContent( replace, true );
};

/**
 * Send text to LanguageTool server
 *
 * @method
 * @return {NULL} Action was executed
 */
mw.LanguageToolDialog.prototype.send = function () {
	var model, data, mapper, i, textArray, text, lang,
		self = this;

	model = ve.init.target.getSurface().getModel();
	data = model.getDocument().data.getData();

	mapper = [];
	for ( i = 0; i < data.length; i++ ) {
		if ( ( typeof data[ i ] ) === 'string' || ( typeof data[ i ][ 0 ] ) === 'string' ) {
			mapper.push( i );
		}
	}

	textArray = [];
	for ( i = 0; i < mapper.length; i++ ) {
		if ( ( typeof data[ mapper[ i ] ] ) === 'string' ) {
			textArray[ i ] = data[ mapper[ i ] ];
		} else {
			textArray[ i ] = data[ mapper[ i ] ][ 0 ];
		}
	}

	text = textArray.join( '' );

	// TODO: Get the language from VE's data model
	lang = mw.config.get( 'wgPageContentLanguage' );
	if ( lang === 'en' ) {
		lang = 'en-US';
	}

	$.ajax( {
		type: 'POST',
		dataType: 'xml',
		url: 'http://tools.wmflabs.org/languageproofing/',
		data: { language: lang, text: text }
	} ).done( function ( responseXML ) {
		self.openDialog.apply( self, [ responseXML, mapper ] );
	} );
	return;
};

mw.LanguageToolDialog.prototype.openDialog = function ( responseXML, mapper ) {
	var languageCode, previousSpanStart, cssName,
		errorIndex, error, spanStart, spanEnd,
		range, fragment, ruleId, surfaceModel;

	this.ranges = [];
	this.fragments = [];

	this.processXML( responseXML );
	surfaceModel = this.surface.getModel();
	// TODO: Get the language from VE's data model
	languageCode = mw.config.get( 'wgPageContentLanguage' );
	previousSpanStart = -1;

	// iterate backwards as we change the text and thus modify positions:
	for ( errorIndex = 0; errorIndex < this.errors.length; errorIndex++ ) {
		error = this.errors[ errorIndex ];

		if ( !error.used ) {
			spanStart = error.offset;
			spanEnd = spanStart + error.errorlength;

			if ( previousSpanStart !== -1 && spanEnd < previousSpanStart ) {
				// overlapping errors - these are not supported by our underline approach,
				// as we would need overlapping <span>s for that, so skip the error:
				continue;
			}

			previousSpanStart = spanStart;
			range = new ve.Range( mapper[ spanStart ], mapper[ spanEnd ] );
			fragment = surfaceModel.getLinearFragment( range, true, true );

			ruleId = error.ruleId;
			this.ranges.push( range );
			this.fragments.push( fragment );

			if ( ruleId.indexOf( 'SPELLER_RULE' ) >= 0 ||
				ruleId.indexOf( 'MORFOLOGIK_RULE' ) === 0 ||
				ruleId === 'HUNSPELL_NO_SUGGEST_RULE' ||
				ruleId === 'HUNSPELL_RULE'
			) {
				cssName = 'hiddenSpellError';
			} else {
				cssName = 'hiddenGrammarError';
			}
			error.used = true;
		}
	}
	this.renderFragments();
};

mw.LanguageToolDialog.prototype.processXML = function ( responseXML ) {
	var errors, i, error, suggestionsStr, url;

	this.errors = [];
	errors = responseXML.getElementsByTagName( 'error' );

	for ( i = 0; i < errors.length; i++ ) {
		if ( errors[ i ].getAttribute( 'ruleId' ) === 'SENTENCE_WHITESPACE' ) {
			continue;
		}
		error = {};

		// I didn't manage to make the CSS break the text, so we add breaks with Javascript:
		error.description = this.wordwrap(
			errors[ i ].getAttribute( 'msg' ), 50, '<br/>'
		);
		error.replacements = [];
		suggestionsStr = errors[ i ].getAttribute( 'replacements' );

		if ( suggestionsStr ) {
			error.replacements = suggestionsStr;
		}

		error.offset = parseInt( errors[ i ].getAttribute( 'offset' ) );
		error.errorlength = parseInt( errors[ i ].getAttribute( 'errorlength' ) );
		error.type = errors[ i ].getAttribute( 'category' );
		error.ruleId = errors[ i ].getAttribute( 'ruleId' );
		error.subId = errors[ i ].getAttribute( 'subId' );
		url = errors[ i ].getAttribute( 'url' );

		if ( url ) {
			error.moreinfo = url;
		}

		this.errors.push( error );
	}
};

// Wrapper code by James Padolsey
// Source: http://james.padolsey.com/javascript/wordwrap-for-javascript/
// License: 'This is free and unencumbered software released into the public domain.',
// see http://james.padolsey.com/terms-conditions/
mw.LanguageToolDialog.prototype.wordwrap = function ( str, width, brk, cut ) {
	var regex;

	width = width || 75;
	brk = brk || '\n';
	cut = cut || false;

	if ( !str ) {
		return str;
	}

	regex = '.{1,' + width + '}(\\s|$)' + ( cut ? '|.{' + width + '}|.+$' : '|\\S+?(\\s|$)' );

	return str.match( new RegExp( regex, 'g' ) ).join( brk );
};
// End of wrapper code by James Padolsey

mw.LanguageToolDialog.prototype.displayInformation = function () {
	var replacements, error;

	error = this.errors[ this.focusedIndex ].description;
	replacements = this.errors[ this.focusedIndex ].replacements;
	this.findText.setValue( error );
	this.replaceText.setValue( replacements );
	return;
};

/**
 * @inheritdoc
 */
mw.LanguageToolDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'findNext' || action === 'findPrevious' ) {
		return new OO.ui.Process( this[ action ], this );
	}
	return mw.LanguageToolDialog.super.prototype.getActionProcess.call( this, action );
};

/* Registration */

ve.ui.windowFactory.register( mw.LanguageToolDialog );
}() );
