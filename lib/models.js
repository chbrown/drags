'use strict'; /*jslint es5: true, node: true, indent: 2 */ /* globals setImmediate */
var mongoose = require('mongoose');
var logger = require('./logger');

exports.connect  = function(database) {
  mongoose.connect('localhost', database);
};

function alphaDecimal(length) {
  var store = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''), string = '';
  for (var i = 0; i < length; i++)
    string += store[(Math.random() * store.length) | 0];
  return string;
}

var userSchema = new mongoose.Schema({
  created: {
    type: Date,
    'default': function() {
      return new Date();
    },
  },
  demographics: {}, // mongoose.Schema.Types.Mixed
  tickets: {
    type: [String],
    'default': function() {
      var random_ticket = alphaDecimal(32);
      return [random_ticket];
    },
  },
  responses: [
    /* e.g., {
      stimulus_id: 'language_used_in_home',
      value: 'ASL',
    }, ... */
  ]
});
userSchema.methods.primaryTicket = function() {
  // return the last ticket
  return this.tickets[this.tickets.length - 1];
};
userSchema.methods.addResponses = function(responses, callback) {
  /** user.addResponses: add an array of responses

  `responses`: [Object]
  `callback`: function(Error | null)
  */
  if (responses && responses.length) {
    // responses.forEach(function(response) {
    //   response.created = new Date();
    // });
    this.update({$push: {'responses': {$each: responses}}}, callback);
  }
  else {
    setImmediate(callback);
  }
};
userSchema.statics.fromTicket = function(raw_ticket, callback) {
  /** User.fromTicket: for a given ticket, get any matching users, or else create a new user.

  `ticket`: can be anything, but it won't be used unless its string representation matches /^\w{32}$/.
  `callback`: function(Error | null, User | null)
  */
  var User = this;
  var ticket = String(raw_ticket);
  if (ticket.match(/^\w{32}$/)) {
    User.findOne({tickets: ticket}).sort('-created').exec(function(err, user) {
      if (err) return callback(err);

      if (user) {
        callback(null, user);
      }
      else {
        // no error, but no user found, either. make a new one, using a
        // completely new ticket. we don't allow custom tickets.
        logger.info('ticket is valid but does not match a user: %s', ticket);
        new User().save(callback);
      }
    });
  }
  else {
    new User().save(callback);
  }
};

exports.User = mongoose.model('User', userSchema);
