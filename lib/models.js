/*jslint node: true */ /* globals setImmediate */
var _ = require('underscore');
var async = require('async');
var logger = require('loge');

var hash = require('./hash');
var db = require('./db');

var User = exports.User = function(id) {
  this.id = id;
};
User.prototype.addResponses = function(responses, callback) {
  /** user.addResponses: add an array of responses

  `responses`: [Object]
  `callback`: function(Error | null)
  */
  var user_id = this.id;
  var sql = 'INSERT INTO responses ' +
    '(user_id, experiment_id, stimulus_id, value, details, created) ' +
    'VALUES ($1, $2, $3, $4, $5, $6)';
  var experiment_id = null;
  async.each(responses || [], function(response, callback) {
    var values = [
      user_id,
      experiment_id,
      response.stimulus_id,
      response.value,
      JSON.stringify(_.omit(response, 'stimulus_id', 'value', 'created')),
      response.created || new Date(),
    ];
    db.query(sql, values, callback);
  }, callback);
};
// User.prototype.addTicket = function(callback) {
//   /** Create ticket and insert it, also returning it in the callback.

//   `callback`: function(Error | null,  String | null)
//   */
//   var ticket_key = hash.random(40);
//   var ticket_sql = 'INSERT INTO tickets (user_id, key) VALUES ($1, $2)';
//   db.query(ticket_sql, [this.id, ticket_key], function(err) {
//     if (err) return callback(err);

//     callback(null, ticket_key);
//   });
// };
// User.prototype.get = function(column, callback) {
//   /** Mostly used for testing for administrator privileges.

//   `callback`: function(Error | null, Object | null)
//   */
//   db.query('SELECT * FROM users WHERE id = $1', [this.id], function(err, rows) {
//     if (err || rows.length === 0) return callback(err);

//     callback(null, rows[0][column]);
//   });
// };

User.extend = function(props) {
  var user = new User(props.id);
  return _.extend(user, props);
};
User.create = function(callback) {
  /** Create mostly empty User and Ticket rows
  `callback`: function(Error | null, User | null)
  */
  var ticket = hash.random(40);
  var user_sql = 'INSERT INTO users (ticket) VALUES ($1) RETURNING id';
  db.query(user_sql, [ticket], function(err, rows) {
    if (err) return callback(err);

    var user = new User(rows[0].id);
    user.ticket = ticket;
    callback(null, user);
  });
};
User.fromCredentials = function(email, raw_password, callback) {
  // callback signature: function(err, user || null)
  var password = hash.sha256(raw_password);
  var sql = 'SELECT * FROM users WHERE email = $1 AND password = $2';
  var values = [email, password];
  db.query(sql, values, function(err, rows) {
    if (err || rows.length === 0) return callback(err);

    callback(null, User.extend(rows[0]));
  });
};
User.fromTicket = function(raw_ticket, callback) {
  /** User.fromTicket: for a given ticket, get any matching user, or else
    create a new user.

  `ticket`: can be anything, but it won't be used unless its string
      representation matches /^\w{40}$/.
  `callback`: function(Error | null, User | null)
  */
  var ticket = String(raw_ticket);
  logger.debug('User.fromTicket: %s', ticket);
  if (ticket.match(/^\w{40}$/)) {
    db.query('SELECT * FROM users WHERE ticket = $1', [ticket], function(err, rows) {
      if (err) return callback(err);

      if (rows.length) {
        callback(null, User.extend(rows[0]));
      }
      else {
        // no error, but no user found, either. make a new one, using a
        // completely new ticket. we don't allow custom tickets.
        logger.info('ticket is valid but does not match a user: %s', ticket);
        User.create(callback);
      }
    });
  }
  else {
    User.create(callback);
  }
};
// User.prototype.primaryTicket = function() {
//   // return the last ticket
//   return this.tickets[this.tickets.length - 1];
// };
