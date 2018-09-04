var _ = require('underscore');
var async = require('async');
var pg = require('pg');

pg.connect({host: '/tmp', database: 'drags'}, function(err, pg_client, pg_client_done) {
  if (err) throw err;

  async.series([
    function(callback) {
      console.log('copying clients to users');
      pg_client.query('SELECT users.id AS user_id, clients.ip, clients.user_agent FROM clients INNER JOIN tickets ON tickets.ticket_oid = clients.ticket_oid INNER JOIN users ON users.user_oid = tickets.user_oid', [], function(err, result) {
        if (err) return callback(err);

        console.log('converting %d clients', result.rows.length);

        async.each(result.rows, function(row, callback) {
          var sql = 'UPDATE users SET ip = $1, user_agent = $2 WHERE id = $3';
          var values = [row.ip, row.user_agent, row.user_id];
          pg_client.query(sql, values, callback);
        }, callback);
      });
    },
    function(callback) {
      console.log('dropping clients table');
      pg_client.query('DROP TABLE clients', [], callback);
    },
    function(callback) {
      console.log('adding tickets to users');
      var select_sql = 'SELECT tickets.key AS ticket, user_oid FROM tickets ORDER BY tickets.created ASC';
      pg_client.query(select_sql, [], function(err, result) {
        if (err) return callback(err);

        console.log('adding %d tickets', result.rows.length);

        async.each(result.rows, function(row, callback) {
          var sql = 'UPDATE users SET ticket = $1 WHERE users.user_oid = $2';
          pg_client.query(sql, [row.ticket, row.user_oid], callback);
        }, callback);
      });
    },
    function(callback) {
      console.log('linking responses to users');
      var select_sql = 'SELECT responses.id AS response_id, users.id AS user_id FROM responses INNER JOIN users ON users.user_oid = responses.user_oid';
      pg_client.query(select_sql, [], function(err, result) {
        if (err) return callback(err);

        console.log('adding %d responses', result.rows.length);

        async.each(result.rows, function(row, callback) {
          var sql = 'UPDATE responses SET user_id = $1 WHERE responses.id = $2';
          pg_client.query(sql, [row.user_id, row.response_id], callback);
        }, callback);
      });
    },
    function(callback) {
      console.log('removing responses.user_oid column');
      pg_client.query('ALTER TABLE responses DROP user_oid', [], callback);
    },
    function(callback) {
      console.log('removing users.user_oid column');
      pg_client.query('ALTER TABLE users DROP user_oid', [], callback);
    },
    function(callback) {
      console.log('dropping tickets table');
      pg_client.query('DROP TABLE tickets', [], callback);
    },
  ], function(err, results) {
    if (err) throw err;

    console.log('Done; closing.');

    pg_client_done();
  });
});
