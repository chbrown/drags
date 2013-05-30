'use strict'; /*jslint node: true, es5: true, indent: 2 */
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var http = require('http');
var amulet = require('amulet');
var Router = require('regex-router');
var sv = require('sv');
// var Cookies = require('cookies');
var logger = require('./logger');
var models = require('./models');

// var zz_design = {};
// ['ptct-a', 'ptct-b', 'ptct-c'].forEach(function(survey_name) {
//   var design_csv_path = path.join(__dirname, 'surveys', survey_name, 'design.csv');
//   fs.exists(design_csv_path, function (exists) {
//     if (exists) {
//       csv().from.path(design_csv_path, {columns: true}).on('data', function(row, index) {
//         // some row might be 'a10','Question 8','wi-c1','c-wi0','c-wo135','wo-c270','wi-c225','d'
//         zz_design[row.id] = row;
//       });
//     }
//   });
// });

var auth_R = new Router();

auth_R.get(/\/admin\/results.csv/, function(m, req, res) {
  // console.log("results.csv");
  var iso_date = new Date().toISOString().split('T')[0];
  // var disposition = 'attachment; filename=all_surveys_' + iso_date + '.csv';
  // res.writeHead(200, {'Content-Type': 'text/csv', 'Content-Disposition': disposition});
  // debug:
  res.writeHead(200, {'Content-Type': 'text/plain'});


  var csv = new sv.Stringifier({peek: 100});
  csv.pipe(res);
  var query = {'demographics': {$exists: true}}; // {active: true};
  models.User.find(query).stream().on('data', function (user) {
    // we cross multiply user fields (like demographics) across each response in user.responses
    // the `user_demographics` variable refers to that list, minus the responses
    var user_object = user.toObject();
    // console.log(user);
    // var user_demographics = _.omit(user.demographics, 'responses');
    // todo: clean up user_demographics ??
    user.responses.forEach(function(response) {
      // var obj = response.toObject();
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
        else if (_.isArray(response[key])) {
          response[key] = response[key].join(',').trim();
        }
      }

      // finally, extend the response with all the user data.
      _.extend(response, user.demographics);
      csv.write(response);
    });
  }).on('error', function (err) {
    logger.error(err);
  }).on('close', function () {
    logger.info('User stream closed.');
    res.end();
  });
});

auth_R.get(/\/admin/, function(m, req, res) {
  res.text('Oh, hello.');
});

auth_R.default = function(m, req, res) {
  res.redirect('/admin');
};

exports.route = function(req, res) {
  // req.user is already set
  var username = req.cookies.get('username');
  var password = req.cookies.get('password');

  if (username == 'superuser' && password == 'OKCAfdt0SQr7') {
    auth_R.route(req, res);
  }
  else if (req.url.match(/OKCAfdt0SQr7/)) {
    auth_R.route(req, res);
  }
  else {
    res.writeHead(403, {'Content-Type': 'text/plain'});
    res.end('You must needs login before accessing this part of the site.');
  }
};
