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

_.keyed = function(list) {
  var obj = {};
  for (var i = 0, l = list.length; i < l; i++) obj[list[i]] = true;
  return obj;
};

_.mapValues = function(obj, func) {
  for (var key in obj) {
    obj[key] = func(obj[key]);
  }
  return obj;
};

var year_milliseconds = 365*24*60*60*1000;
// restart at least every five years or so
var epoch_range_start = Date.now() - (year_milliseconds * 10);
var epoch_range_end = Date.now() + (year_milliseconds * 10);

var R = new Router(function(req, res) {
  res.status(404).die('No resource at: ' + req.url);
});

R.any(/^\/admin\/users/, require('./users'));

R.get('/admin', function(req, res) {
  var ctx = {ticket_user: req.user};
  amulet.stream(['admin/layout.mu', 'admin/index.mu'], ctx).pipe(res);
});

R.get('/admin/responses/distinct-ids', function(req, res) {
  var select = db.Select('responses').orderBy('id');
  async.parallel([
    function(callback) {
      select.add('DISTINCT user_id AS id').execute(callback);
    },
    function(callback) {
      select.add('DISTINCT experiment_id AS id').execute(callback);
    },
    function(callback) {
      select.add('DISTINCT stimulus_id AS id').execute(callback);
    },
  ], function(err, results) {
    if (err) return res.die('/admin/responses/distinct-ids query error: ' + err.toString());
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
  if (!params.stimulus_id) return res.status(400).die('stimulus_id parameter is required');

  var select = db.Select('responses')
  .add('DISTINCT value')
  .whereEqual({stimulus_id: params.stimulus_id})
  .orderBy('value')
  .execute(function(err, rows) {
    if (err) return res.die('/admin/responses/values query error', err);
    var result = {
      values: _.pluck(rows, 'value'),
    };
    res.json(result);
  });
});

// R.get(/^\/admin\/incremental-filters/, function(req, res) {
//   var urlObj = url.parse(req.url, true);
//   var select = new db.Select('responses');
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
  return date.toISOString().replace(/T/, ' ').replace(/Z/, '');
};

var format_value = function(value) {
  // normalize data types
  if (!isNaN(value)) {
    var number = Number(value);
    if (epoch_range_start < number && number < epoch_range_end) {
      // if value within 10 years of today, convert to Date and then format
      return format_date(new Date(number));
    }
    return number;
  }
  else if (Array.isArray(value)) {
    return value.join(',');
  }
  return value;
};

var melted_responses_csv = function(rows, melt) {
  /**
  responses should be an array of
  melt should be a list of stimulus_id names
  */
  logger.info('Melting %d responses', rows.length);
  var csv = new sv.Stringifier({peek: 1000});
  var melt_lookup = _.keyed(melt);
  // users is a collection of objects, keyed by user_id, with a .responses field,
  // and then other values for the keys in `melt`
  var users = {};

  rows.forEach(function(row) {
    var user = users[row.user_id];
    if (!user) {
      user = users[row.user_id] = {responses: [], meta: {}};
    }

    // here's where the melt variables come in
    if (melt_lookup[row.stimulus_id]) {
      // ignore details for melted variables
      user.meta[row.stimulus_id] = row.value;
    }
    else {
      // var response = _.omit(row, 'details');
      var response = {
        response_id: row.id,
        experiment_id: row.experiment_id,
        user_id: row.user_id,
        stimulus_id: row.stimulus_id,
        value: row.value,
        created: row.created,
      };
      _.extend(response, row.details);
      _.mapValues(response, format_value);

      user.responses.push(response);
    }
  });

  // all the users[?].meta objects have been filled, now join:

  Object.keys(users).map(function(user_id) {
    var user = users[user_id];
    user.responses.forEach(function(response) {
      _.extend(response, user.meta);
      csv.write(response);
    });
  });
  csv.end();
  return csv;
};

var responses_csv = function(rows) {
  // {peek: 256} means hold up to the first 256 rows to determine columns before responding with any
  var csv = new sv.Stringifier({peek: 1000});
  // maybe use pg-cursor ? https://github.com/brianc/node-pg-cursor
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
      item[key] = format_value(item[key]);
    }
    csv.write(item);
  });
  csv.end();
  return csv;
};

/** GET /admin/responses

Optional querystring args:
  experiment_id (matches responses.experiment_id, a string or whatever)
  stimulus_id (use with value)
  value (use with experiment_id)
  download ("true" / "false", whether to trigger a download from the browser)
  melt (a list of strings)
    e.g., diagnoses_other_language,diagnoses_other_cognitive,diagnoses,language_used_in_home_other,language_used_in_home,deaf_signers_in_home,age_of_first_and_continued_exposure_to_asl,hearing,dob,sex,todays_date,child_code,administrator_code

*/
R.get(/^\/admin\/responses\.(\w+)/, function(req, res, m) {
  var params = url.parse(req.url, true).query;

  var select = db.Select('responses')
  .whereEqual({experiment_id: params.experiment_id});

  // both stimulus and value have to be given in order to filter by user
  logger.info('params', params);
  if (params.stimulus_id && params.value) {
    select = select.where('user_id IN (SELECT user_id FROM responses WHERE stimulus_id = ? AND value = ?)',
      params.stimulus_id, params.value);
  }

  if (m[1] == 'json') {
    async.auto({
      rows: function(callback) {
        select.orderBy('id DESC').limit(100).execute(callback);
      },
      total: function(callback) {
        select.add('COUNT(id)').execute(function(err, rows) {
          callback(err, err || rows[0].count);
        });
      }
    }, function(err, results) {
      if (err) return res.die('Database error: ' + err.toString());

      res.json(results);
    });
  }
  else if (m[1] == 'csv') {
    // call with ?download=false to view the resulting csv as text in the browser
    if (params.download == 'true') {
      var iso_date = new Date().toISOString().split('T')[0];
      var disposition = 'attachment; filename=surveys_' + iso_date + '.csv';
      res.writeHead(200, {'Content-Type': 'text/csv', 'Content-Disposition': disposition});
    }
    else {
      res.writeHead(200, {'Content-Type': 'text/plain'});
    }

    select.orderBy('user_id ASC').execute(function(err, rows) {
      if (err) return res.die('Database error: ' + err.toString());

      var csv_stream;
      if (params.melt) {
        csv_stream = melted_responses_csv(rows, params.melt.split(','));
      }
      else {
        csv_stream = responses_csv(rows);
      }
      csv_stream.pipe(res);
    });
  }
  else {
    res.status(404).die('Unsupported response type: ' + m[1]);
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
