var logger = require('loge');
var sqlcmd = require('sqlcmd');

// the host value just has to be there and start with a /
module.exports = new sqlcmd.Connection({
  host: '/tmp',
  database: process.env.database,
  user: process.env.USER,
});
