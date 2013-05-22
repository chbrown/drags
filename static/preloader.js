var deapply = function(func) {
  return function(args) {
    return func.apply(null, args);
  };
};
function timestamp() { return (new Date()).getTime(); }
function add(a, b) { return a + b; }
var applyAdd = deapply(add);
function subtract(a, b) { return a - b; }
var applySubtract = deapply(subtract);
var diffs = function(xs) {
  // returns a list 1-shorter than xs
  var comparisons = _.zip(xs.slice(1), xs.slice(0, -1));
  return comparisons.map(applySubtract);
};
_.mixin({diffs: diffs});

var Resource = Backbone.Model.extend({
  initialize: function(url) {
    // logger.debug('Resource.initialize url=', url);
    this.url = url;
    this.id = url.replace(/\W/g, '');
    this.type = Resource.inferType(url);
    this.$element = null;
    self.complete = false;
  },
  abort: function() {
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
  },
  insert: function($container, rush) {
    // triggers events: ('progress', 0 <= ratio <= 1)
    //                  ('done')
    var self = this;
    var html = Handlebars.templates[this.type + '.mu']({url: this.url, id: this.id});

    // attach the element so we can detach it later in abort if needed
    this.$element = $(html).appendTo($container);
    var media = this.$element[0];
    var started = timestamp();

    var done = function(err) {
      if (!err) {
        self.complete = true;
        self.trigger('done');
      }
      // callback signature: function(err, element)
      // if (callback) {
      //   callback(err, self.$element);
      // }
    };

    // begin monitoring process, setting up a loop with varying timeouts
    var buffered_record = [];
    (function watch() {
      if (!self.$element) {
        return done({type: 'ElementError', message: 'Resource aborted, element removed.'});
      }
      if (!media) {
        return done({type: 'MediaError', message: 'Media cannot be found for the url: ' + self.url});
      }

      var buffered_length = (media.buffered && media.buffered.length > 0) ? media.buffered.end(0) : 0;
      buffered_record.push(buffered_length);

      var completed = buffered_length / media.duration;
      var elapsed = timestamp() - started;
      self.trigger('progress', completed);

      var last_10_diff = _.chain(buffered_record).last(10).diffs().reduce(add, 0).value();

      if (completed > 0.99) {
        // close enough, normal completion
        done();
      }
      else if (rush) {
        if (elapsed > Preloader.timeouts.rush && last_10_diff < 1 && completed > 0.5) {
          // sometimes Chrome doesn't feel like loading the whole movie. Okay, fine.
          done();
        }
        else {
          setTimeout(watch, 250);
        }
      }
      else if (elapsed > Preloader.timeouts.zero && last_10_diff < 1 && completed > 0.5) {
        // it seems that Chrome isn't ever going to preload the whole media
        done();
      }
      else if (elapsed > Preloader.timeouts.slow && buffered_length === 0) {
        // logger.info('The media cannot be found or loaded.', url, media);
        done({message: 'Unloadable media'}, '<p>This media is missing.</p>');
      }
      else if (elapsed > Preloader.timeouts.slow && last_10_diff < 0.01) {
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
  },
  wait: function(callback) {
    // callback signature: function(err)
    if (this.complete) {
      callback();
    }
    else {
      this.on('done', callback);
    }
  }
}, {
  inferType: function(url) {
    if (url.match(/\.(mp4|m4v)$/)) {
      return 'video';
    }
    else if (url.match(/\.(mp3|wav)$/)) {
      return 'audio';
    }
    else {
      return 'image';
    }
  }
});


var Preloader = Backbone.Model.extend({
  initialize: function(urls, $container) {
    logger.debug('Preloader.initialize: urls=', urls);
    // urls will be a list of strings
    // each url, on loading, will be stuck in the dom, in a hidden div.
    // keyed by their santized urls as element ids, i.e. url.replace(/\W/g, '')
    this.resources = urls.map(function(url) { return new Resource(url); });
    this.index = 0;

    // create new container at the end of the document to hold the elements.
    this.$container = $container || $('<div style="display: none"></div>').appendTo(document.body);

    //this.cache = {}; // keyed by url. The value is null while being loaded, and the element when completed.
    //this.callbacks = {}; // keyed by url, lists of callbacks for when a particular movie is done.
    //this.progresses = {}; // keyed by url, jQuery elements | undefined

    // we can pause
    this.paused = true;
  },
  setContainer: function($container) {
    $container.append(this.$container.children());
    this.$container = $container;
  },
  pause: function(abort) {
    logger.debug('Preloader.pause: abort=', abort);
    // call with (true) to stop the current loader ASAP
    this.paused = true;

    // if 1) we asked for abort and 2) we haven't loaded everything yet, and
    //    3) the current resource is currently loading, kill it.
    var resource = this.resources[this.index];
    if (abort && resource) {
      resource.abort();
    }
    return this;
  },
  resume: function() {
    logger.debug('Preloader.resume: pause was', this.paused);
    this.paused = false;
    this.run();
    return this;
  },
  run: function() {
    // this can be called multiple times without ill effect
    var self = this;
    var resource = this.resources[this.index];
    logger.debug('Preloader.run: index=', this.index);
    if (this.paused) {
      logger.debug('Preloader.run: paused');
    }
    else if (resource) {
      if (resource.$element) {
        logger.debug('Preloader.run: url=', resource.url, 'in-progress', resource);
      }
      else {
        resource.insert(this.$container);
        resource.wait(function(err) {
          self.index++;
          self.run();
        });
        logger.debug('Preloader.run: url=', resource.url, 'inserted', resource);
      }
    }
    else {
      logger.debug('Preloader.run: no more resources');
    }
    return this;
  },
  load: function(url, callback) {
    // callback signature: function(err, $element)
    logger.debug('Preloader.load: url=', url);
    var resource = _.find(this.resources, function(resource) {
      return resource.url == url;
    }) || new Resource(url);

    if (!resource.$element) {
      resource.insert(this.$container, true);
    }

    resource.wait(function(err) {
      callback(err, resource.$element);
    });
    return resource;
  }
}, {
  timeouts: {
    // in seconds
    rush: 2000,
    zero: 5000,
    slow: 20000,
    hard: 50000
  }
});

// usage: $('#prebuffer').preloader(['list', 'of', 'media', 'files']);
// $.fn.preloader = function(urls) {
//   return this.each(function() {
//     $(this).data('preloader', new Preloader(urls, $(this)));
//   });
// };
