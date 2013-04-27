'use strict'; /*jslint nomen: true, node: true, indent: 2, debug: true, vars: true, es5: true */
var fs = require('fs');
var os = require('os').cpus().length;
var path = require('path');
var amulet = require('amulet');
var Cookies = require('cookies');
var Router = require('regex-router');
var cluster = require('cluster');
var domain = require('domain');
var http = require('./http-enhanced');
var models = require('./models');
var logger = require('./logger');

var argv = require('optimist').default({
    port: 1301,
    hostname: '127.0.0.1',
    admin: 'superuser',
    password: 'OKCAfdt0SQr7',
    'default': '/basic/',
    surveys_path: path.join(__dirname, 'surveys'),
  }).argv;

amulet.set({minify: true, root: __dirname});

Cookies.prototype.defaults = function() {
  var next_month = new Date(Date.now() + 31*86400000);
  return { expires: next_month, httpOnly: false };
};


var R = new Router();
R.default = function(m, req, res) {
  res.redirect(argv.default);
};

var admin = require('./admin');
R.add(/^\/admin/, function(m, req, res) {
  admin.route(req, res);
});

fs.readdir(argv.surveys_path, function(err, survey_paths) {
  logger.maybe(err);

  // var surveys = {};
  survey_paths.filter(function(survey_name) {
    return survey_name[0] !== '.';
  }).forEach(function(survey_name) {
    var survey_path = path.join(argv.surveys_path, survey_name);
    var survey = require(survey_path);

    // each survey has a name, like "ptct-a", and so we route all requests to
    //   /ptct-a/* to that module
    R.any(new RegExp('^/' + survey_name + '(/.*)?$'), function(m, req, res) {
      survey(req, res, m[2] || '/');
    });
  });
});



// root() simply adds some data gatherers, loggers, gets the current user and
//   forwards on the request to the regex-router, R.
function root(req, res) {
  req.data = '';
  req.on('data', function(chunk) { req.data += chunk; });
  req.cookies = new Cookies(req, res);
  logger.info(req.method +  ': ' + req.url);

  var started = Date.now();
  res.end = function() {
    logger.info('duration', {url: req.url, method: req.method, ms: Date.now() - started});
    http.ServerResponse.prototype.end.apply(res, arguments);
  };

  var ticket = req.cookies.get('ticket') || '';
  models.User.fromTicket(ticket.replace(/\W/g, ''), function(err, user) {
    req.user = user;
    logger.maybe(err);
    R.route(req, res);
  });
}

// The cluster / domains code below handles utilizing all cores on this machine,
//   killing off servers when a request throws an unhandled error,
//   and restarting workers when one goes down.
// Besides changing how you might report errors, no fun stuff here. Use root,
//   above, for all real controller / action code.
if (cluster.isMaster) {
  for (var i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
  cluster.on('disconnect', function(worker) {
    logger.error('Worker (' + worker.pid + ') died. Restarting.');
    cluster.fork();
  });
} else {
  var server = http.createServer(function(req, res) {
    var d = domain.create();
    d.on('error', function(err) {
      logger.error('domain error', err.stack);
      try {
        // slowly close down.
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
        logger.error('Error displaying error!', err2.stack);
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
