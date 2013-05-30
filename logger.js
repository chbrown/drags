'use strict'; /*jslint node: true, es5: true, indent: 2 */
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
