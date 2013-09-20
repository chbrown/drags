'use strict'; /*jslint es5: true, node: true, indent: 2 */
var fs = require('fs');
var path = require('path');
var async = require('async');

exports.subdirectories = function(dirpath, callback) {
  /** find just the directories in a directory

  callback: function(Error | null, [String] | null)
      The callback returns a list of filepaths, each starting with the given dirpath
  */
  fs.readdir(dirpath, function(err, files) {
    if (err) return callback(err);

    async.map(files, function(file, callback) {
      var filepath = path.join(dirpath, file);
      fs.stat(filepath, function(err, stats) {
        callback(err, {filepath: filepath, stats: stats});
      });
    }, function(err, filepath_stats) {
      if (err) return callback(err);

      var child_dirpaths = filepath_stats.filter(function(filepath_stat) {
        return filepath_stat.stats.isDirectory();
      }).map(function(filepath_stat) {
        return filepath_stat.filepath;
      });

      callback(err, child_dirpaths);
    });
  });
};

exports.parseJSON = function(json, default_result) {
  try {
    return JSON.parse(json);
  }
  catch (exc) {
    return default_result;
  }
};
