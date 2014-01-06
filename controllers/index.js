'use strict'; /*jslint es5: true, node: true, indent: 2 */
var path = require('path');
var async = require('async');

var amulet = require('amulet').set({root: path.join(__dirname, '..', 'templates')}); // minify: true,
var Cookies = require('cookies');
var Router = require('regex-router');

var lib = require('../lib');
var logger = require('loge');
var models = require('../lib/models');

Cookies.prototype.defaults = function() {
  var expires = new Date(Date.now() + 31*86400*1000); // 1 month out
  return {path: '/', expires: expires};
};

var R = new Router(function(req, res) {
  res.redirect('/');
});

// attach controllers
R.any(/^\/(static|favicon\.ico)/, require('./static'));
R.any(/^\/admin/, require('./admin'));
R.any(/^\/users/, require('./users'));

var handler = function(req, res) {
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

handler.loadSurveys = function(surveys, callback) {
  /** loadSurveys(surveys): assume that all directories in a single path

  surveys: String
      filepath of directory to load subdirectories from
  callback: function(Error | null)

  each survey has a name, like "ptct-video", and so we route all requests to
  `/ptct-video/*` to that survey (module). Each survey should handle all of its
  own static resources, except for maybe some of the stuff like jquery, backbone, etc.
  */
  lib.subdirectories(surveys, function(err, survey_paths) {
    if (err) return callback(err);

    logger.debug('Found surveys:', survey_paths);

    var survey_names = survey_paths.map(path.basename);
    R.get('/', function(req, res) {
      amulet.stream(['layout.mu', 'surveys.mu'], {surveys: survey_names}).pipe(res);
    });

    survey_paths.forEach(function(survey_path) {
      var survey_name = path.basename(survey_path);
      logger.debug('Requiring survey module "%s" from "%s"', survey_name, survey_path);
      var survey = require(survey_path);
      R.any(new RegExp('^(/' + survey_name + ')(/.*)?$'), function(req, res, m) {
        var prefix = m[1];
        req.url = m[2] || '/';
        survey(req, res, prefix);
      });
    });

    logger.info('Loaded %d surveys:', survey_paths.length, survey_names);
  });
};

module.exports = handler;
