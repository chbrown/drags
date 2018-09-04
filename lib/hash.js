var crypto = require('crypto');

var SALT = 'UcdNrupTDShxEW0Lv9eg';

exports.sha256 = function(s) {
  var shasum = crypto.createHash('sha256');
  shasum.update(SALT, 'utf8');
  shasum.update(s, 'utf8');
  return shasum.digest('hex');
};

exports.random = function(length) {
  // return alphaDecimal of given length
  var store = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''), string = '';
  for (var i = 0; i < length; i++) {
    string += store[(Math.random() * store.length) | 0];
  }
  return string;
};
