var fs = require('fs'),
  path = require('path'),
  http = require('http'),
  models = require('./models'),
  amulet = require('amulet'),
  Cookies = require('cookies'),
  wrappers = require('wrappers'),
  argv = require('optimist').argv,
  port = argv.port || 1301,
  surveys = {};

// process.env.NODE_PATH = __dirname;
// console.log('require.paths', process.env.NODE_PATH);

amulet.set({minify: true, root: __dirname});

Cookies.prototype.defaults = function() {
  var now = new Date(),
    expires = now.addDays(31);
  return { expires: expires, httpOnly: false };
};

fs.readdir(path.join(__dirname, 'surveys'), function(err, survey_paths) {
  survey_paths.forEach(function(survey_path) {
    if (survey_path[0] !== '.') {
      try {
        surveys[survey_path] = require(path.join(__dirname, 'surveys', survey_path));
        console.log("Loaded survey: " + survey_path);
      }
      catch (exc) {
        console.error("Couldn't load survey: " + survey_path + ".");
        throw exc;
        // console.dir(exc);
      }
    }
  });
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
    if (survey) {
      var ticket = req.cookies.get('ticket') || '';
      models.User.fromTicket(ticket.replace(/\W/g, ''), function(user) {
        survey(req, res, m[3] || '', user);
      });
    }
    else {
      res.end('The ' + survey_name + ' survey cannot be found. Tell io@henrian.com');
    }
  }
  else {
    wrappers.http.redirectTo(res, '/ptct/');
  }
}).listen(port, '127.0.0.1');
console.log('DRAGS server running at localhost:' + port);
