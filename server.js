'use strict'; /*jslint es5: true, node: true, indent: 2 */
// this file will be called multiple times for each child worker
var path = require('path');
var cluster = require('cluster');
var domain = require('domain');
var http = require('http-enhanced');

var Cookies = require('cookies');
var Router = require('regex-router');

var logger = require('./lib/logger');
var models = require('./lib/models');

var argv = require('optimist').argv;
// this module should be forked with --hostname, --port, --root, and --database arguments

models.connect(argv.database);

Cookies.prototype.defaults = function() {
  var expires = new Date(Date.now() + 31*86400*1000); // 1 month out
  return {path: '/', expires: expires};
};

var R = new Router(function(req, res) {
  if (!argv.root) return res.die(404, 'Cannot find resource at ' + req.url);
  res.redirect(argv.root);
});
// set up local controllers
R.any(/^\/admin/, require('./controllers/admin'));
R.get(/^\/(static|favicon\.ico)/, require('./controllers/static'));

// each survey has a name, like "ptct-video", and so we route all requests to
// `/ptct-video/*` to that survey (module). Each survey should handle all of its
// own static resources, except for maybe some of the stuff like jquery, backbone, etc.
var surveys = require('./package').surveys;
Object.keys(surveys).forEach(function(survey_name) {
  var survey_path = surveys[survey_name].replace(/^~/, process.env.HOME);
  logger.info('Requiring survey module "%s" from "%s"', survey_name, survey_path);
  var survey = require(survey_path);
  R.any(new RegExp('^(/' + survey_name + ')(/.*)?$'), function(req, res, m) {
    req.url = m[2] || '/';
    survey(req, res, m[1]);
  });
});


var root = function(req, res) {
  /** `root`: This is where the logic starts.

  * Cluster+domain handling should happen outside this function.

  1. Add data gatherers
  2. Add loggers
  3. Get the current user
  4. Forward the request to the regex-router (R).

  */
  var started = Date.now();
  res.on('finish', function() {
    logger.info('duration', {url: req.url, method: req.method, ms: Date.now() - started});
  });

  // req.readToEnd(); // cache input on the request object so that we can grab it easily later.
  req.cookies = new Cookies(req, res);
  var current_ticket = req.cookies.get('ticket');
  // logger.debug('%s %s', req.method, req.url);

  models.User.fromTicket(current_ticket, function(err, user) {
    if (err) return res.die('User.fromTicket error: ' + err);

    req.user = user;
    if (user.primaryTicket() != current_ticket) {
      req.cookies.set('ticket', user.primaryTicket());
    }

    R.route(req, res);
  });
};

var server = http.createServer(function(req, res) {
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
    }
    catch (internal_error) {
      // oh well, not much we can do at this point.
      console.error('Error displaying error!', internal_error.stack);
    }
  });

  d.add(req);
  d.add(res);
  d.run(function() {
    root(req, res);
  });
}).listen(argv.port, argv.hostname, function() {
  logger.info('DRAGS ready at %s:%d (pid %d)', argv.hostname, argv.port, process.pid);
});
