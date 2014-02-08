/*jslint node: true */
var _ = require('underscore');
var sv = require('sv');
var querystring = require('querystring');
var amulet = require('amulet');
var Router = require('regex-router');
var logger = require('loge');

var models = require('../../lib/models');

// /admin/users/*
var R = new Router(function(req, res) {
  // res.die(404, 'No resource at: ' + req.url);
  res.redirect('/admin/users');
});

/** GET /admin/users
list all users */
R.get('/admin/users', function(req, res, m) {
  var fields = '_id email password created administrator responses.length';
  var user_stream = models.User.findNonEmpty().select(fields).sort('-created').limit(250).exec(function(err, users) {
    if (err) return res.die('User query error', err);

    users = users.map(function(user) {
      return {
        _id: user._id.toString(),
        email: user.email,
        created: user.created,
        administrator: user.administrator,
        responses_length: user.responses.length,
      };
    });

    var ctx = {
      ticket_user: req.user,
      users: users,
    };
    amulet.stream(['layout.mu', 'admin/layout.mu', 'admin/users/all.mu'], ctx).pipe(res);
  });
});

/** GET /admin/users/:user_id
show single user */
R.get(/^\/admin\/users\/(\w+)$/, function(req, res, m) {
  models.User.findById(m[1], function(err, user) {
    if (err) return res.die('User query error', err);

    var responses = user.responses.map(function(response) {
      var details = _.omit(response, 'created', 'stimulus_id', 'value');
      return {
        created: response.created,
        stimulus_id: response.stimulus_id,
        value: response.value,
        details: JSON.stringify(details),
      };
    });

    var ctx = {
      ticket_user: req.user,
      user: user,
      responses: responses,
    };
    amulet.stream(['layout.mu', 'admin/layout.mu', 'admin/users/one.mu'], ctx).pipe(res);
  });
});

/** GET /admin/users/:user_id/edit
edit single user */
R.get(/^\/admin\/users\/(\w+)\/edit$/, function(req, res, m) {
  models.User.findById(m[1], function(err, user) {
    if (err) return res.die('User query error: ' + err);

    var ctx = {
      ticket_user: req.user,
      user: user,
    };
    amulet.stream(['layout.mu', 'admin/layout.mu', 'admin/users/edit.mu'], ctx).pipe(res);
  });
});

/** POST /admin/users/:user_id
update existing user */
R.post(/^\/admin\/users\/(\w+)$/, function(req, res, m) {
  models.User.findById(m[1], function(err, user) {
    if (err) return res.die('User query error: ' + err);

    req.readToEnd('utf8', function(err, data) {
      if (err) return res.die('IO read error: ' + err);

      var fields = querystring.parse(data);
      var overwriting_fields = _.pick(fields, 'email', 'administrator');
      _.extend(user, overwriting_fields);

      if (fields.password && fields.password.trim()) {
        user.password = fields.password;
      }

      user.save(function(err) {
        if (err) return res.die('User save error: ' + err);

        res.redirect('/admin/users/' + user._id);
      });
    });
  });
});

module.exports = R.route.bind(R);
