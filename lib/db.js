/*jslint node: true */
var _ = require('underscore');
var pg = require('pg');
var logger = require('loge');

// pg.defaults.binary = true; // will this parse numerics as floats?
pg.defaults.poolSize = 15; // default is 10

// config acts as a module singleton
// var config = {database: 'drags', user: 'postgres'};
// the host value doesn't actually matter; it just has to be there and start with a /
var config = {host: '/tmp', database: 'drags'};
exports.set = function(opts) {
  // expose config
  _.extend(config, opts);
};

var isDefined = function(x) { return x !== undefined; };
var pushAll = function(array, xs) { return Array.prototype.push.apply(array, xs); };

var query = exports.query = function(sql, args, callback) {
  /** run sql query on pre-configured SQL connection

  `callback`: function(Error | null, [Object] | null)
  */
  pg.connect(config, function(err, client, done) {
    if (err) return callback ? callback(err) : err;

    // logger.debug('Executing SQL query "%s" with variables: %j', sql, args);
    client.query(sql, args, function(err, result) {
      // logger.debug('Result:', result);
      done();
      if (callback) {
        callback(err, result ? result.rows : null);
      }
    });
  });
};

var Select = exports.Select = function(query, context) {
  this.query = _.extend({}, {
    columns: [],
    table: null,
    wheres: [],
    order_bys: [],
    limit: null,
    offset: null,
  }, query);
  this.context = context || {};
};
Select.prototype.execute = function(callback) {
  var self = this;
  var sql = this.join();
  logger.debug('Preparing "%s" for execution in context: %j', sql, this.context);
  // this sql still has :variables in it, so we need to flatten it
  var args = [];
  sql = sql.replace(/:\w+/g, function(match) {
    var arg_name = match.slice(1);
    var arg = self.context[arg_name];
    if (arg === undefined) {
      throw new Error('Cannot execute select with incomplete context. "' + arg_name + '" is missing.');
    }
    var index = args.push(arg);
    return '$' + index;
  });

  query(sql, args, callback);
};
Select.prototype.join = function() {
  var query = this.query;
  var parts = ['SELECT'];
  // add columns
  if (query.columns.length === 0) {
    parts.push('*');
  }
  else {
    pushAll(parts, query.columns);
  }
  // from table
  parts.push('FROM ' + query.table);
  // where ...
  if (query.wheres.length > 0) {
    parts.push('WHERE ' + query.wheres.join(' AND '));
  }
  // order by ...
  if (query.order_bys.length > 0) {
    parts.push('ORDER BY ' + query.order_bys.join(', '));
  }
  // limit
  if (query.limit) {
    parts.push('LIMIT ' + query.limit);
  }
  // offset
  if (query.offset) {
    parts.push('OFFSET ' + query.offset);
  }
  return parts.join(' ');
};
// Object.defineProperty(Select.prototype, 'args', {
//   get: function() {
//     this.getArgs();
//   },
//   set: function(value) {
//     throw new Error('Setting select.args is not currently supported');
//   },
// });
Select.prototype._nextArg = function() {
  // returns a string that is not used in the current context
  for (var i = 0; i < 100; i++) {
    var name = 'arg' + i;
    if (this.context[name] === undefined) {
      return name;
    }
  }
};
// Sql.prototype.interpolate = function(sql, arg) {
//   // any ? in the frag will be replaced by the appropriate index
//   if (sql.match(/\?/))
//     return sql.replace(/\?/, '$' + this.addArg(arg));
//   else
//     return sql;
// };
Select.prototype.clone = function() {
  // returns semi-shallow clone; should be shallow *enough*
  var new_query = {
    columns: _.clone(this.query.columns),
    table: this.query.table,
    wheres: _.clone(this.query.wheres),
    order_bys: _.clone(this.query.order_bys),
    limit: this.query.limit,
    offset: this.query.offset,
  };
  var new_context = _.clone(this.context);
  return new Select(new_query, new_context);
};
Select.prototype._interpolate = function(sql, args) {
  /** Replace a sql string like 'name = ?' and args like ['chris']
  with a sql string like 'name = :arg1' while updating the context
  so that context.arg1 = 'chris' */
  var self = this;
  return sql.replace(/\?/g, function(match) {
    var arg_name = self._nextArg();
    self.context[arg_name] = args.shift();
    return ':' + arg_name;
  });
};
Select.prototype.where = function(sql /*, args... */) {
  /** Immutable; returns new Select object */
  var select = this.clone();
  var args = Array.prototype.slice.call(arguments, 1);
  if (args.length > 0) {
    sql = select._interpolate(sql, args);
  }
  select.query.wheres.push(sql);
  return select;
};
Select.prototype.whereIf = function(sql /*, args... */) {
  /** Just like where, except ignored if the args are undefined.
  Too much of a hack / special case? */
  var select = this;
  var args = Array.prototype.slice.call(arguments, 1);
  if (args.length > 0 && args.every(isDefined)) {
    select = select.clone();
    sql = select._interpolate(sql, args);
    select.query.wheres.push(sql);
  }
  return select;
};
Select.prototype.addColumns = function(/* columns... */) {
  /** Immutable; returns new Select object */
  var select = this.clone();
  var columns = Array.prototype.slice.call(arguments, 0);
  pushAll(select.query.columns, columns);
  return select;
};
Select.prototype.updateContext = function(key, value) {
  /** Immutable; returns new Select object */
  var select = this.clone();
  select.context[key] = value;
  return select;
};
Select.prototype.offset = function(offset) {
  var select = this.clone();
  select.query.offset = offset;
  return select;
};
Select.prototype.limit = function(limit) {
  var select = this.clone();
  select.query.limit = limit;
  return select;
};
Select.prototype.orderBy = function(/* columns... */) {
  var select = this.clone();
  var columns = Array.prototype.slice.call(arguments, 0);
  pushAll(select.query.order_bys, columns);
  return select;
};

// Sql.prototype.addArg = function(arg) {
//   this.args.push(arg);
//   return this.args.length;
// };
// Sql.prototype.toString = function() {
//   var parts = ['SELECT', this.q.select, 'FROM', this.q.table];
//   if (this.q.wheres.length > 0)
//     parts.extend(['WHERE', this.q.wheres.join(' AND ')]);
//   if (this.q.order !== null)
//     parts.extend(['ORDER BY', this.q.order]);
//   if (this.q.offset !== null)
//     parts.extend(['OFFSET', this.q.offset]);
//   if (this.q.limit !== null)
//     parts.extend(['LIMIT', this.q.limit]);
//   return parts.join(' ');
// };
