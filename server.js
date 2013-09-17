'use strict'; /*jslint es5: true, node: true, indent: 2 */
// this file will be called multiple times for each child worker
var path = require('path');
var cluster = require('cluster');
var domain = require('domain');
var http = require('http-enhanced');

var logger = require('./lib/logger');
var models = require('./lib/models');

var root_controller = require('./controllers');

var argv = require('optimist').argv;
// this module should be forked with --hostname, --port, --database, and --verbose arguments
logger.level = argv.verbose ? 'debug' : 'info';

models.connect(argv.database);

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
}).listen(argv.port, argv.hostname, function() {
  logger.info('Listening on %s:%d (pid %d)', argv.hostname, argv.port, process.pid);
});