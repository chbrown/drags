'use strict'; /*jslint es5: true, node: true, indent: 2 */
var npm = require('npm');
var logger = require('./lib/logger');
var async = require('async');

var parseJSON = exports.parseJSON = function(json, default_result) {
  try {
    return JSON.parse(json);
  }
  catch (exc) {
    return default_result;
  }
};

var Range = exports.Range = function(start, end) {
  this.start = start;
  this.end = end;
};
Range.prototype.contains = function(index, inclusive) {
  // call with contains(5, false) to return false when the range is 1..5
  if (inclusive === undefined) inclusive = true;
  return this.start <= index && ((inclusive && index <= this.end) || (!inclusive && index < this.end));
};

var RangeCollection = exports.RangeCollection = function(index_pairs) {
  this.ranges = index_pairs.map(function(index_pair) {
    var start = index_pair[0], end = index_pair[1];
    return new Range(start, end);
  });
};
RangeCollection.prototype.contains = function(index, inclusive) {
  var valid = false;
  index = parseInt(index, 10);
  return this.ranges.some(function(range) {
    return range.contains(index, inclusive);
  });
};

var installModules = exports.installModules = function(paths, callback) {
  npm.on('log', function(message) { logger.info(message); });

  async.forEach(paths, function(path, callback) {
    path = path.replace(/^~/, process.env.HOME);
    npm.load({prefix: path}, function(err) {
      if (err) {
        logger.error('npm.load error', err);
        return callback(err);
      }

      logger.info('`npm install` in "%s"', path);
      npm.install(function(err, data) {
        if (err) {
          logger.error('npm.install error', err);
          return callback(err);
        }

        logger.debug('npm.install %s', data);
        // command succeeded, and data might have some info
        return callback();
      });
    });
  }, callback);
};
