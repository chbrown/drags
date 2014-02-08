'use strict'; /*jslint es5: true, node: true, indent: 2 */
// this file will be called multiple times for each child worker
var cluster = require('cluster');
var domain = require('domain');
var http = require('http-enhanced');
var logger = require('loge');

var db = require('./lib/db');
var root_controller = require('./controllers');

var server = http.createServer(function(req, res) {
  var d = domain.create();
  d.on('error', function(err) {
    logger.error('domain error', err.stack);
    try {
      // close down after 30s so that we don't drop current connections.
      setTimeout(function() {
        process.exit(1);
      }, 30000).unref();

      // stop taking new requests
      server.close();

      // Let the master know we're dead
      cluster.worker.disconnect();

      // try to send an error to the request that triggered the problem
      res.die('Exception encountered! ' + err.toString());
    }
    catch (internal_error) {
      // oh well, not much we can do at this point
      logger.error('Error displaying error!', internal_error.stack);
    }
  });

  d.add(req);
  d.add(res);
  d.run(function() {
    root_controller(req, res);
  });
});

process.on('message', function(argv) {
  logger.level = argv.verbose ? 'debug' : 'info';
  db.set({database: argv.database});
  root_controller.loadSurveys(argv.surveys, function(err) {
    if (err) {
      logger.error('Error loading surveys', err);
    }
  });
  server.listen(argv.port, argv.hostname, function() {
    logger.info('Listening on %s:%d (pid %d)', argv.hostname, argv.port, process.pid);
  });
});
