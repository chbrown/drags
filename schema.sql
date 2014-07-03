-- $ dropdb drags; createdb drags && psql drags < schema.sql

CREATE TABLE users (
  id serial PRIMARY KEY,

  -- user_oid text UNIQUE, <-- can remove now, after mongo conversions
  email text,
  password text,
  administrator boolean DEFAULT false,
  ticket text,
  ip text,
  user_agent text,

  created TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp
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

  -- user_oid text, <-- can remove now that conversion is done
  experiment_id text,
  stimulus_id text,
  value text,
  details json,

  created TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp
);

CREATE TABLE tickets (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),

  ticket_oid text UNIQUE,
  user_oid text,
  key text UNIQUE,

  created TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp
);
