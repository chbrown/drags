/*jslint node: true */
var _ = require('underscore');
var amulet = require('amulet');
var async = require('async');
var logger = require('loge');
var Router = require('regex-router');
var sv = require('sv');
var url = require('url');

var db = require('../../lib/db');
var models = require('../../lib/models');

var R = new Router(function(req, res) {
  res.die(404, 'No resource at: ' + req.url);
});

// R.any(/^\/admin\/users/, require('./users'));



R.get('/admin', function(req, res) {
  amulet.stream(['admin/layout.mu', 'admin/index.mu'], {ticket_user: req.user}).pipe(res);
});

var createResponsesQuery = function(url_query) {
  var select = new db.Select({table: 'responses'});
  if (url_query.experiment_id) {
    select = select.where('experiment_id = ?', url_query.experiment_id);
  }
  if (url_query.stimulus_id) {
    select = select.where('stimulus_id = ?', url_query.stimulus_id);
  }
  if (url_query.user_id) {
    select = select.where('user_id = ?', url_query.user_id);
  }
  return select;
};

R.get(/^\/admin\/responses/, function(req, res) {
  var urlObj = url.parse(req.url, true);
  var select = createResponsesQuery(urlObj.query);
  // select =
  select.orderBy('id DESC').limit(100).execute(function(err, rows) {
    if (err) return res.die('Database select error: ' + err.toString());

    select.addColumns('COUNT(id)').execute(function(err, count_rows) {
      res.json({
        total: count_rows[0].count,
        rows: rows,
      });
    });
  });
});

R.get(/^\/admin\/filters/, function(req, res) {
  var urlObj = url.parse(req.url, true);
  var select = createResponsesQuery(urlObj.query);

  async.parallel([
    function(callback) {
      // get user_ids
      var colselect = select.addColumns('DISTINCT user_id AS id');
      colselect.execute(callback);
    },
    function(callback) {
      var colselect = select.addColumns('DISTINCT experiment_id AS id');
      colselect.execute(callback);
    },
    function(callback) {
      var colselect = select.addColumns('DISTINCT stimulus_id AS id');
      colselect.execute(callback);
    },
  ], function(err, results) {
    if (err) return res.die('/admin/filter query error', err);
    // console.log('/admin/filter results', results);

    var result = {
      user_ids: _.pluck(results[0], 'id'),
      experiment_ids: _.pluck(results[1], 'id'),
      stimulus_ids: _.pluck(results[2], 'id'),
    };
    res.json(result);
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
