if (typeof console === "undefined" || typeof console.log === "undefined") {
  // just swallow any logs, if there aren't any dev tools available.
  console = {log: function() {}};
}

// local setup
function timestamp() { return (new Date()).getTime(); }
$.defaultCookie = {expires: new Date(timestamp() + 31*86400000), path: '/'};
$.ajaxSetup({
  type: 'POST',
  dataType: 'json',
  contentType: 'application/json',
  accepts: 'application/json',
  processData: false
});



function Preloader(urls, $buffer, debug) {
  // urls will be a list of strings
  // each url, on loading, will be stuck in the dom, in a hidden div.
  // keyed by their santized urls as element ids, i.e. url.replace(/\W/g, '')
  this.urls = urls;
  this.$buffer = $buffer;
  this.debug = false;
  if (debug !== undefined)
    this.debug = debug;
  else if (typeof Cookie !== 'undefined' && Cookie.get('debug') === 'true')
    this.debug = true;

  //this.cache = {}; // keyed by url. The value is null while being loaded, and the element when completed.
  // this.callbacks = {}; // keyed by url, lists of callbacks for when a particular movie is done.
  this.progresses = {}; // keyed by url, jQuery elements | undefined

  this.queue = urls.slice(0);
  this.currently_loading_url = undefined;
  this.paused = true;
  // this.processing_queue = false;
  this.timeouts = {zero: 20, slow: 80, hard: 200, wait: 200, loop: 250};
}
Preloader.prototype.pauseQueue = function(abort) {
  this.paused = true;
  var url = this.currently_loading_url;
  if (this.debug) console.log('Preloader.pauseQueue. abort:', abort, ' url:', url);
  if (url !== undefined && abort) {
    var $element = this.$fromUrl(url);
    $element.children('source').attr('src', '');
    var media = $element[0];
    if (media && media.load) media.load();
    $element.remove();
    this.queue.unshift(url);
    this.currently_loading_url = undefined;
  }
};
Preloader.prototype.resumeQueue = function() {
  if (this.debug) console.log('Preloader.resumeQueue: pause was:', this.paused);
  this.paused = false;
  this.queueLoop();
};
Preloader.prototype.queueLoop = function() {
  var preloader = this;
  var url = this.currently_loading_url;
  // if (this.debug) console.log('Preloader.queueLoop. url:', url);
  if (url === undefined) {
    url = this.queue.shift(); // get the next in the queue
    if (url !== undefined) {
      if (this.debug) console.log('  ', this.queue.length, ' left. queueLoop -> getMedia:', url);
      this.getMedia(url, false, function(err, media) {
        // just ignore the media for now, since it's in the cache
        if (err) { console.log(err); }
        if (!preloader.paused)
          preloader.queueLoop();
      });
    }
    else {
      if (this.debug) console.log('  queueLoop: all done');
    }
  }
  else {
    if (this.debug) console.log('  queueLoop: already loading ', url);
  }
};
Preloader.prototype.$fromUrl = function(url, make_if_missing) {
  var $element = $('#' + url.replace(/\W/g, ''));
  if (this.debug) {
    console.log('Preloader.$fromUrl', url,
      'existing:', $element.length,
      'make_if_missing:',make_if_missing);
  }
  if (!$element.length && make_if_missing === true) {
    var id = url.replace(/\W/g, '');
    if (url.match(/\.(mp4|m4v)$/)) {
      $element = $('<video width="640" height="360" ' +
        'id="' + id + '" ' +
        'style="display: none" autobuffer preload="auto">' +
        '<source src="' + url + '" type="video/mp4"></video>').appendTo(this.$buffer);
    }
    else if (url.match(/\.(mp3|wav)$/)) {
      $element = $('<audio id="' + id + '" ' +
        'style="display: none" autobuffer preload="auto">' +
        '<source src="' + url + '"></audio>').appendTo(this.$buffer);
    }
    else {
      $element = $('<img id="' + id + '" style="display: none" ' +
        'src="' + url + '" />').appendTo(this.$buffer);
    }
  }
  return $element;
};
Preloader.prototype._gotMedia = function(media, callback) {
  if (this.debug) console.log('  _gotMedia');
  preloader.currently_loading_url = undefined;
  callback(undefined, media);
};
Preloader.prototype.getMedia = function(url, rush, callback) {
  // async, callback signature: function(err, element)
  if (this.debug) console.log("Preloader.getMedia. url:", url, 'rush:', rush);
  var preloader = this, media = this.$fromUrl(url, true)[0];
  this.currently_loading_url = url;

  // quick exit for the simple image case
  if (url.match(/\.jpg/)) {
    setTimeout(function() {
      preloader._gotMedia(media, callback);
    }, 0);
    return;
  }

  var $progress, last_buffer_length = 0, buffer_diffs = [];
  (function bufferWatcher() {
    if (!rush && preloader.queue.indexOf(url) > -1) {
      if (preloader.debug) console.log("  bufferWatcher: media aborted:", media);
      return callback({type: 'MediaError',
        message: 'Media aborted, will resume at beginning of queue.'});
    }
    if (!media) {
      if (preloader.debug) console.log("  bufferWatcher: missing media:", media);
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

    var $progress = preloader.progresses[url];
    if ($progress && $progress.length) {
      $progress.html('<div class="progress-bar">' +
        '<div style="width: ' + ((isNaN(done) ? 0 : done) * 100).toFixed(0) + '%;">&nbsp;</div></div>');
    }

    if (done > 0.99) {
      return preloader._gotMedia(media, callback); // normal completion
    }
    // test if anything crazy has happened
    // else if (preloader.cache[url] === undefined) {
      // callback("That media was deleted from the DOM. Exiting the buffer process.");
    // }
    else if (rush === true) {
      if (calls > 10 && last_10_diff < 0.01 && done > 0.5) {
        // sometimes Chrome doesn't feel like loading the whole movie. Okay, fine.
        return preloader._gotMedia(media, callback);
      }
      else {
        setTimeout(bufferWatcher, preloader.timeouts.loop);
      }
    }
    else {
      if (calls > preloader.timeouts.zero && last_10_diff < 0.01 && done > 0.5) {
        // it seems that Chrome isn't ever going to preload the whole media
        return preloader._gotMedia(media, callback);
      }
      else if (calls > preloader.timeouts.slow && buffer_length === 0) {
        console.log("The media cannot be found or loaded.", url, media);
        callback(undefined, '<p>This media is missing.</p>');
      }
      else if (calls > preloader.timeouts.slow && last_10_diff < 0.01) {
        return preloader._gotMedia(media, callback);
      }
      else if (calls > preloader.timeouts.hard) {
        return preloader._gotMedia(media, callback);
      }
      else if (calls > preloader.timeouts.wait) {
        console.log("The media is taking longer than " +
          preloader.timeouts.wait * (preloader.timeouts.loop / 1000) +
          " seconds to load. It'll just have to play, nonetheless.");
        return preloader._gotMedia(media, callback);
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
