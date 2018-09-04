var _ = require('underscore');
var amulet = require('amulet');
var url = require('url');
var querystring = require('querystring');
var Router = require('regex-router');
var logger = require('loge');

var db = require('../lib/db');
var hash = require('../lib/hash');
var models = require('../lib/models');

var R = new Router(function(req, res) {
  // res.redirect('/users');
  res.status(404).die('No resource at: ' + req.url);
});

/** GET /users
show login page */
R.get(/^\/users(\?|$)/, function(req, res) {
  // boost administrators straight up to /admin ?
  // return res.redirect('/admin');
  var urlObj = url.parse(req.url, true);
  var ctx = {user: req.user, redirect: urlObj.redirect};
  amulet.stream(['layout.mu', 'users/login.mu'], ctx).pipe(res);
});

/** POST /users
login as user with password */
R.post('/users', function(req, res) {
  req.readToEnd('utf8', function(err, data) {
    if (err) return res.die('POST /users: req.readToEnd error', err);

    var fields = querystring.parse(data);
    if (!fields.password.trim()) return res.die('Password cannot be empty');

    // logger.debug('Looking for user with credentials: %s :: %s',
    //   fields.email, fields.password);
    models.User.fromCredentials(fields.email, fields.password, function(err, user) {
      if (err) return res.die('User login error ' + err);
      if (!user) return res.die('That user does not exist or the password you entered is incorrect.');

      var new_ticket = hash.random(40);
      var sql = 'UPDATE users SET ticket = $1 WHERE id = $2';
      db.Update('users').set({ticket: new_ticket}).whereEqual({id: user.id}).execute(function(err) {
        if (err) return res.die('User update error', err);

        req.cookies.set('ticket', new_ticket);
        // this will just die if the user is not a superuser, even if they were able to log in.
        res.redirect(fields.redirect || '/admin');
      });
    });
  });
});

/** GET /logout
helper page to purge ticket */
R.get('/users/logout', function(req, res) {
  var old_ticket = req.cookies.get('ticket');
  logger.debug('Deleting ticket cookie "%s" for user "%s"', old_ticket, req.user._id);
  req.cookies.del('ticket');

  res.redirect('/users');
});

module.exports = R.route.bind(R);
