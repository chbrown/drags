exports.addTextHead = function(res) {
  res.writeHead(200, {"Content-Type": "text/plain"});
  return res;
};

exports.redirectTo = function(res, url) {
  res.writeHead(307, {"Location": url});
  res.end();
};

exports.addHtmlHead = function(res) {
  res.writeHead(200, {"Content-Type": "text/html"});
  return res;
};

exports.writeJson = function(res, obj) {
  res.writeHead(200, {"Content-Type": "application/json"});
  res.end(JSON.stringify(obj));
};

exports.waitUntilComplete = function(req, callback) {
  // ALWAYS async
  // callback signature: function()
  if (!req.complete) {
    req.on('end', callback);
  }
  else {
    process.nextTick(callback);
  }
};
