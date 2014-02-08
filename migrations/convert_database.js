/*jslint node: true */
var _ = require('underscore');
var async = require('async');
var mongodb = require('mongodb');
var pg = require('pg');

/*

remove dummy users with only 'created' and '_id' columns

var emptyUserQuery = function() {
  var no_responses = (this.responses === undefined) || (this.responses.length === 0);
  return no_responses && (this.email === undefined) && (this.password === undefined);
};
print('Removing', db.users.count(emptyUserQuery), 'users:');
db.users.find(emptyUserQuery).forEach(printjson);
db.users.remove(emptyUserQuery);
print('Currently', db.users.count(), 'users');

*/

function convert_locations(mongo_db, pg_client, callback) {
  var collection = mongo_db.collection('locations');
  /** Example:
  {
    "ticket_id" : ObjectId("519cfa96ca843e6f05000008"),
    "ip" : "24.227.168.226",
    "user_agent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:21.0) Gecko/20100101 Firefox/21.0",
    "created" : ISODate("2013-05-22T17:04:22.915Z"),
    "_id" : ObjectId("519cfa96ca843e6f05000009")
  }
  */
  collection.find().toArray(function(err, locations) {
    if (err) return callback(err);

    console.log('Converting %d locations', locations.length);
    async.each(locations, function(location, callback) {

      var sql = 'INSERT INTO clients (ticket_oid, ip, user_agent, created) VALUES ($1, $2, $3, $4)';
      var values = [location.ticket_id.toString(), location.ip, location.user_agent, location.created];
      pg_client.query(sql, values, function(err, result) {
        // collection.remove(location, callback); // FINAL
        callback(err);
      });
    }, callback);
  });
}

function convert_tickets(mongo_db, pg_client, callback) {
  var collection = mongo_db.collection('tickets');
  /** Example:
  {
    "user_id" : ObjectId("4e8db58b46ca641322000ce3"),
    "key" : "h4GzQUEbz31WN8ZWlCu5l5jsUOoUMESS",
    "created" : ISODate("2011-10-06T14:04:59.686Z"),
    "_id" : ObjectId("4e8db58b46ca641322000ce4")
  }
  */
  collection.find().toArray(function(err, tickets) {
    if (err) return callback(err);

    console.log('Converting %d tickets', tickets.length);
    async.each(tickets, function(ticket, callback) {

      var user_oid = ticket.user_id.toString();
      var sql = 'INSERT INTO tickets (ticket_oid, user_oid, key, created) VALUES ($1, $2, $3, $4)';
      var values = [ticket._id.toString(), user_oid, ticket.key, ticket.created];
      pg_client.query(sql, values, function(err, result) {
        var user_sql = 'INSERT INTO users (user_oid, created) VALUES ($1, $2)';
        pg_client.query(user_sql, [user_oid, ticket.created], function(err, result) {
          // absorb "duplicate key value violates unique constraint" error
          // collection.remove(ticket, callback); // FINAL
          callback();
        });
      });
    }, callback);
  });
}

function convert_responses(mongo_db, pg_client, collection_name, experiment_id, callback) {
  /** Example:
  {
    "created" : ISODate("2011-09-08T16:53:21.297Z"),
    "stimulus_id" : "b07",
    "value" : "C",
    "time_choices_shown" : NumberLong("1315500799773"),
    "time_stimulus_completed" : NaN,
    "time_choice_selected" : NumberLong("1315500801256"),
    "user_id" : ObjectId("4e627d9acbe45e5d29000002"),
    "_id" : ObjectId("4e68f301eb6a086c2b00007e")
  }
  */
  var collection = mongo_db.collection(collection_name);
  collection.find().toArray(function(err, responses) {
    if (err) return callback(err);

    console.log('Converting %d %s', responses.length, collection_name);
    async.each(responses, function(response, callback) {
      // console.log(response);
      var response_details = _.omit(response, '_id', 'user_id', 'stimulus_id', 'value', 'created');
      var details = JSON.stringify(response_details);
      var user_oid = response.user_id ? response.user_id.toString() : response.user_id;
      var sql = 'INSERT INTO responses (user_oid, experiment_id, stimulus_id, value, details, created) VALUES ($1, $2, $3, $4, $5, $6)';
      var values = [user_oid, experiment_id, response.stimulus_id,
        response.value, details, response.created];
      pg_client.query(sql, values, function(err, result) {
        if (err) return callback(err);

        if (user_oid) {
          var user_sql = 'INSERT INTO users (user_oid, created) VALUES ($1, $2)';
          pg_client.query(user_sql, [user_oid, response.created], function(err, result) {
            // absorb "duplicate key value violates unique constraint" error
            // collection.remove(location, callback); // FINAL
            callback();
          });
        }
        else {
          // collection.remove(location, callback); // FINAL
          callback();
        }
      });
    }, callback);
  });
}

function convert_user(user, pg_client, callback) {
  // user fields
  async.series([
    function(callback) {
      console.log('Inserting user: %s', user._id.toString());
      var sql = 'INSERT INTO users (user_oid, email, password, administrator, created) VALUES ($1, $2, $3, $4, $5)';
      var values = [user._id.toString(), user.email, user.password, user.administrator, user.created];
      pg_client.query(sql, values, callback);
    },
    function(callback) {
      var responses = user.responses || [];
      console.log('Inserting %d responses', responses .length);
      async.each(responses, function(response, callback) {
        var details = _.omit(response, '_id', 'user_oid', 'stimulus_id', 'value', 'created');
        var sql = 'INSERT INTO responses (user_oid, experiment_id, stimulus_id, value, details, created) VALUES ($1, $2, $3, $4, $5, $6)';
        var values = [user._id.toString(), null, response.stimulus_id, response.value, JSON.stringify(details), response.created];
        pg_client.query(sql, values, callback);
      }, callback);
    },
    function(callback) {
      var tickets = user.tickets || [];
      console.log('Inserting %d tickets', tickets.length);
      async.each(tickets, function(ticket, callback) {
        console.log('Inserting ticket: %j', ticket);
        var sql = 'INSERT INTO tickets (user_oid, key, created) VALUES ($1, $2, $3)';
        var values = [user._id.toString(), ticket.key, ticket.created];
        pg_client.query(sql, values, callback);
      }, callback);
    },
  ], callback);
}

function convert_users(mongo_db, pg_client, callback) {
  /**

  Current schema:

  {
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
  }

  db.users.find().forEach(printjson)

  Example:

    "__v" : 0,
    "_id" : ObjectId("52ef8a3bbdd1e9141a0000a9"),
    "administrator" : false,
    "created" : ISODate("2014-02-03T12:23:23.848Z"),
    "responses" : [
      {
        "stimulus_id" : "administrator_code",
        "value" : "150",
        "created" : ISODate("2014-02-03T12:23:29.823Z")
      },
      ...
      {
        "stimulus_id" : "a4",
        "time_stimulus_completed" : 1391430331446,
        "time_choices_shown" : 1391430331534,
        "angle" : 71.1468412355809,
        "time_choice_selected" : 1391430339314,
        "created" : ISODate("2014-02-03T12:25:33.373Z")
      },
      ...
      {
        "stimulus_id" : "todays_date",
        "value" : "10/01/2011",
        "time_choice_selected" : 1388973307734,
        "created" : ISODate("2014-01-06T01:55:06.153Z")
      },
    ],
    "tickets" : [
      "rmiae9dVP0GDg2l0zVApHDeTC6vpMovtUFIlZpOh"
    ]

  */
  var collection = mongo_db.collection('users');
  collection.find().toArray(function(err, all_users) {
    if (err) return callback(err);

    console.log('Found %d users', all_users.length);

    var users = all_users.filter(function(user) {
      var responses = user.responses || [];
      return responses.length > 0 || user.email || user.password || user.administrator;
    });

    console.log('Converting %d users', users.length);

    async.eachSeries(users, function(user, callback) {
      if (err) return callback(err);

      convert_user(user, pg_client, callback);
      // collection.remove(location, callback); // FINAL
    }, callback);
  });

}

mongodb.MongoClient.connect('mongodb://127.0.0.1:27017/drags', function(err, mongo_db) {
  if (err) throw err;
  pg.connect('postgres://localhost/drags', function(err, pg_client, pg_client_done) {
    if (err) throw err;

    async.series([
      function(callback) {
        convert_locations(mongo_db, pg_client, callback);
      },
      function(callback) {
        convert_tickets(mongo_db, pg_client, callback);
      },
      function(callback) {
        convert_responses(mongo_db, pg_client, 'pctc_responses', 'pctc', callback);
      },
      function(callback) {
        convert_responses(mongo_db, pg_client, 'ptct_responses', 'ptct', callback);
      },
      function(callback) {
        convert_users(mongo_db, pg_client, callback);
      },
    ], function(err, results) {
      if (err) throw err;

      console.log('Done; cleaning up.');

      mongo_db.close();
      pg_client_done();
    });
  });
});
