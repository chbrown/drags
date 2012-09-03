var fs = require('fs'),
  path = require('path'),
  http = require('http'),
  mongoose = require('mongoose'),
  amulet = require('amulet'),
  Cookies = require('cookies'),
  wrappers = require('wrappers'),
  argv = require('optimist').argv,
  port = argv.port || 1301,
  surveys = {};

amulet.set({minify: true, root: __dirname});

Cookies.prototype.defaults = function() {
  var now = new Date(),
    expires = now.addDays(31);
  return { expires: expires, httpOnly: false };
};

fs.readdir(path.join(__dirname, 'surveys'), function(err, survey_path) {
  if (survey_path[0] !== '.') {
    try {
      surveys[survey_path] = require(path.join(__dirname, 'surveys', survey_path));
      console.log("Loaded survey: " + survey_path);
    }
    catch (exc) {
      console.error("Couldn't load survey: " + survey_path + ".");
      console.dir(exc);
    }
  }
});

http.ServerResponse.prototype.json = function(obj) {
  this.writeHead(200, {"Content-Type": "application/json"});
  this.write(JSON.stringify(obj));
  this.end();
};
http.createServer(function(req, res) {
  req.data = '';
  req.on('data', function(chunk) { req.data += chunk; });
  req.cookies = new Cookies(req, res);

  var m = req.url.match(/^\/([^\/]+)(\/(.*))?$/);
  if (m) {
    var survey_name = m[1],
      survey = surveys[survey_name];
    if (survey === undefined || survey.router === undefined) {
      res.end('The ' + survey_name + ' survey cannot be found. Tell io@henrian.com');
    }
    else {
      var ticket = req.cookies.get('ticket').replace(/\W/g, '');
      User.fromTicket(ticket, function(user) {
        survey(req, res, m[3] || '', user);
      });
    }
  }
  else {
    wrappers.http.redirectTo(res, '/ptct/');
  }
}).listen(port, '127.0.0.1');
console.log('DRAGS server running at localhost:' + port);

Survey.prototype.route = function(req, res) {
  var self = this;
  if (req.user) {
    self.routeWithUser(req, res, req.user);
  }
  else {
    req.on('user', function(user) {
      self.routeWithUser(req, res, user);   
    });
  }
});

