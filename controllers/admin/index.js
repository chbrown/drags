/*jslint node: true */
var _ = require('underscore');
var amulet = require('amulet');
var async = require('async');
var logger = require('loge');
var Router = require('regex-router');
var sv = require('sv');
var sqlcmd = require('sqlcmd');
var url = require('url');

var db = require('../../lib/db');
var models = require('../../lib/models');

var year_milliseconds = 365*24*60*60*1000;

var R = new Router(function(req, res) {
  res.die(404, 'No resource at: ' + req.url);
});

R.any(/^\/admin\/users/, require('./users'));

R.get('/admin', function(req, res) {
  var ctx = {ticket_user: req.user};
  amulet.stream(['admin/layout.mu', 'admin/index.mu'], ctx).pipe(res);
});

R.get('/admin/responses/distinct-ids', function(req, res) {
  var select = new sqlcmd.Select({table: 'responses'}).orderBy('id');
  async.parallel([
    function(callback) {
      select.add('DISTINCT user_id AS id').execute(db, callback);
    },
    function(callback) {
      select.add('DISTINCT experiment_id AS id').execute(db, callback);
    },
    function(callback) {
      select.add('DISTINCT stimulus_id AS id').execute(db, callback);
    },
  ], function(err, results) {
    if (err) return res.die('/admin/responses/distinct-ids query error', err);
    var result = {
      user_ids: _.pluck(results[0], 'id'),
      experiment_ids: _.pluck(results[1], 'id'),
      stimulus_ids: _.pluck(results[2], 'id'),
    };
    res.json(result);
  });
});

R.get(/^\/admin\/responses\/values/, function(req, res) {
  var params = url.parse(req.url, true).query;
  if (!params.stimulus_id) return res.die(400, 'stimulus_id parameter is required');

  var select = new sqlcmd.Select({table: 'responses'})
    .add('DISTINCT value')
    .where('stimulus_id = ?', params.stimulus_id)
    .orderBy('value');

  select.execute(db, function(err, rows) {
    if (err) return res.die('/admin/responses/values query error', err);
    var result = {
      values: _.pluck(rows, 'value'),
    };
    res.json(result);
  });
});

// R.get(/^\/admin\/incremental-filters/, function(req, res) {
//   var urlObj = url.parse(req.url, true);
//   var select = new sqlcmd.Select({table: 'responses'});
//   var params = urlObj.query;
//   // var select = createResponsesQuery(urlObj.query);

//   async.parallel([
//     // for each one of these, we select distinct on one,
//     // and don't filter on it individually
//     function(callback) {
//       // get user_ids
//       select
//         .add('DISTINCT user_id AS id')
//         .whereIf('experiment_id = ?', params.experiment_id)
//         .whereIf('stimulus_id = ?', params.stimulus_id)
//         .execute(callback);
//     },
//     function(callback) {
//       select
//         .add('DISTINCT experiment_id AS id')
//         .whereIf('user_id = ?', params.user_id)
//         .whereIf('stimulus_id = ?', params.stimulus_id)
//         .execute(callback);
//     },
//     function(callback) {
//       select
//         .add('DISTINCT stimulus_id AS id')
//         .whereIf('user_id = ?', params.user_id)
//         .whereIf('experiment_id = ?', params.experiment_id)
//         .execute(callback);
//     },
//   ], function(err, results) {
//     if (err) return res.die('/admin/filter query error', err);
//     // console.log('/admin/filter results', results);
//     var result = {
//       user_ids: _.pluck(results[0], 'id'),
//       experiment_ids: _.pluck(results[1], 'id'),
//       stimulus_ids: _.pluck(results[2], 'id'),
//     };
//     res.json(result);
//   });
// });

var format_date = function(date) {
  return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
};

var responses_csv = function(req, res, select) {
  var urlObj = url.parse(req.url, true);
  // call with ?view to view the resulting csv as text in the browser
  if (urlObj.query.view === undefined) {
    var iso_date = new Date().toISOString().split('T')[0];
    var disposition = 'attachment; filename=surveys_' + iso_date + '.csv';
    res.writeHead(200, {'Content-Type': 'text/csv', 'Content-Disposition': disposition});
  }
  else {
    res.writeHead(200, {'Content-Type': 'text/plain'});
  }

  // {peek: 256} means hold up to the first 256 rows to determine columns before responding with any
  var csv = new sv.Stringifier({peek: 256});

  var now = Date.now();

  // maybe use pg-cursor ? https://github.com/brianc/node-pg-cursor
  select.orderBy('user_id ASC').execute(db, function(err, rows) {
    if (err) return res.die(500, 'Database error: ' + err.toString());

    /** responses table:

        id
        user_id
        experiment_id
        stimulus_id
        value
        details
        created

    we want to cross multiply user fields (like demographics) across each response in user.responses
    todo: aggregate and clean up user_demographics

    */
    rows.forEach(function(row) {
      var item = _.omit(row, 'details');
      _.extend(item, row.details);

      for (var key in item) {
        // normalize data types
        var value = item[key];
        if (!isNaN(value)) {
          value = Number(value);
          if (Math.abs(now - value) < (year_milliseconds * 10)) {
            // values is epoch ticks within 10 years of today: convert to Date
            value = format_date(new Date(value));
          }
          item[key] = value;
        }
        // else if (Array.isArray(response[key])) {
        //   response[key] = response[key].join(',').trim();
        // }
      }

      // finally, extend the response with all the user data.
      // _.extend(response, user.demographics);
      csv.write(item);
    });
    csv.end();
  });

  csv.pipe(res);
};

var responses_json = function(req, res, select) {
  async.auto({
    rows: function(callback) {
      select.orderBy('id DESC').limit(100).execute(db, callback);
    },
    total: function(callback) {
      select.addColumns('COUNT(id)').execute(db, function(err, rows) {
        callback(err, err || rows[0].count);
      });
    }
  }, function(err, results) {
    if (err) return res.die('Database error: ' + err.toString());

    res.json(results);
  });
};

/** GET /admin/responses

Optional querystring args:
  experiment_id
  stimulus_id
  value

*/
R.get(/^\/admin\/responses\.(\w+)/, function(req, res, m) {
  var params = url.parse(req.url, true).query;

  var select = new sqlcmd.Select({table: 'responses'})
    .whereIf('experiment_id = ?', params.experiment_id);

  // both stimulus and value have to be given in order to filter by user
  if (params.stimulus_id && params.value) {
    select = select.where('user_id IN (SELECT user_id FROM responses WHERE stimulus_id = ? AND value = ?)',
      params.stimulus_id, params.value);
  }

  if (m[1] == 'json') {
    responses_json(req, res, select);
  }
  else if (m[1] == 'csv') {
    responses_csv(req, res, select);
  }
  else {
    res.die(404, 'Unsupported response type: ' + m[1]);
  }
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
