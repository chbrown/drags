if (window.console === undefined) {
  window.console = {log: function() { } };// just swallow any logs, if there aren't any dev tools available.
}

// Cookie plugin Copyright (c) 2006 Klaus Hartl (stilbuero.de)
// Dual licensed under the MIT and GPL licenses.
// Some modifications by Christopher Brown <io@henrian.com>
var cookie_defaults = {};
function Cookie() {}
Cookie.set = function(name, value, options) {
  // name and value given, set cookie
  options = options || _cookie_default_options;
  if (value === null) {
    value = '';
    options.expires = -1;
  }
  var expires = '';
  if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
    var date;
    if (typeof options.expires == 'number') {
      date = new Date();
      date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
    } else {
      date = options.expires;
    }
    expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
  }
  var path = options.path ? ('; path=' + options.path) : '';
  var domain = options.domain ? ('; domain=' + options.domain) : '';
  var secure = options.secure ? '; secure' : '';
  document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
};
Cookie.get = function(name, options) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = jQuery.trim(cookies[i]);
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) == (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// local setup
cookie_defaults = {expires: 31, path: '/'};
$.ajaxSetup({
  type: 'POST',
  dataType: 'json',
  contentType: 'application/json',
  accepts: 'application/json',
  processData: false
});

function timestamp() { return (new Date()).getTime(); }

(function($) {
  function Preloader(urls, $buffer, debug) {
    // urls will be a list of strings
    // each url, on loading, will be stuck in the dom, in a hidden div.
    // keyed by their santized urls as element ids, i.e. url.replace(/\W/g, '')
    this.urls = urls;
    this.cache = {}; // keyed by url. The value is null while being loaded, and the element when completed.
    this.callbacks = {}; // keyed by url, lists of callbacks for when a particular movie is done.
    this.progresses = {}; // keyed by url, jQuery elements | undefined
    this.currently_loading_url = '';
    // this.index = 0;
    this.paused = false;
    this.processing_queue = false;
    this.$buffer = $buffer;
    this.timeouts = {zero: 20, slow: 80, hard: 200, wait: 200, loop: 250};
    this.debug = debug === undefined ? false : debug;
    // this.processQueue(); // don't automatically start
  }
  Preloader.prototype.pauseQueue = function() {
    this.paused = true;
  };
  Preloader.prototype.abortPreload = function(url) {
    this.pauseQueue();
    if (url === undefined) {
      url = this.currently_loading_url;
    }
    var $element = this.$fromUrl(url);
    // url = $source.attr('src');
    $element.children('source').attr('src', '');
    if ($element[0] && $element[0].load) {
      $element[0].load();
    }
    $element.remove();
    
    delete this.cache[url];
  };
  Preloader.prototype.unpauseQueue = function() {
    this.paused = false;
    this.processQueue();
  };
  Preloader.prototype.onLoaded = function(url, callback) {
    // callback signature: function(err, raw_media_element) -- same as getMedia
    // these will be called before getMedia's own callback is called
    if (this.callbacks[url] === undefined) {
      this.callbacks[url] = [];
    }
    this.callbacks[url].push(callback);
  };
  Preloader.prototype.processQueue = function(state) {
    var preloader = this;
    if (preloader.paused) {
      preloader.processing_queue = false;
    }
    else if (preloader.processing_queue && state !== 'continue') {
      preloader.processing_queue = false;
    }
    else {
      preloader.processing_queue = true;
      $.each(preloader.urls.slice(0, preload_limit), function(i, url) {
        if (preloader.cache[url] === undefined) { // it's neither queued nor already loaded.
          return preloader.getMedia({url: url}, function(err, media) {
            // just ignore the media for now, since it's in the cache
            if (err) { console.log(err); }
            preloader.processing_queue = false;
            return preloader.processQueue('continue');
          });
        }
      });
    }
  };
  Preloader.prototype.$fromUrl = function(url, make_if_missing) {
    var $element = $('#' + url.replace(/\W/g, ''));
    if (this.debug) console.log('Preloader.$fromUrl', url, $element.length, make_if_missing);
    if (!$element.length && make_if_missing === true) {
      if (url.match(/\.(mp4|m4v)/)) {
        $element = $('<video width="640" height="360" ' +
          'id="' + url.replace(/\W/g, '') + '" ' +
          'style="display: none" autobuffer preload="auto">' +
          '<source src="' + url + '" type="video/mp4"></video>').appendTo(this.$buffer);
      }
      else {
        $element = $('<audio id="' + url.replace(/\W/g, '') + '" ' +
          'style="display: none" autobuffer preload="auto">' +
          '<source src="' + url + '"></audio>').appendTo(this.$buffer);
      }
    }
    return $element;
  };
  Preloader.prototype.updateProgress = function(url, done) {
    var $progress = this.progresses[url];
    if ($progress && $progress.length) {
      $progress.html('<div class="progress-bar">' +
        '<div style="width: ' + (done * 100).toFixed(0) + '%;">&nbsp;</div></div>');
    }
  };
  Preloader.prototype.getMedia = function(options, callback) {
    // async, callback signature: function(err, element)
    // options = { url: 'whatever', rush: undefined or true }
    var url = options.url, media, preloader = this;

    if (this.cache[url] !== undefined) {
      if (this.cache[url] !== null) {
        return callback(undefined, this.cache[url]);
      }
      else {
        return this.onLoaded(url, callback);
      }
    }
    this.cache[url] = null; // from undefined -> null
    this.currently_loading_url = url;

    media = this.$fromUrl(url, true)[0];

    if (preloader.debug) console.log("Preloader.getMedia id =", media.id);
    
    var $progress, last_buffer_length = 0, buffer_diffs = [];
    (function bufferWatcher() {
      if (!media) {
        return callback({type: 'UrlError',
          message: 'Media cannot be inserted with default html for that url: ' + url});
      }

      var buffer_length = (media.buffered && media.buffered.length > 0) ? media.buffered.end(0) : 0,
          buffer_diff = buffer_length - last_buffer_length,
          done = buffer_length / media.duration;
      last_buffer_length = buffer_length;

      buffer_diffs.push(buffer_diff);
      var calls = buffer_diffs.length;
      var last_10_diff = 0;
      for (var j = calls - 1; j >= calls - 10 && j >= 0; j--) {
        last_10_diff += buffer_diffs[j];
      }
      
      preloader.updateProgress(url, isNaN(done) ? 0 : done);

      var finish = function() {
        if (preloader.debug) console.log("Preload.getMedia.finish:", url);
        preloader.cache[url] = media; // from null -> cached
        preloader.currently_loading_url = '';
        if (preloader.callbacks[url] !== undefined) {
          $.each(preloader.callbacks[url], function(i, loaded_callback) {
            loaded_callback(undefined, media);
          });
        }
        callback(undefined, media);
      };

      if (done > 0.99) {
        finish(); // normal completion
      }
      // test if anything crazy has happened
      else if (preloader.cache[url] === undefined) {
        callback("That media was deleted from the DOM. Exiting the buffer process.");
      }
      else if (options.rush === true) {
        if (calls > 10 && last_10_diff < 0.01 && done > 0.5) {
          finish(); // sometimes Chrome doesn't feel like loading the whole movie. Okay, fine.
        }
        else {
          setTimeout(bufferWatcher, preloader.timeouts.loop);
        }
      }
      else {
        if (calls > preloader.timeouts.zero && last_10_diff < 0.01 && done > 0.5) {
          finish(); // it seems that Chrome isn't ever going to preload the whole media
        }
        else if (calls > preloader.timeouts.slow && buffer_length === 0) {
          console.log("The media cannot be found or loaded.");
          callback(undefined, '<p>This media is missing.</p>');
        }
        else if (calls > preloader.timeouts.slow && last_10_diff < 0.01) {
          finish();
        }
        else if (calls > preloader.timeouts.hard) {
          finish();
        }
        else if (calls > preloader.timeouts.wait) {
          console.log("The media is taking longer than " +
            preloader.timeouts.wait * (preloader.timeouts.loop / 1000) +
            " seconds to load. It'll just have to play, nonetheless.");
          finish();
        }
        else {
          setTimeout(bufferWatcher, preloader.timeouts.loop);
        }
      }
    })();
  };

  // usage: $('#prebuffer').preloader(['list', 'of', 'media', 'files']);
  $.fn.preloader = function(urls, debug) {
    return this.each(function() {
      $(this).data('preloader', new Preloader(urls, $(this), debug));
    });
  };
})(jQuery);

(function($) {
  $.fn.measureBox = function() {
    return {
      width: this.width() +
        parseInt(this.css('border-left-width'), 10) +
        parseInt(this.css('border-right-width'), 10) +
        parseInt(this.css('padding-left'), 10) +
        parseInt(this.css('padding-right'), 10),
      height: this.height() +
        parseInt(this.css('border-top-width'), 10) +
        parseInt(this.css('border-bottom-width'), 10) +
        parseInt(this.css('padding-top'), 10) +
        parseInt(this.css('padding-bottom'), 10)
    };
  };
})(jQuery);

(function($) {
  $.fn.objectifyForm = function() {
    var store = {};
    this.children('div[id]').each(function() {
      var $field = $(this),
          value = [],
          force_list = false;
      
      $field.find("input[type='text']").each(function(i, el) {
        value.push(el.value);
      });
      $field.find("input[type='password']").each(function(i, el) {
        value.push(el.value);
      });
      if ($field.find("input[type='checkbox']").length > 1) {
        force_list = true;
      }

      // for each checkbox/radiobutton get the id, find the label[for=<that-id>].innerText, use that as value
      $field.find("input[type='checkbox']:checked").each(function(i, el) {
        value.push($field.find("label[for='" + el.id + "']").text());
      });
      $field.find("input[type='radio']:checked").each(function(i, el) {
        value.push($field.find("label[for='" + el.id + "']").text());
      });

      if (value.length === 0) {
        value = null;
      }
      else if (value.length === 1 && !force_list) {
        value = value[0];
      }

      store[this.id] = value;
    });
    return store;
  };
})(jQuery);

(function($) {
  // requires $.fn.measureBox
  function drawBubble($target, text, options) {
    if (options === undefined) options = {};
    if (options.anchor === undefined) options.anchor = 'r';
    if (options.attach === undefined) options.attach = $(document.body);
    if (text === undefined) text = '!!!';
    var target_offset = $target.offset(), // { left: 999, top: 999 }
        target_size = $target.measureBox(), // { width: 999, height: 999 }
        id = "bubble_" + ((Math.random() * 999999) | 0);
    var $bubble = $('<div id="' + id + '" class="bubble">' + text + '</div>').appendTo(options.attach);
    var $triangle = $('<div class="triangle"></div>').appendTo($bubble);
    
    var bubble_size = $bubble.measureBox(); // { width: 999, height: 999 }
    var triangle_radius = parseInt($triangle.css('border-top-width'), 10);

    // console.log('bubble_id', id, 'triangle_radius', triangle_radius, 'bubble_size', bubble_size);
    // return;
    
    if (options.anchor === 'r') {
      $triangle.css({
        'border-left-width': 0,
        'border-right-color': $bubble.css('background-color'),
        'top': (bubble_size.height - (triangle_radius * 2)) / 2,
        'left': -triangle_radius
      });

      $bubble.css({
        'left': target_offset.left + target_size.width,
        'top': (target_offset.top + (target_size.height / 2)) - (bubble_size.height / 2),
        'margin-left': triangle_radius
      });
    }
    else if (options.anchor === 'l') {
      $triangle.css({
        'border-right-width': 0,
        'border-left-color': $bubble.css('background-color'),
        'top': (bubble_size.height - (triangle_radius * 2)) / 2,
        'left': "auto",
        'right': -triangle_radius
      });

      $bubble.css({
        left: (target_offset.left - bubble_size.width) - triangle_radius,
        top: (target_offset.top + (target_size.height / 2)) - (bubble_size.height / 2),
        "margin-right": triangle_radius
      });
    }

    $bubble.one('click', function() {
      $bubble.fadeOut(50).remove();
    });
  }

  // @options: { anchor: 't' | 'r' | 'l' | 'b', attach: $(document.body) }
  $.fn.bubble = function(text, options) {
    return this.each(function() {
      drawBubble($(this), text, options);
    });
  };
})(jQuery);
