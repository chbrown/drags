'use strict'; /*jslint es5: true, node: true, indent: 2 */
var _ = require('underscore');
var sv = require('sv');
var url = require('url');
var Router = require('regex-router');
var amulet = require('amulet');

var logger = require('../../lib/logger');
var models = require('../../lib/models');

var R = new Router(function(req, res) {
  res.redirect('/admin');
});

R.any(/^\/admin\/users/, require('./users'));

R.get('/admin', function(req, res) {
  // select 50 most recent non-empty users
  models.User.findNonEmpty().sort('-created').limit(50).exec(function(err, users) {
    var responses = [];
    users.forEach(function(user) {
      // responses.push.apply(responses, user.responses);
      user.responses.forEach(function(response) {
        response.user_id = user._id;
        responses.push(response);
      });
    });

    responses.length = 500;

    var ctx = {
      ticket_user: req.user,
      responses: responses,
    };
    amulet.stream(['layout.mu', 'admin/layout.mu', 'admin/results.mu'], ctx).pipe(res);
  });
});


R.get(/^\/admin\/results.csv/, function(req, res) {
  // call with ?view to view the resulting csv as text in the browser
  var urlObj = url.parse(req.url, true);

  if (urlObj.query.view === undefined) {
    var iso_date = new Date().toISOString().split('T')[0];
    var disposition = 'attachment; filename=surveys_' + iso_date + '.csv';
    res.writeHead(200, {'Content-Type': 'text/csv', 'Content-Disposition': disposition});
  }
  else {
    res.writeHead(200, {'Content-Type': 'text/plain'});
  }

  var csv = new sv.Stringifier({peek: 200});
  csv.pipe(res);

  var query = {demographics: {$exists: true}}; // {active: true};
  models.User.find(query).stream()
  .on('error', function(err) {
    logger.error(err);
  })
  .on('data', function(user) {
    // we cross multiply user fields (like demographics) across each response in user.responses
    // the `user_demographics` variable refers to that list, minus the responses
    var user_object = user.toObject();
    // var user_demographics = _.omit(user.demographics, 'responses');
    // todo: clean up user_demographics ??
    user.responses.forEach(function(response) {

      for (var key in response) {
        // clean up response based on names of fields
        if (key.match(/^time_/) || key.match(/_datetime$/)) {
          // alternatively, test for epoch range on value? but could have bad edge cases
          if (!isNaN(response[key])) {
            response[key] = new Date(response[key]).toISOString();
          }
        }
        else if (key == 'created') {
          response[key] = response[key].toISOString();
        }
        else if (Array.isArray(response[key])) {
          response[key] = response[key].join(',').trim();
        }
      }

      // finally, extend the response with all the user data.
      _.extend(response, user.demographics);
      csv.write(response);
    });
  })
  .on('close', function() {
    logger.info('User stream closed.');
    csv.end();
  });
});

module.exports = function(req, res) {
  // handle auth: all non-administrators should be dropped
  if (!req.user.administrator) {
    // this return is CRUCIAL!
    return res.redirect('/users?redirect=' + req.url);
  }

  logger.debug('Authenticated with user: %s', req.user._id);
  R.route(req, res);
};
