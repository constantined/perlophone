/*!
 * jQuery Cookie Plugin v1.3
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2011, Klaus Hartl
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */
(function ($, document, undefined) {
	var pluses = /\+/g;
	function raw(s) {
		return s;
	}
	function decoded(s) {
		return decodeURIComponent(s.replace(pluses, ' '));
	}
	var config = $.cookie = function (key, value, options) {
		// write
		if (value !== undefined) {
			options = $.extend({}, config.defaults, options);
			options.expires = 365;
/*			if (value === null) {
				options.expires = -1;
			}*/
			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setDate(t.getDate() + days);
			}
			value = config.json ? JSON.stringify(value) : String(value);
			return (document.cookie = [
				encodeURIComponent(key), '=', config.raw ? value : encodeURIComponent(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '',
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}
		// read
		var decode = config.raw ? raw : decoded;
		var cookies = document.cookie.split('; ');
		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			if (decode(parts.shift()) === key) {
				var cookie = decode(parts.join('='));
				return config.json ? JSON.parse(cookie) : cookie;
			}
		}
		return null;
	};
	config.defaults = {};
	$.removeCookie = function (key, options) {
		if ($.cookie(key) !== null) {
			$.cookie(key, null, options);
			return true;
		}
		return false;
	};
})(jQuery, document);


/*
 * jQuery plugin: fieldSelection - v0.1.1 - last change: 2006-12-16
 * (c) 2006 Alex Brem <alex@0xab.cd> - http://blog.0xab.cd
 */
(function() {
	var fieldSelection = {
		getSelection: function() {
			var e = (this.jquery) ? this[0] : this;
			return (
				/* mozilla / dom 3.0 */
				('selectionStart' in e && function() {
					var l = e.selectionEnd - e.selectionStart;
					return {
						start: e.selectionStart,
						end: e.selectionEnd,
						length: l,
						text: e.value.substr(e.selectionStart, l)
					};
				}) ||
				/* exploder */
				(document.selection && function() {
					e.focus();
					var r = document.selection.createRange();
					if (r === null) {
						return { start: 0, end: e.value.length, length: 0 }
					}
					var re = e.createTextRange();
					var rc = re.duplicate();
					re.moveToBookmark(r.getBookmark());
					rc.setEndPoint('EndToStart', re);
					return {
						start: rc.text.length,
						end: rc.text.length + r.text.length,
						length: r.text.length, text: r.text
					};
				}) ||
				/* browser not supported */
				function() { return null; }
			)();
		},
		replaceSelection: function() {
			var e = (this.jquery) ? this[0] : this;
			var text = arguments[0] || '';
			return (
				/* mozilla / dom 3.0 */
				('selectionStart' in e && function() {
					e.value = e.value.substr(0, e.selectionStart) + text
						+ e.value.substr(e.selectionEnd, e.value.length);
					return this;
				}) ||
				/* exploder */
				(document.selection && function() {
					e.focus();
					document.selection.createRange().text = text;
					return this;
				}) ||
				/* browser not supported */
				function() {
					e.value += text;
					return jQuery(e);
				}
			)();
		},
		moveToIndex: function (index) {
			var e = (this.jquery) ? this[0] : this;
			var originalValue = e.val();
			e.val( originalValue.substring(0, e.getSelection().end + 1) );
			e.focus();
			e.append( originalValue.substring(0, originalValue.length) );
		}
	};
	jQuery.each(fieldSelection, function(i) { jQuery.fn[i] = this; });
})();


/*!
 * jQuery.ScrollTo
 * Copyright (c) 2007-2012 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * Date: 4/09/2012
 *
 * @projectDescription Easy element scrolling using jQuery.
 * http://flesler.blogspot.com/2007/10/jqueryscrollto.html
 * @author Ariel Flesler
 * @version 1.4.4
 *
 */
;(function( $ ){
	
	var $scrollTo = $.scrollTo = function( target, duration, settings ){
		$(window).scrollTo( target, duration, settings );
	};
	$scrollTo.defaults = {
		axis:'xy',
		duration: parseFloat($.fn.jquery) >= 1.3 ? 0 : 1,
		limit:true
	};
	// Returns the element that needs to be animated to scroll the window.
	// Kept for backwards compatibility (specially for localScroll & serialScroll)
	$scrollTo.window = function( scope ){
		return $(window)._scrollable();
	};
	// Hack, hack, hack :)
	// Returns the real elements to scroll (supports window/iframes, documents and regular nodes)
	$.fn._scrollable = function(){
		return this.map(function(){
			var elem = this,
				isWin = !elem.nodeName || $.inArray( elem.nodeName.toLowerCase(), ['iframe','#document',
					'html','body'] ) != -1;
				if( !isWin )
					return elem;
			var doc = (elem.contentWindow || elem).document || elem.ownerDocument || elem;
			
			return /webkit/i.test(navigator.userAgent) || doc.compatMode == 'BackCompat' ?
				doc.body : 
				doc.documentElement;
		});
	};
	$.fn.scrollTo = function( target, duration, settings ){
		if( typeof duration == 'object' ){
			settings = duration;
			duration = 0;
		}
		if( typeof settings == 'function' )
			settings = { onAfter:settings };
			
		if( target == 'max' )
			target = 9e9;
			
		settings = $.extend( {}, $scrollTo.defaults, settings );
		// Speed is still recognized for backwards compatibility
		duration = duration || settings.duration;
		// Make sure the settings are given right
		settings.queue = settings.queue && settings.axis.length > 1;
		
		if( settings.queue )
			// Let's keep the overall duration
			duration /= 2;
		settings.offset = both( settings.offset );
		settings.over = both( settings.over );
		return this._scrollable().each(function(){
			// Null target yields nothing, just like jQuery does
			if (target == null) return;
			var elem = this,
				$elem = $(elem),
				targ = target, toff, attr = {},
				win = $elem.is('html,body');
			switch( typeof targ ){
				// A number will pass the regex
				case 'number':
				case 'string':
					if( /^([+-]=)?\d+(\.\d+)?(px|%)?$/.test(targ) ){
						targ = both( targ );
						// We are done
						break;
					}
					// Relative selector, no break!
					targ = $(targ,this);
					if (!targ.length) return;
				case 'object':
					// DOMElement / jQuery
					if( targ.is || targ.style )
						// Get the real position of the target 
						toff = (targ = $(targ)).offset();
			}
			$.each( settings.axis.split(''), function( i, axis ){
				var Pos	= axis == 'x' ? 'Left' : 'Top',
					pos = Pos.toLowerCase(),
					key = 'scroll' + Pos,
					old = elem[key],
					max = $scrollTo.max(elem, axis);
				if( toff ){// jQuery / DOMElement
					attr[key] = toff[pos] + ( win ? 0 : old - $elem.offset()[pos] );
					// If it's a dom element, reduce the margin
					if( settings.margin ){
						attr[key] -= parseInt(targ.css('margin'+Pos)) || 0;
						attr[key] -= parseInt(targ.css('border'+Pos+'Width')) || 0;
					}
					
					attr[key] += settings.offset[pos] || 0;
					
					if( settings.over[pos] )
						// Scroll to a fraction of its width/height
						attr[key] += targ[axis=='x'?'width':'height']() * settings.over[pos];
				}else{ 
					var val = targ[pos];
					// Handle percentage values
					attr[key] = val.slice && val.slice(-1) == '%' ? 
						parseFloat(val) / 100 * max
						: val;
				}
				// Number or 'number'
				if( settings.limit && /^\d+$/.test(attr[key]) )
					// Check the limits
					attr[key] = attr[key] <= 0 ? 0 : Math.min( attr[key], max );
				// Queueing axes
				if( !i && settings.queue ){
					// Don't waste time animating, if there's no need.
					if( old != attr[key] )
						// Intermediate animation
						animate( settings.onAfterFirst );
					// Don't animate this axis again in the next iteration.
					delete attr[key];
				}
			});
			animate( settings.onAfter );
			function animate( callback ){
				$elem.animate( attr, duration, settings.easing, callback && function(){
					callback.call(this, target, settings);
				});
			};
		}).end();
	};
	
	// Max scrolling position, works on quirks mode
	// It only fails (not too badly) on IE, quirks mode.
	$scrollTo.max = function( elem, axis ){
		var Dim = axis == 'x' ? 'Width' : 'Height',
			scroll = 'scroll'+Dim;
		
		if( !$(elem).is('html,body') )
			return elem[scroll] - $(elem)[Dim.toLowerCase()]();
		
		var size = 'client' + Dim,
			html = elem.ownerDocument.documentElement,
			body = elem.ownerDocument.body;
		return Math.max( html[scroll], body[scroll] ) 
			 - Math.min( html[size]  , body[size]   );
	};
	function both( val ){
		return typeof val == 'object' ? val : { top:val, left:val };
	};
})( jQuery );


/*
jquery.flash v1.3.3 -  08/12/10
(c)2009 Stephen Belanger - MIT/GPL.
http://docs.jquery.com/License
*/
;(function($){
	// IE doesn't have navigator.plugins, it uses ActiveXObject instead. >.>
	var isie = function() { var p = navigator.plugins; return (p && p.length) ? false : true; };
	if(isie()) {
		// IE uses an ancient version of Javascript, so let's add the missing indexOf method in manually.
		Array.prototype.indexOf = function(o,i){
			for(var j = this.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0; i < j && this[i] !== o; i++);
			return j <= i ? - 1 : i;
		};
	}
	// Check if browser has flash installed.
	hasflash = function() {
		return (flashversion())
			? true
			: false;
	};
	// Check what version of flash is installed.
	var flashversion = function() {
		if(isie()) {
			var key = 'ShockwaveFlash.ShockwaveFlash';
			try {
				var axo = new ActiveXObject(key+'.7');
			} catch(e) {
				try {
					var axo = new ActiveXObject(key+'.6');
					return [6, 0, 21];
				} catch(e) {};
				try {
					axo = new ActiveXObject(key);
				} catch(e) {};
			}
			if (axo != null) {
				return axo.GetVariable("$version").split(" ")[1].split(",");
			}
		} else {
			var p = navigator.plugins;
			var f = p['Shockwave Flash'];
			if (f && f.description) {
				return f.description.replace(/([a-zA-Z]|\s)+/, "").replace(/(\s+r|\s+b[0-9]+)/, ".")
					.split(".");
			} else if (p['Shockwave Flash 2.0']) {
				return '2.0.0.11';
			}
		}
	};
	// Ok, enough fixing of IE's inadequacies, let's get on with it!
	$.fn.extend({
		flash: function (opt) {
			// Don't even bother if we don't have Flash installed.
			if (hasflash()) {
				// Let's make some handy functions to minimize code repetition.
				function attr(a,b){return ' '+a+'="'+b+'"';}
				function param(a,b){return '<param name="'+a+'" value="'+b+'" />';}
				
				// Get current version for express install checking.
				var cv = flashversion();
				
				// Finally, we're on to the REAL action.
				$(this).each(function () {
					// Create a reference to the current item as a jquery object.
					var e = $(this);
					
					// Merge settings objects.
					var s = $.extend({
							'id': e.attr('id')
							, 'class': e.attr('class')
							, 'width': e.width()
							, 'height': e.height()
							, 'src': e.attr('href')
							, 'classid': 'clsid:D27CDB6E-AE6D-11cf-96B8-444553540000'
							, 'pluginspace': 'http://get.adobe.com/flashplayer'
							, 'type': 'application/x-shockwave-flash'
							, 'availattrs': [
								'id'
								, 'class'
								, 'width'
								, 'height'
								, 'src'
								, 'type'
							]
							, 'availparams': [
								'src'
								, 'bgcolor'
								, 'quality'
								, 'allowscriptaccess'
								, 'allowfullscreen'
								, 'flashvars'
								, 'wmode'
							]
							, 'version': '9.0.24'
						}, opt);
					
					// Collect list of attributes and parameters to use.
					var a = s.availattrs;
					var p = s.availparams;
					
					// Get required version array.
					var rv = s.version.split('.');
					
					// Open output string.
					var o = '<object';
					
					// Set codebase, if not supplied in the settings.
					if (!s.codebase) {
					  s.codebase = (('https:' == document.location.protocol) ? 'https' : 'http')
						+'://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version='
						+ rv.join(',');
					}
					
					// Use express install swf, if necessary.
					if (s.express) {
						for (var i in cv) {
							if (parseInt(cv[i]) > parseInt(rv[i])) {
								break;
							}
							if (parseInt(cv[i]) < parseInt(rv[i])) {
								s.src = s.express;
							}
						}
					}
					
					// Convert flashvars to query string.
					if (s.flashvars) {
						s.flashvars = unescape($.param(s.flashvars));
					}
					
					// Set browser-specific attributes
					a = isie() ? a.concat(['classid', 'codebase']) : a.concat(['pluginspage']);
					
					// Add attributes to output buffer.
					for (k in a) {
						var n = (k == a.indexOf('src')) ? 'data' : a[k];
						o += s[a[k]] ? attr(n, s[a[k]]) : '';
					};
					o += '>';
					
					// Add parameters to output buffer.
					for (k in p) {
						var n = (k == p.indexOf('src')) ? 'movie' : p[k];
						o += s[p[k]] ? param(n, s[p[k]]) : '';
					};
					
					// Close and swap.
					o += '</object>';
					e.replaceWith(o);
				});
			}
					
			return this;
		}
	});
})(jQuery);


/**
 * jQuery Favicon plugin
 *
 * Copyright (c) 2010 HelloWebApps.com
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * @author Volodymyr Iatsyshyn (viatsyshyn@hellowebapps.com)
 * @url http://hellowebapps.com/products/jquery-favicon/
 * @version 0.2.1
 */
(function($) {
  var canvas;
  function apply(url) {
    $('link[rel$=icon]').replaceWith('');
    $('<link rel="shortcut icon" type="image/x-icon"/>')
      .appendTo('head')
      .attr('href', url);
  }
  /**
   * jQuery.favicon
   *
   * @param {String} iconURL
   * @param {String} alternateURL
   * @param {Function} onDraw
   *
   * function (iconURL)
   * function (iconURL, onDraw)
   * function (iconURL, alternateURL, onDraw)
   */
  $.favicon = function(iconURL, alternateURL, onDraw) {
    if (arguments.length == 2) {
      // alternateURL is optional
      onDraw = alternateURL;
    }
    if (onDraw) {
      canvas = canvas || $('<canvas />')[0];
      if (canvas.getContext) {
        var img = $('<img />')[0];
        img.onload = function () {
          $.favicon.unanimate();
          canvas.height = canvas.width = this.width;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(this, 0, 0);
          onDraw(ctx);
          apply(canvas.toDataURL('image/png'));
        };
        img.src = iconURL;
      } else {
        apply(alternateURL || iconURL);
      }
    } else {
      $.favicon.unanimate();
      apply(iconURL);
    }
    return this;
  };
  var animation = {
    timer: null,
    frames: [],
    size: 16,
    count: 1
  };
  $.extend($.favicon, {
    /**
     * jQuery.favicon.animate - starts frames based animation
     *
     * @param {String}      animationURL    Should be image that contains frames joined horizontally
     * @param {String}      alternateURL    Normal one frame image that will be used if Canvas is not supported
     * @param {Object}      options         optional
     *
     * function (animationURL, alternateURL)
     * function (animationURL, alternateURL, {
     *   interval: 1000, // change frame in X ms, default is 1000ms
     *   onDraw: function (context, frame) {}, // is called each frame
     *   onStop: function () {}, // is called on animation stop
     *   frames: [1,3,5] // display frames in this exact order, defaults is all frames
     * })
     */
    animate: function (animationURL, alternateURL, options) {
      options = options || {};
      canvas = canvas || $('<canvas />')[0];
      if (canvas.getContext) {
        var img = $('<img />')[0];
        img.onload = function () {
          $.favicon.unanimate();
          animation.onStop = options.onStop;
          animation.image = this;
          canvas.height = canvas.width = animation.size = this.height;
          animation.count = this.width / this.height;
          var frames = [];
          for (var i = 0; i < animation.count; ++i) frames.push(i);
          animation.frames = options.frames || frames;
          var ctx = canvas.getContext('2d');
          options.onStart && options.onStart();
          animation.timer = setInterval(function () {
            // get current frame
            var frame = animation.frames.shift();
            animation.frames.push(frame);
            // check if frame exists
            if (frame >= animation.count) {
              clearInterval(animation.timer);
              animation.timer = null;
              throw new Error('jQuery.favicon.animate: frame #' + frame + ' do not exists in "' + animationURL + '"');
            }
            // draw frame
            var s = animation.size;
            ctx.clearRect(0, 0, s, s);
            ctx.drawImage(animation.image, s * frame, 0, s, s, 0, 0, s, s);
            // User Draw event
            options.onDraw && options.onDraw(ctx, frame);
            // set favicon
            apply(canvas.toDataURL('image/png'));
          }, options.interval || 1000);
        };
        img.src = animationURL;
      } else {
        apply(alternateURL || animationURL);
      }
    },
    /**
     * jQuery.favicon.unanimate - stops current animation
     */
    unanimate: function () {
      if (animation.timer) {
        clearInterval(animation.timer);
        animation.timer = null;
        animation.onStop && animation.onStop();
      }
    }
  })
})(jQuery);


/*
		Конец плагинов и начало кода.
*/
var ws, cmd, title, conn_time, speed_timer, preloaded, speed_interval = 60*30, missed_messages = 0,
	mouse_over = true, is_captcha, sendMessage;
var saveFormToCookies = function (list) {
	list.each(function () {
		var id = $(this).attr('id');
		if ($(this).attr('type') == 'checkbox') {
			$.cookie(id, $(this).attr('checked')?'checked':'');
		} else {
			$.cookie(id, $(this).val());
		}
	});
}
var loadFormFromCookies = function (list) {
	list.each(function () {
		var id = $(this).attr('id');
		if ($(this).attr('type') == 'checkbox') {
			$(this).attr('checked', $.cookie(id)?'checked':false);
		} else {
			$(this).val($.cookie(id));
		}
	});
}
var unixTime = function () {
	return Math.round((new Date()).getTime() / 1000);
}
var getNick = function () {
	var nick = $.cookie('cfg_nick');
	return (!nick || $.cookie('cfg_anonymous') == 'on')?'':nick;
}
var resizeElements = function () {
	var scrollbox = $('#scrollbox');
	var textbox_wrapper = $('#textbox_wrapper');
	var smiles_box = $('#smiles_box');
	scrollbox.css({
		'width': $('#hbox').width(),
		'height': $(window).height()-$('#hbox').height()
	});
	smiles_box.css({
		top: textbox_wrapper.offset().top,
		left: textbox_wrapper.offset().left-6,
		width: textbox_wrapper.width()+6,
		height: textbox_wrapper.height()
	});
};
var hltMsg = function (id) {
	$('.highlight').removeClass('highlight');
	$('#msg_'+id).addClass('highlight');
};
var scrlMsg = function (id) {
	$('#scrollbox').scrollTo( $('#msg_'+id) );
};
var reply = function (id) {
	var textbox = $('#textbox');
	textbox.replaceSelection('>>'+id+' ');
	textbox.focus();
};
var openSettings = function () {
	loadFormFromCookies($('#settingsForm input,#settingsForm select'));
	$('#hbox').css('visibility', 'hidden');
	$('#popup').css('display', 'table');
}
var closeSettings = function () {
	$('#popup').css('display', 'none');
	$('#hbox').css('visibility', 'visible');
}
var saveSettings = function () {
	var do_reconn = ( $('#cfg_server').val() != $.cookie('cfg_server') );
	saveFormToCookies($('#settingsForm input,#settingsForm select'));
	if (do_reconn) reconnect();
	closeSettings();
}
var openCloseSmilesBox = function () {
	var smiles_box = $('#smiles_box');
	if (smiles_box.css('display') == 'block') {
		smiles_box.css('display', 'none')
	} else {
		smiles_box.css('display', 'block')
	}
}
var symbols_left = function () {
	return ( 255 - (getNick().length + $('#textbox').val().length) );
}
var calc_symbols_left = function () {
	$('#symb_count b').html(symbols_left());
}
var set_speed = function (msg) {
	$('#speed b').html(msg);
}
var calc_speed = function () {
	var prs_time = unixTime();
	var time_diff = prs_time - conn_time;
	if (time_diff == 0) return;
	if (time_diff > speed_interval) time_diff = speed_interval;
	var min_time = prs_time - time_diff;
	var count = 0;
	$('#scrollbox div[time]').each(function () {
		if ( $(this).attr('time') >= min_time ) {
			count++;
		} else {
			$(this).removeAttr('time');
		}
	});
	set_speed(Math.round(count*3600/time_diff));
}
var set_online = function (msg) {
	$('#online b').html(msg);
}
var set_missed_msgs = function () {
	var cfg_anim_icon = $.cookie('cfg_anim_icon');
	if (mouse_over) {
		missed_messages = 0;
		if ( cfg_anim_icon ) {
			jQuery.favicon('/favicon.ico');
		} else {
			$('title').html(title);
		}
	} else {
		missed_messages++;
		if ( cfg_anim_icon ) {
			jQuery.favicon('/favicon.ico', function (ctx) {
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillStyle = '#FF0000';
				ctx.fillText(missed_messages, 7, 8, 16);
			});
		} else {
			$('title').html('[ '+missed_messages+' ] ' + title);
		}
	}

}
var reconnect = function () {
	if ( typeof ws == 'object' && typeof ws.close == 'function' ) ws.close();
	ws = new WebSocket('ws://'+location.host+':7654');
	ws.onopen = function () {
		preloaded = false;
		$(scrollbox).html('');
//		conn_time = unixTime();
//		speed_timer = setInterval(calc_speed, 10000);
	};
	ws.onmessage = function (e) {
		var scrollbox = $('#scrollbox');
		var bottom = (scrollbox.scrollTop()+scrollbox.height() == scrollbox.prop('scrollHeight'));
		scrollbox.append(e.data);
		if (bottom) {
			scrollbox.scrollTop(scrollbox.prop('scrollHeight'));
		}
	};
	ws.onerror = ws.onclose = function () {
		clearInterval(speed_timer);
		$(scrollbox).html('<table style="text-align:center"><tr><td>Соединение с сервером потеряно.'
			+'<br><br><button onclick="reconnect()">Переподключиться</button></td></tr></table>');
	};
	sendMessage = function () {
		var textbox = $('#textbox');
		if ( !textbox.val() ) return;
		ws.send(textbox.val());
		textbox.val('');
	};
}


$(window).load(function () {
	title = $('title').html();

// для всех кнопок
	$('.button').click(function () {
		if ( $(this).hasClass('button_active') ) {
			$(this).removeClass('button_active');
			$(this).trigger('off');
		} else {
			$(this).addClass('button_active');
			$(this).trigger('on');
		}
	});

	var anonymous_mode = $('#anonymous_mode');
	if ( $.cookie('cfg_anonymous') == 'on' ) anonymous_mode.addClass('button_active');
	anonymous_mode.bind('on', function () { $.cookie('cfg_anonymous', 'on'); calc_symbols_left(); });
	anonymous_mode.bind('off', function () { $.cookie('cfg_anonymous', 'off'); calc_symbols_left(); });
	$('#textbox').keydown(function(e) {
		if (e.which == 13) {
			sendMessage();
			e.preventDefault();
		} else if ( symbols_left() <= 0 && $.inArray(e.which, [8, 9, 46, 37, 38, 39, 40]) == -1 ) {
			e.preventDefault();
		}
	});
	$('#textbox').keyup(calc_symbols_left);
	calc_symbols_left();
	resizeElements();
	reconnect();
});
$(window).resize(function () {
	resizeElements();
});
$(window).bind('focus', function () {
	mouse_over = true;
	set_missed_msgs();
}).bind('blur', function () {
	mouse_over = false;
});




