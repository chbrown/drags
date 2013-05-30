'use strict'; /*jslint node: true, es5: true, indent: 2 */
var fs = require('fs');
var os = require('os');
var path = require('path');
var util = require('util');
var Cookies = require('cookies');
var amulet = require('amulet');

var cluster = require('cluster');
var domain = require('domain');

var http = require('http-enhanced');
var models = require('./models');
var logger = require('./logger');
var Router = require('regex-router');

var argv = require('optimist').default({
  maxcores: 16,
  hostname: '127.0.0.1',
  port: 1301,
  'default': '/ptct-video',
  database: 'drags',
  surveys_path: path.join(__dirname, 'surveys'),
}).argv;

models.connect(argv.database);

// root() simply adds some data gatherers, loggers, gets the current user and
//   forwards on the request to the regex-router, R.
function work() {
  amulet.set({minify: true, root: __dirname});

  Cookies.prototype.defaults = function() {
    var next_month = new Date(Date.now() + 31*86400*1000);
    return {expires: next_month, httpOnly: false};
  };

  var R = new Router();
  R.default = function(m, req, res) {
    res.redirect(argv.default);
  };

  R.get(/^\/favicon.ico/, function(m, req, res) {
    res.die('');
  });

  var admin_R = require('./admin');
  // need something like R.forward(/whatev/, other_R)
  R.any(/^\/admin/, function(m, req, res) {
    admin_R.route(req, res);
  });

  fs.readdir(argv.surveys_path, function(err, survey_paths) {
    logger.maybe(err);

    // var surveys = {};
    survey_paths.filter(function(survey_name) {
      return survey_name[0] !== '.';
    }).forEach(function(survey_name) {
      var module = path.join(argv.surveys_path, survey_name);
      logger.info("Loading module:", module);
      var survey = require(module);

      // each survey has a name, like "ptct-video", and so we route all requests to
      //   /ptct-video/* to that module
      R.any(new RegExp('^/' + survey_name + '(/.*)?$'), function(m, req, res) {
        survey(req, res, m[1] || '/');
      });
    });
  });

  var root = function(req, res) {
    req.saveData();
    req.cookies = new Cookies(req, res);
    logger.info(req.method +  ': ' + req.url);

    var ticket = req.cookies.get('ticket') || '';
    models.User.fromTicket(ticket.replace(/\W/g, ''), function(err, user) {
      logger.maybe(err);
      req.user = user;
      req.cookies.set('ticket', user.activeTicket());
      R.route(req, res);
    });
  };

  var server = http.createServer(function(req, res) {
    var started = Date.now();
    res.end = function() {
      logger.info('duration', {url: req.url, method: req.method, ms: Date.now() - started});
      http.ServerResponse.prototype.end.apply(res, arguments);
    };

    var d = domain.create();
    d.on('error', function(err) {
      console.error('domain error', err.stack);
      try {
        // close down after 30s so that we don't drop current connections.
        setTimeout(function() {
          process.exit(1);
        }, 30000).unref();

        // stop taking new requests.
        server.close();

        // Let the master know we're dead.
        cluster.worker.disconnect();

        // try to send an error to the request that triggered the problem
        res.die('Exception encountered! ' + err.toString());
      } catch (err2) {
        // oh well, not much we can do at this point.
        console.error('Error displaying error!', err2.stack);
      }
    });

    d.add(req);
    d.add(res);
    d.run(function() {
      root(req, res);
    });
  }).listen(argv.port, argv.hostname, function() {
    logger.info('DRAGS ready at ' + argv.hostname + ':' + argv.port);
  });
}

// The cluster / domains code below handles utilizing all cores on this machine,
//   killing off servers when a request throws an unhandled error,
//   and restarting workers when one goes down.
// Besides changing how you might report errors, no fun stuff here. Use root,
//   above, for all real controller / action code.
if (cluster.isMaster) {
  var forks = Math.min(os.cpus().length, argv.maxcores);
  for (var i = 0; i < forks; i++) {
    cluster.fork();
  }
  cluster.on('disconnect', function(worker) {
    logger.error('Worker (' + util.inspect(worker) + ') died. Restarting.');
    cluster.fork();
  });
} else {
  work();
}
