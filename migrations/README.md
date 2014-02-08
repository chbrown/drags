## MongoDB -> PostgreSQL conversion

    dropdb drags; createdb drags && psql drags < schema.sql
    node convert_database.js
    node clean_database.js
