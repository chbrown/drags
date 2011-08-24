var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    http = require('http'),
    mongodb = require('mongodb'),
    mongo_helpers = require('./lib/mongo_helpers'),
    Cookies = require('cookies'),
    amulet = require('amulet'); 
require('./lib/basic');
require('./lib/date');

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
var pctc_files = {
  a: [
    ["a01", "a/fo-w.m4v", "w-fo(ego).jpg" , "fo-w0.jpg"     , "fi-w225.jpg"   , "w-fi135.jpg"   , "b" ],
    ["a02", "a/f-co.m4v", "ci-f135.jpg"   , "co-f180.jpg"   , "f-co45.jpg"    , "f-ci270.jpg"   , "c" ],
    ["a03", "a/wi-c.m4v", "c-wi180.jpg"   , "wo-c135.jpg"   , "wi-c45.jpg"    , "c-wo270.jpg"   , "c" ],
    ["a04", "a/do-w.m4v", "di-w315.jpg"   , "w-do180.jpg"   , "w-di270.jpg"   , "do-w45.jpg"    , "d" ],
    ["a05", "a/w-di.m4v", "w-do225.jpg"   , "di-w(ego).jpg" , "do-w135.jpg"   , "w-di0.jpg"     , "d" ],
    ["a06", "a/d-wo.m4v", "wi-d225.jpg"   , "wo-d(ego).jpg" , "d-wo0.jpg"     , "d-wi135.jpg"   , "c" ],
    ["a07", "a/wo-d.m4v", "wo-d135.jpg"   , "wi-d270.jpg"   , "d-wi225.jpg"   , "do-w(ego).jpg" , "a" ],
    ["a08", "a/d-wi.m4v", "wo-d180.jpg"   , "d-wi270.jpg"   , "wi-d315.jpg"   , "d-wo135.jpg"   , "b" ],
    ["a09", "a/do-c.m4v", "di-c135.jpg"   , "c-do315.jpg"   , "c-di270.jpg"   , "do-c180.jpg"   , "d" ],
    ["a10", "a/wi-c.m4v", "c-wi(ego).jpg" , "c-wo135.jpg"   , "wo-c90.jpg"    , "wi-c225.jpg"   , "d" ],
    ["a11", "a/co-d.m4v", "ci-d45.jpg"    , "co-d90.jpg"    , "d-co(ego).jpg" , "d-ci270.jpg"   , "b" ],
    ["a12", "a/w-do.m4v", "w-di270.jpg"   , "di-w315.jpg"   , "w-do270.jpg"   , "do-w(ego).jpg" , "c" ],
    ["a13", "a/ci-w.m4v", "ci-w135.jpg"   , "w-co90.jpg"    , "co-w315.jpg"   , "w-ci0.jpg"     , "a" ],
    ["a14", "a/w-do.m4v", "di-w135.jpg"   , "w-do315.jpg"   , "do-w0.jpg"     , "w-di90.jpg"    , "b" ],
    ["a15", "a/c-di.m4v", "c-do225.jpg"   , "di-c90.jpg"    , "c-di0.jpg"     , "do-c225.jpg"   , "c" ],
    ["a16", "a/w-co.m4v", "w-ci225.jpg"   , "co-w0.jpg"     , "ci-w225.jpg"   , "w-co90.jpg"    , "d" ],
    ["a17", "a/c-di.m4v", "c-do180.jpg"   , "c-di315.jpg"   , "di-c(ego).jpg" , "do-c45.jpg"    , "b" ],
    ["a18", "a/w-ci.m4v", "w-ci45.jpg"    , "ci-w(ego).jpg" , "co-w180.jpg"   , "w-co315.jpg"   , "a" ],
    ["a19", "a/c-wo.m4v", "c-wi180.jpg"   , "wi-c225.jpg"   , "c-wo225.jpg"   , "wo-c90.jpg"    , "c" ],
    ["a20", "a/di-w.m4v", "w-do225.jpg"   , "di-w225.jpg"   , "w-di90.jpg"    , "do-w0.jpg"     , "b" ],
    ["a21", "a/wi-d.m4v", "wi-d180.jpg"   , "d-wo180.jpg"   , "d-wi(ego).jpg" , "wo-d315.jpg"   , "a" ],
    ["a22", "a/di-c.m4v", "c-di(ego).jpg" , "do-c45.jpg"    , "c-do180.jpg"   , "di-c180.jpg"   , "d" ]
  ],
  b: [
    ["b01" , "b/wi-f.m4v" , "f-wi0.jpg"   , "f-wo135.jpg" , "wi-f45.jpg"  , "wo-f90.jpg"  , "c"],
    ["b02" , "b/c-fi.m4v" , "c-fi180.jpg" , "c-fo45.jpg"  , "fi-c0.jpg"   , "fo-c225.jpg" , "a"],
    ["b03" , "b/ci-d.m4v" , "d-co0.jpg"   , "d-ci315.jpg" , "ci-d45.jpg"  , "co-d90.jpg"  , "c"],
    ["b04" , "b/do-w.m4v" , "di-w45.jpg"  , "w-di315.jpg" , "do-w180.jpg" , "w-do0.jpg"   , "c"],
    ["b05" , "b/co-w.m4v" , "w-co0.jpg"   , "ci-w315.jpg" , "w-ci45.jpg"  , "co-w180.jpg" , "d"],
    ["b06" , "b/wi-d.m4v" , "d-wi315.jpg" , "wi-d45.jpg"  , "d-wo90.jpg"  , "wo-d0.jpg"   , "b"],
    ["b07" , "b/w-ci.m4v" , "co-w0.jpg"   , "w-co90.jpg"  , "ci-w135.jpg" , "w-ci225.jpg" , "d"],
    ["b08" , "b/c-di.m4v" , "c-do90.jpg"  , "di-c315.jpg" , "c-di0.jpg"   , "do-c135.jpg" , "c"],
    ["b09" , "b/co-d.m4v" , "co-d135.jpg" , "d-co225.jpg" , "d-ci270.jpg" , "ci-d0.jpg"   , "a"],
    ["b10" , "b/wo-d.m4v" , "d-wi0.jpg"   , "d-wo315.jpg" , "wo-d90.jpg"  , "wi-d135.jpg" , "c"],
    ["b11" , "b/c-do.m4v" , "c-di270.jpg" , "do-c180.jpg" , "di-c135.jpg" , "c-do315.jpg" , "d"],
    ["b12" , "b/w-di.m4v" , "w-do0.jpg"   , "w-di90.jpg"  , "di-w270.jpg" , "do-w225.jpg" , "b"],
    ["b13" , "b/ci-w.m4v" , "w-co270.jpg" , "ci-w135.jpg" , "co-w315.jpg" , "w-ci180.jpg" , "b"],
    ["b14" , "b/wo-c.m4v" , "wi-c90.jpg"  , "wo-c270.jpg" , "c-wo135.jpg" , "c-wi0.jpg"   , "b"],
    ["b15" , "b/do-c.m4v" , "di-c0.jpg"   , "do-c45.jpg"  , "c-do315.jpg" , "c-di0.jpg"   , "b"],
    ["b16" , "b/wo-c.m4v" , "wo-c180.jpg" , "c-wi270.jpg" , "c-wo225.jpg" , "wi-c225.jpg" , "a"],
    ["b17" , "b/d-wi.m4v" , "wi-d225.jpg" , "d-wo225.jpg" , "d-wi225.jpg" , "wo-d180.jpg" , "c"],
    ["b18" , "b/di-w.m4v" , "w-do0.jpg"   , "do-w45.jpg"  , "w-di0.jpg"   , "di-w315.jpg" , "d"],
    ["b19" , "b/w-do.m4v" , "w-do0.jpg"   , "do-w0.jpg"   , "w-di45.jpg"  , "di-w0.jpg"   , "a"],
    ["b20" , "b/d-wo.m4v" , "wi-d225.jpg" , "d-wo225.jpg" , "wo-d270.jpg" , "d-wi180.jpg" , "b"],
    ["b21" , "b/d-ci.m4v" , "co-d270.jpg" , "ci-d180.jpg" , "d-co225.jpg" , "d-ci225.jpg" , "d"],
    ["b22" , "b/wi-c.m4v" , "wi-c0.jpg"   , "wo-c0.jpg"   , "c-wo0.jpg"   , "c-wi315.jpg" , "a"]
  ]
};

function array_to_obj(arr, keys) {
  var obj = {};
  keys.forEach(function(key, i) {
    obj[key] = arr[i];
  });
  return obj;
}

var base_url = '/surveys/pctc/',
    pctc_stimuli_sets = {a: [], b: []};
['a', 'b'].forEach(function(a_or_b) {
  // console.log(Array.isArray(pctc_files[a_or_b]));
  pctc_files[a_or_b].forEach(function(arr, index) {
    var stimulus = array_to_obj(arr, ['id', 'stimulus', 'a', 'b', 'c', 'd', 'correct']);
    stimulus.stimulus = base_url + stimulus.stimulus;
    ['a', 'b', 'c', 'd'].forEach(function(url_key) {
      stimulus[url_key] = base_url + 'images/' + stimulus[url_key];
    });
    pctc_stimuli_sets[a_or_b].push(stimulus);
  });
});
console.log("Loading " + (pctc_stimuli_sets.a.length + pctc_stimuli_sets.b.length) + " stimuli"); 


// function pctc_advance_state(state) {
      // return state;
// }

/* pctc_responses => [{ // should id be its own collection? or just in the responses collection, with an additional survey: 'pctc' field?
  _id: ObjectId,
  user_id: ObjectId,
  value: String,
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
    var full = true, // @full: by default, we want fully laid-out responses
      m, // @m: for regex matches, later on
      state = {
        label: req.cookies.get('label'),
        index: req.cookies.get('index'),
        version: req.cookies.get('version'),
        user_id: user_id 
      },
      pctc_stimuli;
      
    // initializations:
    if (state.label === undefined) {
      state.label = 'intro';
      req.cookies.set('label', state.label);
    }
    if (state.index === undefined) {
      state.index = '0'; // for some reason, needs to be string. I understand, I guess. Fix in Cookies?
      req.cookies.set('index', state.index);
    }
    if (state.version === undefined) {
      state.version = ['a', 'b'][Math.round(Math.random())];
      req.cookies.set('version', state.version);
    }
    
    pctc_stimuli = pctc_stimuli_sets[state.version];
    console.log(pctc_stimuli);
    console.log(state.version);
    
    if (m = req.url.match(/next\.json$/)) {

      // ADVANCE!
      // state = pctc_advance_state(state);
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

      // the state probably changed in the transducer, so we save the new values
      req.cookies.set('label', state.label);
      req.cookies.set('index', state.index);
      
      // fork off to submit payload (always responses?)
      waitUntilComplete(req, function() {
        var payload = JSON.parseWithDefault(req.data, {});
        if (payload.responses) {
          var response_docs = payload.responses.map(function(raw_response) {
            var response = { user_id: user_id, created: new Date() }, key;
            for (key in raw_response) {
              response[key] = key.match(/^time/) ? parseInt(raw_response[key]) : raw_response[key].toString();
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
    
    var pctc_templates_root = 'surveys/pctc/templates', context;
    if (req.url === 'results?pass=LUam6R4v368UAR') {
      mongo.findAll('pctc_responses', {}, {}, function(err, documents) {
        // console.log(documents.length, documents);
        var responses = documents.map(function(d) {
          var response = {
            time_since_end_of_video: (d.time_choice_selected - d.time_stimulus_completed),
            time_since_choices_shown: (d.time_choice_selected - d.time_choices_shown),
            value: d.value,
            user_id: d.user_id,
            stimulus_id: d.stimulus_id
          };
          // console.log('typeof: ', typeof d.created);
          if (d.created) {
            response.created = d.created.format("mm/dd/yyyy h:MM:ss TT");
          }
          return response;
        });
        context = {responses: responses};
        
        var layout_path = pctc_templates_root + '/layout.mu';
        var results_path = pctc_templates_root + '/results.mu';
        addHtmlHead(res);
        amulet.render([layout_path, results_path], context, res);
      });
    }
    else {
  
      var label_path = pctc_templates_root + '/' + state.label + '.mu';
  
      context = {stimuli: pctc_stimuli, user_id: state.user_id};
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
        // if the format requested is .json, send back just the content, not a whole layout.
        amulet.renderString([label_path], context, function(err, html) {
          writeJson(res, {success: true, html: html}); // state: state, 
        });
      }
    }
  });
}

function router(req, res) {
  req.data = '';
  req.on('data', function(chunk) { req.data += chunk; });
  req.ip = req.headers['x-real-ip'] || req.client.remoteAddress;
  req.cookies = new Cookies(req, res);
  res.setHeader("content-type", "text/html;charset=utf-8");

  console.log("Routing: " + req.url);

  var m = null;
  if (m = req.url.match(/^\/([^\/]+)(\/(.*))?$/)) {
    req.url = m[3] || '';
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
