--CREATE DATABASE fotozzz;

--CREATE USER fotozzz_app WITH encrypted password 'supeprsecret';

--GRANT USAGE ON SCHEMA public TO fotozzz_app;

CREATE TYPE user_gender
AS ENUM ('male', 'female', 'couple');

CREATE TYPE user_status
AS ENUM ('blank', 'active', 'penalty', 'banned');

CREATE TYPE user_role
AS ENUM ('user', 'moderator', 'admin');

CREATE TABLE users (
  id                  SERIAL NOT NULL,
  tg_id               BIGINT NOT NULL,
  nick                VARCHAR(50),
  gender              user_gender,
  status              user_status NOT NULL DEFAULT 'blank',
  role                user_role NOT NULL DEFAULT 'user',
  register_date       TIMESTAMPTZ NOT NULL,
  last_activity       TIMESTAMPTZ NOT NULL,
  avatar              TEXT,
  about               TEXT,
  invite_link         TEXT,

  PRIMARY KEY(id),
  UNIQUE(tg_id),
  UNIQUE(nick)
);

--GRANT SELECT, INSERT, UPDATE ON users TO fotozzz_app;

--GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fotozzz_app;

