/*jslint node: true */
var _ = require('underscore');
var sv = require('sv');
var url = require('url');
var Router = require('regex-router');
var amulet = require('amulet');
var logger = require('loge');

var models = require('../../lib/models');
var db = require('../../lib/db');

var R = new Router(function(req, res) {
  res.redirect('/admin');
});

R.any(/^\/admin\/users/, require('./users'));

R.get('/admin', function(req, res) {
  // select 100 most recent non-empty users
  var last_100_sql = 'SELECT * FROM responses ORDER BY id DESC LIMIT 100';
  db.query(last_100_sql, [], function(err, rows) {
    if (err) throw err;
    // console.log(rows);
    var ctx = {
      ticket_user: req.user,
      responses: rows,
    };
    amulet.stream(['layout.mu', 'admin/layout.mu', 'admin/responses.mu'], ctx).pipe(res);
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

  models.User.findNonEmpty().stream()
  .on('error', function(err) {
    logger.error(err);
  })
  .on('data', function(user) {
    // we want to cross multiply user fields (like demographics) across each response in user.responses
    // todo: aggregate and clean up user_demographics
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
      // _.extend(response, user.demographics);

      response.user_id = user._id;
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
  if (req.user.administrator) {
    logger.debug('Authenticated with user: %s', req.user.id);
    R.route(req, res);
  }
  else {
    res.redirect('/users?redirect=' + req.url);
  }
};
