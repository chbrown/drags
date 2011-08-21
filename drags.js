var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    http = require('http'),
    mongodb = require('mongodb'),
    mongo_helpers = require('./lib/mongo_helpers'),
    Cookies = require('cookies'),
    amulet = require('amulet'); 
require('./lib/basic');

// ARGV[0] is "node" and [1] is the name of this script and [2] is the name of the first command line argument
var config_file = (process.ARGV[2] && process.ARGV[2].substr(-5) == '.json') ? process.ARGV[2] : 'config.json';
var CONFIG = JSON.parse(fs.readFileSync(config_file));
console.inspect = function (x) { return console.log(util.inspect(x, false, null)); };
var ALPHADEC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

amulet.root(path.join(__dirname), false); // false means: don't autoparse everything in that directory

Cookies.prototype.defaults = function() {
  return { expires: new Date().addDays(31), httpOnly: false };
};

var mongo_server = new mongodb.Server(CONFIG.database.host, CONFIG.database.port, {});
var mongo_db = new mongodb.Db(CONFIG.database.db, mongo_server);
var mongo = new mongo_helpers.MongoHelpers();
mongo_db.open(function(err, client) {
  if (err) { throw err; }
  mongo.setClient(client);
});

function addHtmlHead(res) {
  res.writeHead(200, {"Content-Type": "text/html"});
  return res;
}
function addTextHead(res) {
  res.writeHead(200, {"Content-Type": "text/plain"});
  return res;
}
function redirectTo(res, url) {
  res.writeHead(307, {"Location": url});
  res.end();
}
function writeJson(res, obj) {
  res.writeHead(200, {"Content-Type": "application/json"});
  res.end(JSON.stringify(obj));
}
function waitUntilComplete(req, callback) {
  // ALWAYS async
  // callback signature: function()
  if (!req.complete) {
    req.on('end', callback);
  }
  else {
    process.nextTick(callback);
  }
}
  
function _createUser(ip, user_agent, cookies, callback) {
  var now = new Date();
  mongo.insert('users', {created: now}, {}, function(err, user_docs) {
    var ticket_key = ALPHADEC.sample(32).join('');
    mongo.insert('tickets', {user_id: user_docs[0]._id, key: ticket_key, created: now}, {}, function(err, ticket_docs) {
      mongo.insert('locations', {ticket_id: ticket_docs[0]._id, ip: ip, user_agent: user_agent, created: now}, {}, function() { });
    });
    cookies.set('ticket', ticket_key);
    callback(undefined, user_docs[0]._id);
  });
}
function _getUserForTicket(ip, user_agent, cookies, callback) {
  var ticket = cookies.get('ticket');
  // ip, user_agent aren't used unless the user has a different ip than last time
  return mongo.findFirst('tickets', {key: ticket}, {}, function(err, ticket_doc) {
    // var ticket_id_result = ticket_id_results.rows[0];
    if (ticket_doc) {
      var ticket_id = ticket_doc._id, user_id = ticket_doc.user_id;
      mongo.findFirst('locations', {ticket_id: ticket_id}, {sort: [['created', -1]]}, function(err, location_doc, locations_coll) {
        if (location_doc && location_doc.ip != ip) {
          locations_coll.insert({ticket_id: ticket_id, ip: ip, user_agent: user_agent, created: new Date()});
        }
      });
      return callback(undefined, user_id);
    }
    else {
      // reassign a ticket, since that one is not in the database
      console.log("Creating new user because the ticket is bad:", ticket);
      return _createUser(ip, user_agent, cookies, callback);
    }
  });
}
function _getUserIdFromRequest(req, res, callback) {
  // callback signature = (err, user_id)
  var ticket_cookie = req.cookies.get('ticket');
  if (ticket_cookie !== undefined) {
    return _getUserForTicket(req.ip, req.headers['user-agent'], req.cookies, callback);
  }
  return _createUser(req.ip, req.headers['user-agent'], req.cookies, callback);
}



// for line in s.split('\n'):
//   parts = line.split(';')
//   print '["' + '","'.join(parts) + '"],'

  // stimuli A B C D correct
var pctc_files = [
  ["wi-f","f-wi0","f-wo135","wi-f45","wo-f90","c"],
  ["c-fi","c-fi180","c-fo45","fi-c0","fo-c225","a"],
  ["ci-d","d-co0","d-ci315","ci-d45","co-d90","c"],
  ["do-w","di-w45","w-di315","do-w180","w-do0","c"],
  ["co-w","w-co0","ci-w315","w-ci45","co-w180","d"],
  ["wi-d","d-wi315","wi-d45","d-wo90","wo-d0","b"],
  ["w-ci","co-w0","w-co90","ci-w135","w-ci225","d"],
  ["c-di","c-do90","di-c315","c-di0","do-c135","c"],
  ["co-d","co-d135","d-co225","d-ci270","ci-d0","a"],
  ["wo-d","d-wi0","d-wo315","wo-d90","wi-d135","c"],
  ["c-do","c-di270","do-c180","di-c135","c-do315","d"],
  ["w-di","w-do0","w-di90","di-w270","do-w225","b"],
  ["ci-w","w-co270","ci-w135","co-w315","w-ci180","b"],
  ["wo-c","wi-c90","wo-c270","c-wo135","c-wi0","b"],
  ["do-c","di-c0","do-c45","c-do315","c-di0","b"],
  ["wo-c","wo-c180","c-wi270","c-wo225","wi-c225","a"],
  ["d-wi","wi-d225","d-wo225","d-wi225","wo-d180","c"],
  ["di-w","w-do0","do-w45","w-di0","di-w315","d"],
  ["w-do","w-do0","do-w0","w-di45","di-w0","a"],
  ["d-wo","wi-d225","d-wo225","wo-d270","d-wi180","b"],
  ["d-ci","co-d270","ci-d180","d-co225","d-ci225","d"],
  ["wi-c","wi-c0","wo-c0","c-wo0","c-wi315","a"]
];

var actual_files = ["c-wi.m4v", "c-wo.m4v", "ci-d.m4v", "ci-w.m4v", "co-d.m4v", "co-w.m4v", "d-ci.m4v", "d-co.m4v", "d-wi.m4v", "d-wo.m4v",
"f-co.m4v", "w-ci.m4v", "w-co.m4v", "w-di.m4v", "w-do.m4v", "w-fi.m4v", "w-fo.m4v", "wi-c.m4v", "wi-d.m4v", "wo-c.m4v",
"wo-d.m4v"];

var pctc_stimuli = [];
pctc_files.forEach(function(parts, index) {
  var base_url = '/surveys/pctc/';
  // for now, we only register stimuli that we have files for. hack because of bad data.
  if (actual_files.indexOf(parts[0] + '.m4v') > -1) {
    var stimulus = {
      id: index,
      stimulus: base_url + parts[0] + '.m4v',
      a: base_url + parts[1] + '.jpg',
      b: base_url + parts[2] + '.jpg',
      c: base_url + parts[3] + '.jpg',
      d: base_url + parts[4] + '.jpg',
      correct: parts[5]
    };
    pctc_stimuli.push(stimulus);
  }
});
console.log("Loading " + pctc_stimuli.length + " stimuli"); 


function pctc_advance_state(state) {
  console.log('Transducer BEGIN:', state);
  if (state.label == 'zero') {
    state.label = 'intro';
  }
  else if (state.label == 'intro') {
    state.label = 'instructions';
  }
  else if (state.label == 'instructions') {
    state.label = 'show_video';
  }
  else if (state.label == 'show_video') { // this might be merged out.
    state.label = 'show_choices';
  }
  else if (state.label == 'show_choices') {
    state.index++;
    if (state.index >= pctc_stimuli.length) {
      state.label = 'conclusion';
    }
    else {
      state.label = 'show_video';
    }
  }
  console.log('Transducer END:', state);
  return state;
}

/* pctc_responses => [{ // should id be its own collection? or just in the responses collection, with an additional survey: 'pctc' field?
  _id: ObjectId,
  user_id: ObjectId,
  time_stimulus_completed: Integer, // milliseconds
  time_choices_shown: Integer, // milliseconds
  time_choice_selected: Integer, // milliseconds
  created: Date,
}]
*/  
  

function pctc_router(req, res) {
  // this converts a state (in the cookies of a user) into some sort of response to res
  return _getUserIdFromRequest(req, res, function(err, user_id) {
    if (err) { console.log(err); }
    var state = { label: req.cookies.get('label'), index: req.cookies.get('index'), user_id: user_id };
    console.log(state);
    
    // initializations:
    if (state.label === undefined) {
      state.label = 'intro';
      req.cookies.set('label', state.label);
    }
    if (state.index === undefined) {
      state.index = '0'; // for some reason, needs to be string. I understand, I guess. Fix in Cookies?
      req.cookies.set('index', state.index);
    }
    
    var full = true;
    var m = null;
    if (m = req.url.match(/next.json$/)) {
      //
      // if the format requested is .json, send back just the content, not a whole layout.
      // if (m[1]) { }
      state = pctc_advance_state(state);
      // the state probably changed in the transducer, so we save the new values
      req.cookies.set('label', state.label);
      req.cookies.set('index', state.index);
      
      // fork off to submit payload (always responses?)
      waitUntilComplete(req, function() {
        var payload = JSON.parseWithDefault(req.data, {});
          // payload = { responses: 
          //   [ { stimulus_id: 85, total_time: 58987, value: 'ERT' (, sureness: 100) }, ...
        if (payload.responses) {
          var response_docs = payload.responses.map(function(raw_response) {
            // if (response.sureness === undefined) { response.sureness = null; }
            // if (response.total_time === undefined) { response.total_time = -1; }
            // if (response.value === undefined) { response.value = ''; }
            // if (response.details === undefined) { response.details = null; }
            // response.sureness,
              // stimulus_id: raw_response.stimulus_id.toString(),
              // value: raw_response.value.toString(),
              // total_time: response.total_time

            var response = { user_id: user_id, created: new Date() }, key;
            for (key in raw_response) {
              if (key.match(/^time/)) {
                response[key] = parseInt(raw_response[key]);
              }
              else {
                response[key] = raw_response[key].toString();
              }
            }
            delete response['toJsonString'];

            return response;
          });
          mongo.insert('pctc_responses', response_docs, {}, function() {});
        }
      });
      
      full = false;
    }
    
    // pctc_renderState(req, res, state, full);
    // if (full === undefined) { full = true; }
    // full is true if we want to render a whole page, with layout and everything,
    // and false if we just want to return a json response with the content html
  
    var pctc_templates_root = 'surveys/pctc/templates';
  
    var label_path = pctc_templates_root + '/' + state.label + '.mu';
  
    var context = {stimuli: pctc_stimuli, user_id: state.user_id};
    var stimulus = pctc_stimuli[state.index];

    if (state.label === 'show_video') {
      context['stimulus'] = stimulus;
    }
    if (state.label === 'show_choices') {
      context['id'] = stimulus.id;
    }
    if (state.label === 'show_video' || state.label === 'show_choices') {
      context['choices'] = ['a', 'b', 'c', 'd'].map(function(prop) {
        return {value: prop, url: stimulus[prop]};
      });
    }
    
    if (full) {
      addHtmlHead(res);
      var layout_path = pctc_templates_root + '/layout.mu';
      amulet.render([layout_path, label_path], context, res);
    }
    else {
      amulet.renderString([label_path], context, function(err, html) {
        writeJson(res, {success: true, html: html}); // state: state, 
      });
    }
  });
}

function router(req, res) {
  req.data = '';
  req.on('data', function(chunk) { req.data += chunk; });
  req.ip = req.headers['x-real-ip'] || req.client.remoteAddress;
  req.cookies = new Cookies(req, res);

  console.log("Routing: " + req.url);

  var m = null;
  if (m = req.url.match(/^\/([^\/]+)(\/(.*))?$/)) {
    req.url = m[3];
    if (m[1] === 'dichotic') {
      res.end('The dichotic survey needs some updating. Tell io@henrian.com');
      // dichotic_router(req, res);
    }
    else if (m[1] === 'pctc') {
      pctc_router(req, res);
    }
    else {
      res.end('That survey cannot be found.');
    }
  }
  else {
    redirectTo(res, '/pctc/');
  }
}

// http.createServer(router).listen(CONFIG.server.socket);
// console.log('Server running at:', CONFIG.server.socket);
http.createServer(router).listen(CONFIG.server.port, CONFIG.server.host);
console.log('Server running at http://' + CONFIG.server.host + ':' + CONFIG.server.port + '/');


// process.on('uncaughtException', function (err) {
//   // // Log it! // 
//   console.dir(err);
//   // // Make sure you still exit. // 
//   process.exit(1);
// });
