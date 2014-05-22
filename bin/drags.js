#!/usr/bin/env node
/*jslint node: true */
var os = require('os');
var logger = require('loge');

var opts = require('optimist')
  .usage([
    'Usage: drags server [options]',
    '       drags install [options]',
    '       drags add-administrator <email> <password>',
  ].join('\n'))
  .describe({
    surveys: 'directory containing surveys',
    forks: 'maximum number of workers to spawn',
    host: 'hostname to listen on',
    port: 'port to listen on',
    // database: 'database to use',

    help: 'print this help message',
    verbose: 'print extra output',
    version: 'print version',
  })
  .boolean(['help', 'verbose', 'version'])
  .alias({verbose: 'v'})
  .default({
    forks: os.cpus().length,
    hostname: '127.0.0.1',
    port: 1301,
    // database: 'drags',
  });

var argv = opts.argv;
logger.level = argv.verbose ? 'debug' : 'info';

if (argv.help) {
  opts.showHelp();
}
else if (argv.version) {
  console.log(require('../package').version);
}
else {
  var commands = require('./drags-commands');
  argv = opts
    .demand('surveys')
    .check(function() {
      var command = argv._[0];
      if (!commands[command]) {
        throw new Error('You must specify a valid command (one of ' + Object.keys(commands).join(', ') + ')');
      }
    }).argv;

  // allow using ~/ if desired
  argv.surveys = argv.surveys.replace(/^~/, process.env.HOME);

  var command = argv._[0];
  commands[command](argv);
}
