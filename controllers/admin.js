'use strict'; /*jslint es5: true, node: true, indent: 2 */
var _ = require('underscore');
var sv = require('sv');
var Router = require('regex-router');

var logger = require('../lib/logger');
var models = require('../lib/models');
// var amulet = require('amulet');
// amulet.set({root: path.join(__dirname, '..', 'templates')}); // minify: true,

var R = new Router();

R.get(/\/admin\/results.csv/, function(req, res, m) {
  // console.log("results.csv");
  var iso_date = new Date().toISOString().split('T')[0];
  // var disposition = 'attachment; filename=all_surveys_' + iso_date + '.csv';
  // res.writeHead(200, {'Content-Type': 'text/csv', 'Content-Disposition': disposition});
  // debug:
  res.writeHead(200, {'Content-Type': 'text/plain'});


  var csv = new sv.Stringifier({peek: 100});
  csv.pipe(res);
  var query = {'demographics': {$exists: true}}; // {active: true};
  models.User.find(query).stream().on('data', function(user) {
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
  }).on('error', function(err) {
    logger.error(err);
  }).on('close', function() {
    logger.info('User stream closed.');
    res.end();
  });
});
R.get(/\/admin/, function(req, res) {
  res.text('Oh, hello.');
});
R.default = function(req, res) {
  res.redirect('/admin');
};

// just like a survey module, this exposes the same interface
module.exports = function(req, res) {
  // req.user is already set
  var username = req.cookies.get('username');
  var password = req.cookies.get('password');

  if (username == 'superuser' && password == 'OKCAfdt0SQr7') {
    R.route(req, res);
  }
  else if (req.url.match(/OKCAfdt0SQr7/)) {
    R.route(req, res);
  }
  else {
    res.die(403, 'You must login before accessing this part of the site.');
  }
};
