var fs = require('fs');
var path = require('path');
var http = require('http');
var models = require('./models');
var amulet = require('amulet');
var winston = require('winston');
var Cookies = require('cookies');
var Router = require('regex-router');
var csv = require('csv');

function contains(haystack, needle) {
  return haystack.indexOf(needle) > -1;
}

var demo_fields = [
  'administrator_code',
  'age_of_first_and_continued_exposure_to_asl',
  'age_of_first_and_continued_exposure_to_asl_unknown',
  'child_code',
  'deaf_signers_in_home',
  'diagnoses',
  'diagnoses_other_cognitive',
  'diagnoses_other_language',
  'dob',
  'hearing',
  'language_used_in_home',
  'sex',
  'todays_date'
];
var stim_fields = [
  'stimulus_id',
  'time_since_choices_shown',
  'time_choices_shown',
  'time_stimulus_completed',
  'time_choice_selected',
  'created',
  'user_id',
  'value',
  'correct'
];
var time_fields = [
  'created',
  'time_choices_shown',
  'time_stimulus_completed',
  'time_choice_selected'
];

var design = {};
['ptct-a', 'ptct-b', 'ptct-c'].forEach(function(survey_name) {
  var design_csv_path = path.join(__dirname, 'surveys', survey_name, 'design.csv');
  csv().from.path(design_csv_path, {columns: true}).on('data', function(row, index) {
    // some row might be 'a10','Question 8','wi-c1','c-wi0','c-wo135','wo-c270','wi-c225','d'
    design[row.id] = row;
  });
});

var R = new Router();
R.default = function(m, req, res) {
  // req.user is already set

  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.end('nothing here');
};

R.get(/\/admin\/results.csv/, function(m, req, res) {
  var iso_date = new Date().toISOString().split('T')[0];
  var disposition = 'attachment; filename=all_surveys_' + iso_date + '.csv';
  res.writeHead(200, {'Content-Type': 'text/csv', 'Content-Disposition': disposition});

  var csv_writer = csv().to.stream(res);
  // csv_writer.writerow(STIM_KEYS + DEMO_KEYS)
  models.User.find({active: true}).stream().on('data', function (user) {
    var demographics = {};
    var responses = [];
    // .find({'user_id': user_doc['_id']}).sort([('stimulus_id', pymongo.ASCENDING)]):
    user.responses.forEach(function(response) {
      var stimulus_id = response.stimulus_id;
      var value = response.value;
      if (contains(demo_fields, stimulus_id)) {
        if (Array.isArray(value)) value = value.join(' ').trim();
        if (value === undefined) value = '';
        demographics[stimulus_id] = value;
      }
      else {
        if (contains(time_fields, stimulus_id))
          value = new Date(value).toISOString().replace('T', ' ').replace('Z', '');
        if (response.time_choice_selected && response.time_choices_shown)
          response.time_since_choices_shown = response.time_choice_selected - response.time_choices_shown;
        var stimulus = design[stimulus_id];
        response.correct = stimulus.correct.toUpperCase();

        responses.append(response);
      }
    });

    responses.forEach(function(response) {
      var cells = demo_fields.map(function(demo_field) {
        return demographics[demo_field] || '';
      });
      cells.concat(stim_fields.map(function(stim_field) {
        return response[stim_field] || '';
      }));
      csv_writer.write(cells);
    });

  }).on('error', function (err) {
    console.error(err);
  }).on('close', function () {
    csv_writer.end();
  });
});
