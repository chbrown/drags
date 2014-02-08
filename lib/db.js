/*jslint node: true */
var _ = require('underscore');
var pg = require('pg');
// pg.defaults.binary = true; // will this parse numerics as floats?
pg.defaults.poolSize = 15; // default is 10

// config acts as a module singleton
// var config = {database: 'drags', user: 'postgres'};
var config = {database: 'drags'};
exports.set = function(opts) {
  // expose config
  _.extend(config, opts);
};

exports.query = function(sql, args, callback) {
  /** run sql query on pre-configured SQL connection

  `callback`: function(Error | null, [Object] | null)
  */
  pg.connect(config, function(err, client, done) {
    if (err) return callback ? callback(err) : err;

    client.query(sql, args, function(err, result) {
      done();
      if (callback) {
        callback(err, result ? result.rows : null);
      }
    });
  });
};
