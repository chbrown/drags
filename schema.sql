-- $ dropdb drags; createdb drags && psql drags < schema.sql

CREATE TABLE users (
  id serial PRIMARY KEY,

  user_oid text UNIQUE,
  email text,
  password text,
  administrator boolean
    DEFAULT false,
  ticket text,
  ip text,
  user_agent text,

  created timestamp
    DEFAULT current_timestamp
);

CREATE TABLE clients (
  id serial PRIMARY KEY,

  ticket_oid text,
  ip text,
  user_agent text,

  created timestamp
    DEFAULT current_timestamp
);

CREATE TABLE responses (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),

  user_oid text,
  experiment_id text,
  stimulus_id text,
  value text,
  details json,

  created timestamp
    DEFAULT current_timestamp
);

CREATE TABLE tickets (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),

  ticket_oid text UNIQUE,
  user_oid text,
  key text UNIQUE,

  created timestamp
    DEFAULT current_timestamp
);

/*

After conversions, pruned to:

CREATE TABLE users (
  id serial PRIMARY KEY,
  email text,
  password text,
  administrator boolean
    DEFAULT false,
  ticket text,
  ip text,
  user_agent text,
  created timestamp
    DEFAULT current_timestamp
);

CREATE TABLE responses (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),
  experiment_id text,
  stimulus_id text,
  value text,
  details json,
  created timestamp
    DEFAULT current_timestamp
);

*/
