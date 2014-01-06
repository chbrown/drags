'use strict'; /*jslint node: true, es5: true, indent: 2 */
var _ = require('underscore');
var amulet = require('amulet');
var url = require('url');
var querystring = require('querystring');
var Router = require('regex-router');
var logger = require('loge');

var models = require('../lib/models');

var R = new Router(function(req, res) {
  // res.redirect('/users');
  res.die(404, 'No resource at: ' + req.url);
});

/** GET /users
show login page */
R.get(/^\/users(\?|$)/, function(req, res) {
  if (req.user && req.user.administrator) {
    // boost administrators straight up to /admin
    return res.redirect('/admin');
  }

  var urlObj = url.parse(req.url, true);

  amulet.stream(['layout.mu', 'users/login.mu'], {user: req.user, redirect: urlObj.redirect}).pipe(res);
});

/** POST /users
login as user with password */
R.post('/users', function(req, res) {
  req.readToEnd('utf8', function(err, data) {
    if (err) return res.die('POST /users: req.readToEnd error', err);

    var fields = querystring.parse(data);
    if (!fields.password.trim()) return res.die('Password cannot be empty');

    models.User.withPassword(fields.email, fields.password, function(err, user) {
      if (err) return res.die('User.withPassword error ' + err);
      if (!user) return res.die('That user does not exist or the password you entered is incorrect.');

      var ticket = user.newTicket();
      // user now has dirty field: .tickets
      user.save(function(err) {
        if (err) return res.die('User save error', err);

        req.cookies.set('ticket', ticket);
        // this will just die if the user is not a superuser, even if they were able to log in.
        res.redirect(fields.redirect || '/admin');
      });
    });
  });
});

/** GET /logout
helper page to purge ticket */
R.get('/users/logout', function(req, res) {
  logger.debug('Deleting ticket cookie "%s" for user "%s"', req.cookies.get('ticket'), req.user._id);
  req.cookies.del('ticket');

  res.redirect('/users');
});

module.exports = function(req, res) {
  /** Handle /users* requests
  */
  R.route(req, res);
};
