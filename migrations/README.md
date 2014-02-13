## MongoDB -> PostgreSQL conversion

    dropdb drags; createdb drags && psql drags < schema.sql
    node convert_database.js
    node clean_database.js

Pre-migration MongoDB stats:

    > db.stats()
    {
      "db" : "drags",
      "collections" : 7,
      "objects" : 116648,
      "avgObjSize" : 118.63119813455867,
      "dataSize" : 13838092,
      "storageSize" : 37351424,
      "numExtents" : 28,
      "indexes" : 5,
      "indexSize" : 3891776,
      "fileSize" : 201326592,
      "nsSizeMB" : 16,
      "dataFileVersion" : {
        "major" : 4,
        "minor" : 5
      },
      "ok" : 1
    }
