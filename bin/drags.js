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
    '       drags install [options]',
    '       drags add-administrator <email> <password>',
  ].join('\n'))
  .describe({
    forks: 'maximum number of workers to spawn',
    host: 'hostname to listen on',
    port: 'port to listen on',

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
    var args = [
      '--hostname', argv.hostname,
      '--port', argv.port,
      '--database', argv.database,
    ].concat(argv.verbose ? ['--verbose'] : []);
    logger.info('Starting %d forks; argv: %s', argv.forks, args.join(' '));

    cluster.setupMaster({
      exec: path.join(__dirname, '..', 'server.js'),
      args: args,
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
  'add-administrator': function() {
    var email = argv._[1];
    var password = argv._[2];

    var models = require('../lib/models');
    models.connect(argv.database);

    var user = new models.User({email: email, password: password, administrator: true});
    user.save(function(err) {
      if (err) return console.error(err);

      console.log('Created user: %s', user._id, user.toJSON());
      // the models connection will hang unless we exit forcibly
      process.exit();
    });
  }
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
