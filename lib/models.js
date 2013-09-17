'use strict'; /*jslint es5: true, node: true, indent: 2 */ /* globals setImmediate */
var crypto = require('crypto');
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

var SALT = 'UcdNrupTDShxEW0Lv9eg';
var sha256 = exports.sha256 = function(s) {
  var shasum = crypto.createHash('sha256');
  shasum.update(SALT, 'utf8');
  shasum.update(s, 'utf8');
  return shasum.digest('hex');
};

/** We could almost use a schema for responses,
var response_schema = new mongoose.Schema({
  created: {type: Date, 'default': Date.now},
  stimulus_id: String, // e.g., 'language_used_in_home'
  value: String,
});
Except that we want arbitrary values in there as well. */

var user_schema = new mongoose.Schema({
  created: {type: Date, 'default': Date.now},
  demographics: {}, // mongoose.Schema.Types.Mixed
  tickets: [String],
  email: String,
  password: {
    type: String,
    set: sha256,
  },
  administrator: {type: Boolean, 'default': false},
  responses: [], // [response_schema]
});
user_schema.methods.primaryTicket = function() {
  // return the last ticket
  return this.tickets[this.tickets.length - 1];
};
user_schema.methods.addResponses = function(responses, callback) {
  /** user.addResponses: add an array of responses

  `responses`: [Object]
  `callback`: function(Error | null)
  */
  if (responses && responses.length) {
    // ignore empty response lists
    var now = new Date();
    responses.forEach(function(response) {
      if (!response.created) {
        response.created = now;
      }
    });
    this.update({$push: {'responses': {$each: responses}}}, callback);
  }
  else {
    setImmediate(callback);
  }
};
user_schema.methods.newTicket = function() {
  // creates a new ticket, adds it to the user, and returns it
  var ticket = alphaDecimal(40);
  this.tickets.push(ticket);
  return ticket;
};

user_schema.statics.withPassword = function(email, password, callback) {
  // callback signature: function(err, user || null)
  this.findOne({email: email, password: sha256(password)}, callback);
};

user_schema.statics.fromTicket = function(raw_ticket, callback) {
  /** User.fromTicket: for a given ticket, get any matching users, or else create a new user.

  `ticket`: can be anything, but it won't be used unless its string representation matches /^\w{40}$/.
  `callback`: function(Error | null, User | null)
  */
  var User = this;
  var newUser = function() {
    var user = new User();
    user.newTicket();
    user.save(callback);
  };
  var ticket = String(raw_ticket);
  if (ticket.match(/^\w{40}$/)) {
    User.findOne({tickets: ticket}, function(err, user) {
      if (err) return callback(err);

      if (user) {
        callback(null, user);
      }
      else {
        // no error, but no user found, either. make a new one, using a
        // completely new ticket. we don't allow custom tickets.
        logger.info('ticket is valid but does not match a user: %s', ticket);
        newUser();
      }
    });
  }
  else {
    newUser();
  }
};

user_schema.statics.findNonEmpty = function(callback) {
  return this.find({
    $or: [
      {administrator: true},
      {
        $and: [
          {responses: {$exists: true}},
          {$where: 'this.responses.length > 0'},
        ]
      },
    ]
  });
};

exports.User = mongoose.model('User', user_schema);
