/*jslint browser: true */ /*globals $, EventEmitter */
var Preloader = (function() {
  var E = function(tagName, attributes, children) {
    /** E: helper function to create a new DOM element,
        using given tag and attributes.

    Example usage:

        var video = E('video', {id: 'video_01', style: 'display: none;'})

    1. Appends each of `opts.children` [Node] as child nodes.
    2. Next, append `opts.text` String as a text node.
    3. Finally, appending it to `opts.parent` Node if provided.
    */
    var element = document.createElement(tagName);
    // attributes is an object
    if (attributes) {
      for (var name in attributes) {
        element.setAttribute(name, attributes[name]);
      }
    }
    // children is a list of nodes
    if (children) {
      for (var i = 0, l = children.length; i < l; i++) {
        element.appendChild(children[i]);
      }
    }
    return element;
  };

  function extend(target, source) {
    if (target === undefined) target = {};
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
  }

  function range(max) {
    var xs = [];
    for (var i = 0; i < max; i++) xs.push(i);
    return xs;
  }

  function zip(xss) {
    // e.g., xss = [
    //   [1, 2, 3],
    //   [2, 4, 6],
    //   [1, 4, 8],
    //   [10, 100, 1000],
    // ]
    // -> [1, 2, 1, 10], etc.
    var lengths = xss.map(function(xs) { return xs.length; });
    var maxlen = Math.min.apply(null, lengths);
    return range(maxlen).map(function(i) {
      return xss.map(function(xs) { return xs[i]; });
    });
  }

  function eq(xs) {
    // xs should be an Array
    if (xs.every(Array.isArray)) {
      // (a) && Array.isArray(b)
      var lengths = xs.map(function(x) { return x.length; });
      if (eq(lengths)) {
        return zip(xs).every(eq);
      }
      else {
        return false;
      }
    }
    else {
      var y = xs[0];
      return xs.slice(1).every(function(x) { return x == y; });
    }
  }


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

  var Resource = function(type, urls) {
    /** Resource: responsible for preloading a single resource.

    `type` should be one of 'video', 'audio', or 'image'
    `urls` should be an array of urls (strings)

    Resources do not know about other resources -- they aren't chained.

    emits 'error' if the resource 404s or times out.
    emits 'progress' periodically while the resource is loading with the current
        ratio of progress (between 0 and 1). It may emit multiple 'progress' events
        with the same value.
    emits 'finish' when the resource has completed preloading and is ready to display.
        when this is emitted, resource.complete will be true.
    */
    EventEmitter.call(this);
    this.type = type;
    if (!Array.isArray(urls)) {
      this.urls = [urls];
    }
    this.urls = urls;
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
  Resource.prototype.createElement = function() {
    if (this.type == 'video' || this.type == 'audio') {
      var sources = this.urls.map(function(url) {
        return E('source', {src: url});
      });
      return E(this.type, {style: 'display: none', autobuffer: '', preload: 'auto'}, sources);
    }
    else if (this.type == 'image') {
      var imgs = this.urls.map(function(url) {
        return E('img', {src: url});
      });
      return E('div', {style: 'display: none'}, imgs);
    }
    else {
      var type_node = document.createTextNode(this.type);
      return E('span', {style: 'display: none'}, type_node);
    }
  };
  Resource.prototype.insert = function(container, rush) {
    /**
    container: DOM Element
    rush: play as soon as we think we can manage it
    */
    var self = this;
    var element = this.createElement();
    // this.type = guessType(url); // one of 'video', 'audio', or 'image'

    // keep track of the element in the resource so we can detach it later in abort if needed
    this.$element = $(element).appendTo(container);
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
      if (!element) {
        // type: 'MediaError'
        return done(new Error('Media cannot be found for the url.'));
      }

      var buffered_length = 0;
      var completed = 0;

      if (self.type == 'image') {
        if (element.complete) {
          completed = 1.0;
        }
      }
      else {
        if (element.buffered && element.buffered.length > 0) {
          buffered_length = element.buffered.end(0);
        }
        buffered_record.push(buffered_length);

        // element.duration might be NaN, probably when it hasn't loaded yet
        if (!isNaN(element.duration)) {
          completed = buffered_length / element.duration;
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
    var opts = extend(extend({}, Preloader.defaults), options);
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
      this.container = E('div', {style: "display: none"});
      document.body.appendChild(this.container);
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
  Preloader.prototype.addResource = function(type, urls) {
    // each url, on loading, will be stuck in the dom, in a hidden div.
    // keyed by their santized urls as element ids, i.e. url.replace(/\W/g, '')
    // var urls = Array.prototype.slice.call(arguments, 0);
    this.logger.debug('Preloader.createResource: adding', type, 'urls:', urls);
    if (!this.findResource(type, urls)) {
      this.resources.push(new Resource(type, urls));
    }
    this.loop();
  };
  Preloader.prototype.findResource = function(type, urls) {
    for (var i = 0, l = this.resources.length; i < l; i++) {
      var resource = this.resources[i];
      if (resource.type == type && eq([resource.urls, urls])) {
        return resource;
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
      this.logger.debug('Preloader.loop (in-progress: ' + current_resource.urls + ')');
    }
    else {
      var self = this;
      current_resource.insert(this.getContainer(), false);
      this.logger.debug('Preloader.loop (inserted: ' + current_resource.urls + ')');
      current_resource.ready(function(err) {
        if (err) self.logger.error('Resource error: ' + err.toString());
        self.loop();
      });
    }
  };
  Preloader.prototype.load = function(type, urls, opts, callback) {
    /** preloader.load(): look for the resource with the given url in the
    existing resources, or add it if it does not already exist.

    `type`: String
    `urls`: [String]
    `opts`: Object
        `rush`: Boolean
            If `rush` is true, abort the current loading resource if it isn't the one we want

    `callback`: function(Error | null, jQuery element | null)
    */
    if (callback === undefined && typeof(opts) === 'function') {
      callback = opts;
      opts = undefined;
    }

    if (opts === undefined) opts = {};
    if (opts.rush === undefined) opts.rush = false;

    this.logger.debug('Preloader.load: type=' + type + ' urls=[' + urls.join(',') + ']');
    var resource = this.findResource(type, urls);

    if (opts.rush) {
      var current_resource = this.currentResource();
      this.pause();
      // only abort it current one if it's the one we want
      if (current_resource && current_resource != resource) {
        current_resource.abort();
      }
    }

    if (!resource) {
      // add it if it wasn't found
      resource = new Resource(type, urls);
      this.resources.push(resource);
    }

    if (!resource.$element) {
      // rush: true
      resource.insert(this.getContainer(), true);
    }

    var self = this;
    resource.ready(function(err) {
      if (err) self.logger.error('Resource error: ' + err);

      callback(err, resource.$element);
    });
    return resource;
  };

  return Preloader;
})();
