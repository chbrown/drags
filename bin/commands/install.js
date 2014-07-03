/*jslint node: true */
var async = require('async');
var logger = require('loge');
var path = require('path');

var lib = require('../../lib');


module.exports = function(argv) {
  var npm = require('npm');
  npm.on('log', function(message) {
    logger.info(message);
  });
  npm.load(function(err) {
    if (err) throw err;

    lib.subdirectories(argv.surveys, function(err, subdirectories) {
      if (err) throw err;

      // must be in series because npm is a global
      async.eachSeries(subdirectories, function(subdirectory, callback) {
        npm.prefix = subdirectory;
        logger.info('cd %s && npm install', npm.prefix);
        npm.install(function(err) {
          callback(err);
        });
      }, function(err) {
        if (err) throw err;
        logger.info('Installed surveys');
      });
    });
  });
};
