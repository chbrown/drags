'use strict'; /*jslint es5: true, node: true, indent: 2 */
var path = require('path');
var amulet = require('amulet').set({root: path.join(__dirname, '..', 'templates')}); // minify: true,
var Cookies = require('cookies');
var Router = require('regex-router');

var logger = require('../lib/logger');
var models = require('../lib/models');

var surveys = require('../package').surveys;

Cookies.prototype.defaults = function() {
  var expires = new Date(Date.now() + 31*86400*1000); // 1 month out
  return {path: '/', expires: expires};
};

var R = new Router(function(req, res) {
  res.redirect('/');
});

R.get('/', function(req, res) {
  amulet.stream(['layout.mu', 'surveys.mu'], {surveys: Object.keys(surveys)}).pipe(res);
});

// attach controllers
R.any(/^\/(static|favicon\.ico)/, require('./static'));
R.any(/^\/admin/, require('./admin'));
R.any(/^\/users/, require('./users'));

// attach surveys
// each survey has a name, like "ptct-video", and so we route all requests to
// `/ptct-video/*` to that survey (module). Each survey should handle all of its
// own static resources, except for maybe some of the stuff like jquery, backbone, etc.
Object.keys(surveys).forEach(function(survey_name) {
  var survey_path = surveys[survey_name].replace(/^~/, process.env.HOME);
  logger.info('Requiring survey module "%s" from "%s"', survey_name, survey_path);
  var survey = require(survey_path);
  R.any(new RegExp('^(/' + survey_name + ')(/.*)?$'), function(req, res, m) {
    var prefix = m[1];
    req.url = m[2] || '/';
    survey(req, res, prefix);
  });
});

module.exports = function(req, res) {
  /** Logic starts here; cluster+domain handling should happen outside this function.

  1. Add data gatherers
  2. Add loggers
  3. Get the current user
  4. Forward the request to the regex-router (R).
  */
  var started = Date.now();
  res.on('finish', function() {
    logger.info('duration', {url: req.url, method: req.method, ms: Date.now() - started});
  });

  req.cookies = new Cookies(req, res);
  var current_ticket = req.cookies.get('ticket');
  logger.debug('%s %s', req.method, req.url);

  models.User.fromTicket(current_ticket, function(err, user) {
    if (err) return res.die('User.fromTicket error: ' + err);

    req.user = user;
    if (user.primaryTicket() !== current_ticket) {
      req.cookies.set('ticket', user.primaryTicket());
    }

    R.route(req, res);
  });
};
