/*jslint browser: true */ /*globals $ */
function EventEmitter() {
  this.events = {};
}
EventEmitter.prototype.on = function(name, callback, context) {
  if (this.events[name] === undefined) this.events[name] = [];
  this.events[name].push({fn: callback, thisArg: context});
  return this;
};
EventEmitter.prototype.off = function(name, callback) {
  for (var i = (this.events[name] ? this.events[name].length : 0) - 1; i >= 0; i--) {
    if (this.events[name][i].callback === callback) {
      this.events[name].splice(i, 1);
    }
  }
};
EventEmitter.prototype.emit = function(name /*, args*/) {
  var length = this.events[name] ? this.events[name].length : 0;
  var args = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < length; i++) {
    var handler = this.events[name][i];
    handler.fn.apply(handler.thisArg, args);
  }
};

function Logger(opts) {
  /** `new Logger`: create new logger for glossing over a missing console
  `level`: the minimum level of logs to keep
  */
  if (opts === undefined) opts = {};
  if (opts.level === undefined) opts.level = 'info';

  this.console_available = !(typeof console === "undefined" || typeof console.log === "undefined");
  // this.levels comes mostly from python
  this.levels = {
    fatal: 60,
    critical: 50,
    error: 40,
    warn: 30,
    info: 20,
    debug: 10,
    notset: 0
  };
  this.setLevel(opts.level);
}
Logger.prototype.setLevel = function(level) {
  this.minimum = this.levels[level];
};
Logger.prototype._log = function(level, args) {
  if (this.console_available && this.levels[level] >= this.minimum) {
    if (level == 'error') {
      console.error.apply(console, args);
    }
    else if (level == 'info') {
      console.info.apply(console, args);
    }
    else if (level == 'debug') {
      console.debug.apply(console, args);
    }
    else {
      console.log.apply(console, args);
    }
  }
};
['error', 'warn', 'info', 'debug'].forEach(function(level) {
  Logger.prototype[level] = function(/* args */) {
    this._log(level, arguments);
  };
});

function time() {
  return (new Date()).getTime();
}

$.fn.objectifyForm = function() {
  var form = {};
  this.children('div[id]').each(function() {
    var $field = $(this);
    var value = [];
    var force_list = false;

    $field.find('input[type="text"]').each(function(i, el) {
      value.push(el.value);
    });
    $field.find('input[type="password"]').each(function(i, el) {
      value.push(el.value);
    });
    if ($field.find('input[type="checkbox"]').length > 1) {
      force_list = true;
    }

    // for each checkbox/radiobutton get the id, find the label[for=<that-id>].innerText, use that as value
    $field.find('input[type="checkbox"]:checked').each(function(i, el) {
      value.push($(el).parent('label').text().trim());
    });
    $field.find('input[type="radio"]:checked').each(function(i, el) {
      value.push($(el).parent('label').text().trim());
    });

    if (value.length === 0) {
      value = null;
    }
    else if (value.length === 1 && !force_list) {
      value = value[0];
    }

    form[this.id] = value;
  });
  return form;
};

// $(function() {
//   $('time').each(function(i, el) {
//     var original = el.innerText;
//     if (original) {
//       var display = moment(original).format('YYYY-MM-DD h:mm a');
//       el.setAttribute('datetime', original);
//       el.innerText = display;
//     }
//   });
// });
