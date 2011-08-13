// `npm install pg cookies formidable hashlib`
// Mu (git://github.com/chbrown/mu.git)
var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    http = require('http'),
    hashlib = require('hashlib'),
    pg = require('pg'), // npm install pg
    // formidable = require('formidable'),
    Cookies = require('cookies'), // npm install http://github.com/chbrown/cookies/tarball/master
    amulet = require('amulet'); // npm install http://github.com/chbrown/amulet/tarball/master
require('./lib/basic');
amulet.root(path.join(__dirname));
Cookies.defaults = function() {
  return { expires: new Date().addDays(31), httpOnly: false };
};

// var repl = require('repl')

// ARGV[0] is "node" and [1] is the name of this script and [2] is the name of the first command line argument
var config_file = (process.ARGV[2] && process.ARGV[2].substr(-5) == '.json') ? process.ARGV[2] : 'config.json';
var CONFIG = JSON.parse(fs.readFileSync(config_file));
console.inspect = function (x) { return console.log(util.inspect(x, false, null)); };
var ALPHADEC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');


function querySql(sql, args, callback, client) {
  if (client === undefined) {
    pg.connect(CONFIG.database, function(err, client) {
      if (err) console.log(err);
      client.query(sql, args, function(err, result) {
        if (err) console.log(err);
        if (callback) callback(result, client);
      });
    });
  }
  else {
    client.query(sql, args, function(err, result) {
      if (err) console.log(err);
      if (callback) callback(result, client);
    });
  }
}
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
  return res;
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
    process.nextTick(callback(req.data));
  }
}
  
function _createUser(ip, user_agent, cookies, callback) {
  querySql("INSERT INTO users DEFAULT VALUES RETURNING id", [], function(user_id_result, client) {
    var user_id = user_id_result.rows[0].id;
    var ticket_name = ALPHADEC.sample(32);
    // let the rest branch off ...
    querySql("INSERT INTO tickets (user_id, name) VALUES ($1, $2) RETURNING id", [user_id, ticket_name], function(ticket_id_result) {
      var ticket_id = ticket_id_result.rows[0].id;
      querySql("INSERT INTO locations (ticket_id, ip, user_agent) VALUES ($1, $2, $3)", 
        [ticket_id, ip, user_agent], function() { 
          // don't need to do anything
      }, client);
    }, client);
    // ... all we need is the user_id
    cookies.set('ticket', ticket_name);
    // cookies.set('action', 'intro')
    // cookies.set('remaining', '')
    // cookies.set('heard', 'false')
    callback(undefined, user_id);
  });
}
function _getUserForKey(ip, user_agent, cookies, callback) {
  var ticket_name = cookies.get('ticket');
  // ip, user_agent aren't used unless the user has a different ip than last time
  querySql("SELECT id, user_id FROM tickets WHERE tickets.name = $1", [ticket_name], function(ticket_id_results, client) {
    var ticket_id_result = ticket_id_results.rows[0];
    if (ticket_id_result) {
      var ticket_id = ticket_id_result.id;
      var user_id = ticket_id_result.user_id;
      querySql("SELECT ip FROM locations WHERE ticket_id = $1 ORDER BY created DESC",
          [ticket_id], function(location_ip_results) {
        var location_ip_result = location_ip_results.rows[0];
        if (location_ip_result && location_ip_result.ip != ip) {
          querySql("INSERT INTO locations (ticket_id, ip, user_agent) VALUES ($1, $2, $3)", 
            [ticket_id, ip, user_agent], function() { 
              // don't need to do anything
          }, client);
        }
      }, client);
      callback(undefined, user_id);
    }
    else {
      // reassign a ticket, since that one is not in the database
      console.log("Creating new user because the ticket is bad:", ticket_name);
      _createUser(ip, user_agent, cookies, callback);
    }
  });
}
function _getUserIdFromRequest(req, res, cookies, callback) {
  // callback signature = (err, user_id)
  var ticket_cookie = cookies.get('ticket');
  if (ticket_cookie) {
    return _getUserForKey(req.ip, req.headers['user-agent'], cookies, callback);
  }
  return _createUser(req.ip, req.headers['user-agent'], cookies, callback);
}
// function _getCookieWithDefault(cookies, name, default_value, cookie_options) {
//   var cookie_value = cookies.get(name)
//   // console.log("cookies[" + name + "] = " + cookie_value)
//   if (!cookie_value) {
//     cookies.set(name, default_value, cookie_options)
//     console.log("cookies[" + name + "] <- " + default_value)
//     return default_value
//   }
//   return cookie_value
// }






var pctc_stimuli = [
  {'Stimulus': 'Practice 1.m4v', 'A': 'f-wi0.jpg', 'C': 'wi-f45.jpg', 'B': 'f-wo135.jpg', 'D': 'wo-f90.jpg'}, 
  {'Stimulus': 'Practice 2.m4v', 'A': 'c-fi180.jpg', 'C': 'fi-c0.jpg', 'B': 'c-fo45.jpg', 'D': 'fo-c225.jpg'}, 
  {'Stimulus': 'Item 1.m4v', 'A': 'd-co0.jpg', 'C': 'ci-d45.jpg', 'B': 'd-ci315.jpg', 'D': 'co-d90.jpg'}
];

// var pctc = {
//   intro: function(layout) {
//     if (layout === undefined) { layout = false; }
// 
//     layout
//   },
// }

function pctc_transducer(state) {
  if (state.label == 'zero') {
    state.label = 'intro';
  }
  else if (state.label == 'intro') {
    state.label = 'instructions';
  }
  else if (input == 'instructions') {
    state.label = 'show_video';
  }
  else if (input == 'show_video') { // this might be merged out.
    state.index++;
    state.label = 'show_choices';
  }
  else if (input == 'show_choices') {
    if (state.index > pctc_stimuli.length) { // pctc_stimuli.length == 12?
      state.label = 'end';
    }
    else {
      state.label = 'show_video';
    }
  }
  return state;
}

function pctc_router(req, res) {
  // this converts a state (in the cookies of a user)
  // into a new action
  var cookies = new Cookies(req, res);
  _getUserIdFromRequest(req, res, cookies, function(err, user_id) {
    if (err) { console.log(err); }
    var state = {
      action: (cookies.get('action') || 'zero'),
      index: (cookies.get('index') || 0),
      user_id: user_id
    };
    
    var m = null;
    if (m = req.url.match(/next.json$/)) {
      // if the format requested is .json, send back just the content, not a whole layout.
      // if (m[1]) { }
      state = pctc_transducer(state);
      
      // branch off to submit payload (always responses?)
      waitUntilComplete(req, function() {
        var payload = JSON.parseWithDefault(req.data, {});
          // payload = { responses: 
          //   [ { stimulus_id: 85, total_time: 58987, value: 'ERT' (, sureness: 100) }, ...
        payload.responses.forEach(function(response) {
          if (response.sureness === undefined) { response.sureness = null; }
          if (response.total_time === undefined) { response.total_time = -1; }
          if (response.value === undefined) { response.value = ''; }
          if (response.details === undefined) { response.details = ''; }
          querySql("INSERT INTO responses (user_id, stimulus_id, total_time, sureness, value, details) \
            VALUES ($1, $2, $3, $4, $5, $6);",
            [user_id, response.stimulus_id, response.total_time, 
              sureness, response.value, response.details]);
        });
      });
      
      html = mu.renderString();
      
      writeJson({success: true, html: html}); // state: state, 
    }
    else if (action == 'intro') {
      addHtmlHead(res);
      var context = {stimuli: pctc_stimuli, user_id: state.user_id};
      amulet.render(['layout.mu', 'intro_1.mu'], context, res);
    }
    else if (action == '') {
      // ...
    }
    else {
      // ...
    }
      
    
  });
}

function router(req, res) {
  req.data = '';
  req.on('data', function(chunk) { req.data += chunk; });
  req.ip = req.headers['x-real-ip'] || req.client.remoteAddress;

  console.log("Routing request: " + req.url);

  // if (m = req.url.match(/^\/api\/\d+\/(.+)$/)) {
  //   // discard the version, for now // console.log('API: ' + m[1])
  //   api(req, res, m[1])
  // }
  // else if (req.url.match(/^\/test$/)) {
  //   res.end(util.inspect(req, false, null));
  //   // console.log(req.headers['x-real-ip'])
  // }
  var m = null;
  if (m = req.url.match(/^\/([^\/]+)(\/(.*))?$/)) {
    req.url = m[3];
    if (m[1] === 'dichotic') {
      dichotic_router(req, res);
    }
    else if (m[1] === 'pctc') {
      pctc_router(req, res);
    }
    else {
      res.end('That survey cannot be found.');
    }
  }
  else {
    // addHtmlHead(res)
    redirectTo(res, '/pctc/');
    // res.writeHead(302, { 'Location': '/dichotic/'});
    // res.end();
    // res.end('Error: 404')
  }
}

http.createServer(router).listen(CONFIG.server.socket);
console.log('Server running at:', CONFIG.server.socket);
// http.createServer(router).listen(CONFIG.server.port, CONFIG.server.host)
// console.log('Server running at http://' + CONFIG.server.host + ':' + CONFIG.server.port + '/')

