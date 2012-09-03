var mongoose = require('mongoose'),
  db = mongoose.createConnection('localhost', 'drags');

var user_schema = new mongoose.Schema({
  created: {type: Date, "default": Date.now},
  tickets: [String],
  responses: []
});

// sample response:
// {
//   "created" : ISODate("2011-09-14T14:18:58.566Z"),
//   "stimulus_id" : "a14",
//   "value" : "B",
//   "time_choices_shown" : NumberLong("1316009938229"),
//   "time_stimulus_completed" : NumberLong("1316009938134"),
//   "time_choice_selected" : NumberLong("1316009941441"),
//   "user_id" : ObjectId("4e70b413b364005b0a000007"),
//   "_id" : ObjectId("4e70b7d2b364005b0a000019")
// }

function alphaDecimal(length) {
  var store = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''), string = '';
  for (var i = 0; i < length; i++)
    string += store[(Math.random() * store.length) | 0];
  return string;
}

user_schema.statics.create = function(callback) {
  var user = new this({tickets: [alphaDecimal(32)]});
  user.save(function(err, user) {
    if (err) console.error("Error creating new user:", err);
    callback(user);
  });
};

user_schema.statics.fromTicket = function(ticket, callback) {
  var self = this;
  this.findOne({tickets: ticket}).sort('-created').exec(function(err, user) {
    if (err) console.error("Error finding user by ticket:", err);
    if (!user) {
      self.create(function(user) {
        callback(user);
      });
    }
    else {
      callback(user);
    }
  });
};

var User = db.model('User', user_schema);

module.exports.User = User;
