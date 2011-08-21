function MongoHelpers() {
  this.client = null;
}

MongoHelpers.prototype = {
  setClient: function(client) {
    this.client = client;
  },
  // openCollection reuses the client argument, if provided
  openCollection: function(collection_name, callback) {
    return this.client.collection(collection_name, callback);
    // function(err, collection) {
    //   if (err) throw err;
    //   callback(err, collection)
    // });
  },
  // ============================================================================
  // sub collection:
  
  // callback signature: function(err, document, collection) { }
  findOne: function(collection_name, query_object, options, callback) {
    options.limit = 1;
    // I think the query_object might have to be an ObjectId.
    this.openCollection(collection_name, function(err, collection) {
      if (err) throw err;
      collection.findOne(query_object, options, function(err, doc) {
        if (err) throw err;
        // cursor.nextObject(function(err, doc) {
        return callback(err, doc, collection);
      });
    });
  },
  // callback signature: function(err, document, collection) { }
  findFirst: function(collection, query_object, options, callback) {
    options.limit = 1;
    // collection can be either a real collection of a string.
    function _find(err, actual_collection) {
      if (err) throw err;
      actual_collection.find(query_object, options, function(err, cursor) {
        if (err) throw err;
        cursor.nextObject(function(err, doc) {
          if (err) throw err;
          return callback(err, doc, actual_collection);
        });
      });
    } 
    if (typeof(collection) === 'string') {
      return this.openCollection(collection, _find); // nb: return!
    }
    return _find(undefined, collection);
  },
  // callback signature: function(err, document, collection) { }
  // IMPORTANT: this callback will be called multiple times! (This is what you want, btw.)
  findEach: function(collection_name, query_object, options, callback) {
    this.openCollection(collection_name, function(err, collection) {
      if (err) throw err;
      collection.find(query_object, options, function(err, cursor) {
        if (err) throw err;
        cursor.each(function(err, doc) {
          if (err) throw err;
          return callback(err, doc, collection);
        });
      });
    });
  },
  // callback signature: function(err, documents, collection) { }
  findAll: function(collection_name, query_object, options, callback) {
    this.openCollection(collection_name, function(err, collection) {
      if (err) throw err;
      collection.find(query_object, options, function(err, cursor) {
        if (err) throw err;
        cursor.toArray(function(err, docs) {
          if (err) throw err;
          return callback(err, docs, collection);
        });
      });
    });
  },
  // callback signature: callback(err, documents, collection)
  insert: function(collection_name, object, options, callback) {
    this.openCollection(collection_name, function(err, collection) {
      if (err) throw err;
      collection.insert(object, options, function(err, docs) {
        if (err) throw err;
        return callback(err, docs, collection);
      });
    });
  }
};

exports.MongoHelpers = MongoHelpers;
