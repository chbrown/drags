function Logger() {
  this.console_available = !(typeof console === "undefined" || typeof console.log === "undefined");
}
Logger.prototype._log = function(level, args) {
  if (this.console_available) {
    if (level === 'error') {
      console.error.apply(console, args);
    }
    else if (level === 'info') {
      console.info.apply(console, args);
    }
    else if (level === 'debug') {
      console.debug.apply(console, args);
    }
    else {
      console.log.apply(console, args);
    }
  }
};
function _levelClosure(level) {
  return function() { this._log(level, arguments); };
}
var levels = ['error', 'warn', 'info', 'debug'];
for (var i = 0, level; (level = levels[i]); i++) {
  Logger.prototype[level] = _levelClosure(level);
}

// local setup
function timestamp() { return (new Date()).getTime(); }
$.defaultCookie = {expires: new Date(timestamp() + 31*86400*1000), path: '/'};
$.ajaxSetup({
  type: 'POST',
  dataType: 'json',
  contentType: 'application/json',
  accepts: 'application/json',
  processData: false
});


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
