#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var os = require('os');
var fs = require('fs');
var path = require('path');
var cluster = require('cluster');

var logger = require('../lib/logger');
var drags = require('..');

var opts = require('optimist')
  .usage([
    'Usage: drags ui [options]',
    '       drags install [options]'
  ].join('\n'))
  .describe({
    forks: 'maximum number of workers to spawn',
    host: 'hostname to listen on',
    port: 'port to listen on',

    root: 'redirect requests for / to this url',
    database: 'mongodb database to use',

    help: 'print this help message',
    verbose: 'print extra output',
    version: 'print version',
  })
  .boolean(['help', 'ttv2', 'verbose', 'version'])
  .alias({verbose: 'v'})
  .default({
    forks: os.cpus().length,
    hostname: '127.0.0.1',
    port: 1301,
    root: '/ptct-video',
    database: 'drags',
  });

var argv = opts.argv;
logger.level = argv.verbose ? 'debug' : 'info';

var commands = {
  install: function() {
    var surveys = require('../package').surveys;
    var paths = Object.keys(surveys).map(function(name) {
      return surveys[name];
    });

    drags.installModules(paths, function(err) {
      if (err) throw err;
      logger.info('Installed surveys');
    });
  },
  ui: function() {
    /** `ui`: Trigger forking cluster + domains code.

    * Utilize all cores on this machine (up to some maximum)
    * Kill off servers when a request throws an unhandled error
    * Restart workers when one goes down.
    * Besides changing how you might report errors, no fun stuff here.
    * Use `worker` for all real controller / action code.

    */
    logger.info('Initializing with %d forks', argv.forks);
    cluster.setupMaster({
      exec: path.join(__dirname, '..', 'server.js'),
      args: [
        '--hostname', argv.hostname,
        '--port', argv.port,
        '--root', argv.root,
        '--database', argv.database,
      ],
      // silent: true,
    });
    for (var i = 0; i < argv.forks; i++) {
      cluster.fork();
    }
    cluster.on('disconnect', function(worker) {
      logger.error('Worker (%s) died. Forking a new worker.', worker.id);
      cluster.fork();
    });

  },
};

if (argv.help) {
  opts.showHelp();
}
else if (argv.version) {
  console.log(require('../package').version);
}
else {
  argv = opts.check(function() {
    var command = argv._[0];
    if (!commands[command]) {
      throw new Error('You must specify a valid command (one of ' + Object.keys(commands).join(', ') + ')');
    }
  }).argv;

  var command = argv._[0];
  commands[command]();
}
