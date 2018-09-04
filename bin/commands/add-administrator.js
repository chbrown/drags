var logger = require('loge');

var db = require('../../lib/db');
var models = require('../../lib/models');


module.exports = function(argv) {
  models.User.create(function(err, user) {
    if (err) return logger.error(err);

    db.Update('users')
    .set({
      email: argv._[1],
      password: argv._[2],
      administrator: true,
    })
    .whereEqual({id: user.id})
    .execute(function(err) {
      logger.error(err);
    });
  });
};
