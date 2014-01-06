'use strict'; /*jslint es5: true, node: true, indent: 2 */
var fs = require('fs');
var async = require('async');
var cluster = require('cluster');
var path = require('path');

var lib = require('../lib');
var logger = require('loge');

exports['server'] = function(argv) {
  /** `server`: Trigger forking cluster + domains code.

  * Utilize all cores on this machine (up to some maximum)
  * Kill off servers when a request throws an unhandled error
  * Restart workers when one goes down.
  * Besides changing how you might report errors, no fun stuff here.
  * Use `worker` for all real controller / action code.
  */
  // var args = [
  //   '--hostname', argv.hostname,
  //   '--port', argv.port,
  //   '--database', argv.database,
  //   '--surveys', argv.surveys,
  // ].concat(argv.verbose ? ['--verbose'] : []);
  // logger.info('Starting %d forks; argv: %s', argv.forks, args.join(' '));

  cluster.setupMaster({
    exec: path.join(__dirname, '..', 'server.js'),
    // args: args,
    // silent: true,
  });

  for (var i = 0; i < argv.forks; i++) {
    var worker = cluster.fork();
    worker.send(argv);
  }
  cluster.on('disconnect', function(worker) {
    logger.error('Worker[%s] died. Forking a new worker.', worker.id);
    var new_worker = cluster.fork();
    new_worker.send(argv);
  });
};

exports['install'] = function(argv) {
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

exports['add-administrator'] = function(argv) {
  var email = argv._[1];
  var password = argv._[2];

  var models = require('../lib/models');
  models.connect(argv.database);

  var user = new models.User({email: email, password: password, administrator: true});
  user.save(function(err) {
    if (err) return console.error(err);

    // the models connection will make node hang unless we disconnect
    models.mongoose.disconnect(function() {
      console.log('Created user: %s', user._id, user.toJSON());
      // process.exit();
    });
  });
};
