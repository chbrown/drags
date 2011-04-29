-- dropdb drags; createdb drags && psql drags -f schema.sql
CREATE TABLE users (
    id serial PRIMARY KEY,
    name text,
    email text,
    created timestamp DEFAULT current_timestamp
);

CREATE TABLE tickets (
    id serial PRIMARY KEY,
    user_id integer NOT NULL references users(id),
    name text,
    created timestamp DEFAULT current_timestamp
);
CREATE INDEX tickets_name ON tickets(name);

CREATE TABLE locations (
    id serial PRIMARY KEY,
    ip text NOT NULL,
    user_agent text,
    ticket_id integer NOT NULL references tickets(id),
    created timestamp DEFAULT current_timestamp
);
CREATE INDEX locations_ip ON locations(ip);

CREATE TABLE surveys (
    id serial PRIMARY KEY,
    name text NOT NULL,
    created timestamp DEFAULT current_timestamp
);

CREATE TABLE stimuli (
    id serial PRIMARY KEY,
    user_id integer NOT NULL references users(id),
    survey_id integer NOT NULL references surveys(id),
    name text NOT NULL,
    value text NOT NULL,
    created timestamp DEFAULT current_timestamp
);

CREATE TABLE responses (
    id serial PRIMARY KEY,
    user_id integer NOT NULL references users(id), -- basically just double checking.
    stimulus_id integer NOT NULL references stimuli(id),
    total_time numeric,
    sureness numeric,
    value text,
    details text,
    created timestamp DEFAULT current_timestamp
);

INSERT INTO surveys (name) VALUES ('dichotic');