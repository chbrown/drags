/*jslint node: true */
var path = require('path');
var logger = require('loge');
var send = require('send');

var static_root = path.join(__dirname, '..', 'static');

module.exports = function(req, res) {
  var path = req.url.slice(8); // since '/static/'.length == 8
  if (req.url == '/favicon.ico') {
    path = 'favicon.ico';
  }

  send(req, path)
    .root(static_root)
    .on('error', function(err) {
      logger.info('static.send error', err);
      res.die(err.status || 500, err.message);
    })
    .on('directory', function() {
      res.die(404, 'Cannot fetch static file: ' + req.url);
    })
    .pipe(res);
};
