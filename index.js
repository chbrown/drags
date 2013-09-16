'use strict'; /*jslint es5: true, node: true, indent: 2 */
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
  var npm = require('npm');
  npm.on('log', function(message) {
    logger.info(message);
  });

  npm.load(function(err) {
    if (err) {
      logger.error('npm.load error', err);
      return callback(err);
    }

    // must be in series because npm is a global
    async.eachSeries(paths, function(path, callback) {
      npm.prefix = path.replace(/^~/, process.env.HOME);
      logger.info('`npm install` in "%s"', npm.prefix);
      npm.install(function(err) {
        if (err) {
          logger.error('npm.install error', err);
          return callback(err);
        }

        logger.debug('`npm.install` finished');
        callback();
      });
    }, callback);
  });
};
