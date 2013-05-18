'use strict'; /*jslint nomen: true, node: true, indent: 2, debug: true, vars: true, es5: true */
var winston = require('winston');

var logger = module.exports = new winston.Logger({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({filename: '/usr/local/var/log/drags.log'})
  ]
});

// `maybe` only logs truthy errors
logger.maybe = function (err) {
  if (err) logger.error(err);
};
