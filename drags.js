var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    http = require('http'),
    mongodb = require('mongodb'),
    mongo_helpers = require('./lib/mongo_helpers'),
    Cookies = require('cookies'),
    amulet = require('amulet'); 
    http_helpers = require('./lib/http_helpers'); 
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

var surveys = { }, Survey;
fs.readdirSync(path.join(__dirname, 'surveys')).forEach(function(survey_path) {
  if (survey_path[0] !== '.') {
    try {
      Survey = require(path.join(__dirname, 'surveys', survey_path)).Survey;
      surveys[survey_path] = new Survey(_getUserIdFromRequest, mongo);
      console.log("Loaded survey: " + survey_path);
    }
    catch (e) {
      console.log("Couldn't load survey: " + survey_path);
    }
  }
});

function router(req, res) {
  req.data = '';
  req.on('data', function(chunk) { req.data += chunk; });
  req.ip = req.headers['x-real-ip'] || req.client.remoteAddress;
  req.cookies = new Cookies(req, res);
  res.setHeader("content-type", "text/html;charset=utf-8");

  console.log("Routing: " + req.url);

  var m = null, survey_name, survey;
  if (m = req.url.match(/^\/([^\/]+)(\/(.*))?$/)) {
    req.url = m[3] || '';

    survey_name = m[1];
    survey = surveys[survey_name];
    if (survey === undefined || survey.router === undefined) {
      res.end('The ' + survey_name + ' survey cannot be found. Tell io@henrian.com');
    }
    else {
      survey.router(req, res);
    }
  }
  else {
    http_helpers.redirectTo(res, '/pctc/');
  }
}

// http.createServer(router).listen(CONFIG.server.socket);
// console.log('Server running at:', CONFIG.server.socket);
http.createServer(router).listen(CONFIG.server.port, CONFIG.server.host);
console.log('DRAGS server running at http://' + CONFIG.server.host + ':' + CONFIG.server.port + '/');


// process.on('uncaughtException', function (err) {
//   // // Log it! // 
//   console.dir(err);
//   // // Make sure you still exit. // 
//   process.exit(1);
// });
