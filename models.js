'use strict'; /*jslint nomen: true, node: true, indent: 2, debug: true, vars: true, es5: true */
var __ = require('underscore');
var mongoose = require('mongoose');
mongoose.connect('localhost', 'drags');

function alphaDecimal(length) {
  var store = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''), string = '';
  for (var i = 0; i < length; i++)
    string += store[(Math.random() * store.length) | 0];
  return string;
}

var userSchema = new mongoose.Schema({
  created: {
    type: Date,
    'default': Date.now
  },
  tickets: {
    type: [String],
    'default': function() {
      var random_ticket = alphaDecimal(32);
      return [random_ticket];
    }
  },
  responses: [
    /* e.g., {
      stimulus_id: 'language_used_in_home',
      ...
    } */
  ]
});

userSchema.methods.activeTicket = function() {
  // return the last ticket
  return this.tickets[this.tickets.length - 1];
};

userSchema.statics.fromTicket = function(ticket, callback) {
  // callback signature: (err, user)
  var Self = this;
  this.findOne({tickets: ticket}).sort('-created').exec(function(err, user) {
    if (err || user) {
      callback(err, user);
    }
    else {
      user = new Self({tickets: [ticket]});
      user.save(function(err, user) {
        callback(err, user);
      });
    }
  });
};

exports.User = mongoose.model('User', userSchema);
