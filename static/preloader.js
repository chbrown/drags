"use strict"; /*jslint indent: 2 */ /*globals $, _, EventEmitter */
// prereqs: underscore.js, jquery.js, EventEmitter
var Preloader = (function() {
  var el = function(tagName, attributes, opts) {
    /** el: create a new DOM element, using given tag and attributes.
    1. Appending each of `opts.children` [Node] as child nodes.
    2. Next, appending `opts.text` String as a text node.
    3. Finally, appending it to `opts.parent` Node if provided.
    */
    var element = document.createElement(tagName);
    // attributes is an object
    if (attributes) {
      for (var name in attributes) {
        element.setAttribute(name, attributes[name]);
      }
    }
    // text is a string
    if (opts) {
      if (opts.children) {
        for (var i = 0, l = opts.children.length; i < l; i++) {
          element.appendChild(opts.children[i]);
        }
      }
      if (opts.text) {
        var text_node = document.createTextNode(opts.text);
        element.appendChild(text_node);
      }
      if (opts.parent) {
        parent.appendChild(element);
      }
    }
    return element;
  };

  var templates = {
    video: function(c) {
      return '<video id="' + c.id + '" style="display: none" autobuffer preload="auto">' +
        '<source src="' + c.url + '">' +
      '</video>';
    },
    audio: function(c) {
      return '<audio id="' + c.id + '" style="display: none" autobuffer preload="auto">' +
        '<source src="' + c.url + '">' +
      '</audio>';
    },
    image: function(c) {
      return '<img id="' + c.id + '" style="display: none" src="' + c.url + '" />';
    }
  };

  function diffs(xs) {
    /** returns a list of length (xs.length - 1), of the deltas between each pair of xs, e.g.:
    diffs([25, 10, 5, 2, 1]) = [15, 5, 3, 1]
    diffs([1, 2, 4, 8, 16, 32, 64]) = [-1, -2, -4, -8, -16, -32]
    Returns [] if xs is empty or has only one element.
    */
    var ys = [];
    for (var i = 0; i < xs.length - 1; i++) {
      ys.push(xs[i] - xs[i + 1]);
    }
    return ys;
  }

  function sum(xs) {
    var y = 0;
    for (var i = 0; i < xs.length; i++) y += xs[i];
    return y;
  }

  function time() {
    return (new Date()).getTime();
  }

  function guessType(url) {
    if (url.match(/\.(mp4|m4v|mpg|webm)$/)) {
      return 'video';
    }
    else if (url.match(/\.(mp3|wav)$/)) {
      return 'audio';
    }
    else {
      return 'image';
    }
  }

  var Resource = function(url) {
    /** new Resource: preloads a url, guessing the type from the url.

    Resources do not know about other resources -- they aren't chained.

    emits 'error' if the resource 404s or times out.
    emits 'progress' periodically while the resource is loading with the current
        ratio of progress (between 0 and 1). It may emit multiple 'progress' events
        with the same value.
    emits 'finish' when the resource has completed preloading and is ready to display.
        when this is emitted, resource.complete will be true.
    */
    EventEmitter.call(this);
    this.url = url;
    this.id = url.replace(/\W/g, '');
    this.type = guessType(url); // one of 'video', 'audio', or 'image'
    this.$element = null;
    this.complete = false;
  };
  Resource.prototype = Object.create(EventEmitter.prototype);
  Resource.prototype.constructor = Resource;
  Resource.prototype.abort = function() {
    if (this.$element) {
      // only do the weird media cancellation hack for videos
      if (this.type == 'video') {
        this.$element.children('source').attr('src', '');
        var media = this.$element[0];
        if (media && media.load) media.load();
      }
      // abruptly and rudely remove the whole element from the dom.
      this.$element.remove();
      this.$element = null;
    }
  };
  Resource.prototype.insert = function(container, rush) {
    var self = this;
    var ctx = {url: this.url, id: this.id};
    var html = templates[this.type](ctx);

    // attach the element so we can detach it later in abort if needed
    this.$element = $(html).appendTo(container);
    var media = this.$element[0];
    var started = time();

    var done = function(err) {
      // like an internal callback
      if (err) {
        self.emit('error', err);
      }
      else {
        self.complete = true;
        self.emit('finish');
      }
    };

    // begin monitoring process, setting up a loop with varying timeouts
    var buffered_record = [];
    (function watch() {
      if (!self.$element) {
        // type: 'ElementError'
        return done(new Error('Resource aborted, element removed.'));
      }
      if (!media) {
        // type: 'MediaError'
        return done(new Error('Media cannot be found for the url.'));
      }

      var buffered_length = 0;
      var completed = 0;

      if (self.type == 'image') {
        if (media.complete) {
          completed = 1.0;
        }
      }
      else {
        if (media.buffered && media.buffered.length > 0) {
          buffered_length = media.buffered.end(0);
        }
        buffered_record.push(buffered_length);

        // media.duration might be NaN, probably when it hasn't loaded yet
        if (!isNaN(media.duration)) {
          completed = buffered_length / media.duration;
        }
      }

      var elapsed = time() - started;
      var last_10_diff_sum = sum(diffs(buffered_record.slice(-10)));
      self.emit('progress', completed);

      if (completed > 0.99) {
        // close enough, normal completion
        done();
      }
      else if (rush) {
        if (elapsed > Preloader.timeouts.rush && last_10_diff_sum < 1 && completed > 0.5) {
          // sometimes Chrome doesn't feel like loading the whole movie. Okay, fine.
          done();
        }
        else {
          setTimeout(watch, 250);
        }
      }
      else if (elapsed > Preloader.timeouts.zero && last_10_diff_sum < 1 && completed > 0.5) {
        // it seems that Chrome isn't ever going to preload the whole media
        done();
      }
      else if (elapsed > Preloader.timeouts.slow && buffered_length === 0) {
        // simply can't find it all, probably a 404
        done(new Error('Cannot find or load media.'));
      }
      else if (elapsed > Preloader.timeouts.slow && last_10_diff_sum < 0.01) {
        // give up
        done();
      }
      else if (elapsed > Preloader.timeouts.hard) {
        done();
      }
      else {
        setTimeout(watch, 250);
      }
    })();
  };
  Resource.prototype.ready = function(callback) {
    /** ready: call this when the resource finishes loading, or immediately,
    if it is already completely loaded.

    `callback`: function(Error | null)
    */
    if (this.complete) return callback();

    this.on('finish', callback);
  };

  var NullLogger = function() {};
  NullLogger.prototype.error = NullLogger.prototype.warn = NullLogger.prototype.info = NullLogger.prototype.debug = function() {};

  var Preloader = function(options) {
    /** new Preloader: create a new preloader helper, specifying where in the
    DOM it should put loading elements.

    Emits 'finish' events

    `options`: Object
        `container`: DOM Element Node (optional)
        `logger`: logging object (optional)
        `urls`: List of urls to preload (optional)
        `paused`: initial state (defaults to true)
    */
    EventEmitter.call(this);

    // this.resources is a list of Resource objects
    this.resources = [];

    // set option defaults
    var opts = _.extend({}, Preloader.defaults, options);
    // container may be null, but the default won't be created until one is needed
    this.container = opts.container;
    this.logger = opts.logger;
    this.paused = opts.paused;

    if (opts.urls) {
      this.add.apply(this, opts.urls);
    }
  };
  Preloader.defaults = {
    logger: new NullLogger(),
    paused: true
  };
  Preloader.timeouts = {
    // in seconds
    rush: 2000,
    zero: 5000,
    slow: 20000,
    hard: 50000
  };
  Preloader.prototype = Object.create(EventEmitter.prototype);
  Preloader.prototype.constructor = Preloader;
  Preloader.prototype.getContainer = function() {
    if (this.container === undefined) {
      // if no container is provided, create new node at the end of the document to hold the elements.
      this.container = el('div', {style: "display: none"}, {parent: document.body});
    }
    return this.container;
  };
  Preloader.prototype.setContainer = function(container) {
    if (this.container) {
      // first move over children from the current container
      while (this.container.firstChild) {
        container.appendChild(this.container.firstChild);
      }
    }
    this.container = container;
  };
  Preloader.prototype.add = function(url1 /*, url2, ...*/) {
    // each url, on loading, will be stuck in the dom, in a hidden div.
    // keyed by their santized urls as element ids, i.e. url.replace(/\W/g, '')
    var urls = Array.prototype.slice.call(arguments, 0);
    this.logger.debug('Preloader.add: adding', urls.length, 'urls:', urls);
    for (var i = 0, l = urls.length; i < l; i++) {
      var url = urls[i];
      if (!this.findResource(url)) {
        this.resources.push(new Resource(url));
      }
    }
    this.loop();
  };
  Preloader.prototype.findResource = function(url) {
    for (var i = 0, l = this.resources.length; i < l; i++) {
      if (this.resources[i].url == url) {
        return this.resources[i];
      }
    }
  };
  Preloader.prototype.currentResource = function() {
    /** currentResource: iterate through resources and return the first one that is not complete.
    The returned resource may not have even started.
    Returns null when all resources have already been loaded.
    */
    for (var i = 0, l = this.resources.length; i < l; i++) {
      var resource = this.resources[i];
      if (!resource.complete) {
        return resource;
      }
    }
  };
  Preloader.prototype.pause = function() {
    /** pause: pause the preloader, but don't abort the current load */
    this.logger.debug('Preloader.pause');
    this.paused = true;
  };
  Preloader.prototype.abort = function() {
    /** abort: pause the preloader and abort the current load */
    this.logger.debug('Preloader.abort');
    // if we haven't loaded everything yet, find the current resource and abort it
    var current_resource = this.currentResource();
    if (current_resource) current_resource.abort();
  };
  Preloader.prototype.resume = function() {
    this.logger.debug('Preloader.resume (was previously ' + (this.paused ? '' : 'not ') + 'paused)');
    this.paused = false;
    this.loop();
  };
  Preloader.prototype.loop = function() {
    // this can be called multiple times without ill effect
    if (this.paused) {
      return this.logger.debug('Preloader.loop (paused)');
    }

    var current_resource = this.currentResource();
    if (!current_resource) {
      this.emit('finish');
      this.logger.debug('Preloader.loop (no more resources)');
      return;
    }

    if (current_resource.$element) {
      this.logger.debug('Preloader.loop (in-progress: ' + current_resource.url + ')');
    }
    else {
      var self = this;
      current_resource.insert(this.getContainer(), false);
      this.logger.debug('Preloader.loop (inserted: ' + current_resource.url + ')');
      current_resource.ready(function(err) {
        if (err) self.logger.error('Resource error: ' + err.toString());
        self.loop();
      });
    }
  };
  Preloader.prototype.load = function(url, callback) {
    /** preloader.load(): look for the resource with the given url in the
    existing resources, or add it if it does not already exist.

    Does not abort any other resource load that might be going on.

    `url`: String
    `callback`: function(Error | null, jQuery element | null)
    */
    this.logger.debug('Preloader.load: url=', url);
    var resource = this.findResource(url);
    var self = this;

    if (!resource) {
      resource = new Resource(url);
      this.resources.push(resource);
    }

    if (!resource.$element) {
      // rush: true
      resource.insert(this.getContainer(), true);
    }
    resource.ready(function(err) {
      if (err) self.logger.error('Resource error: ' + err);
      callback(err, resource.$element);
    });
    return resource;
  };

  return Preloader;
})();
