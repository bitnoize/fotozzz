--CREATE DATABASE fotozzz;

--CREATE USER fotozzz_bot WITH encrypted password 'supeprsecret';

--GRANT USAGE ON SCHEMA public TO fotozzz_bot;

CREATE TYPE user_gender
AS ENUM ('male', 'female', 'couple');

CREATE TYPE user_status
AS ENUM ('register', 'active', 'penalty', 'banned');

CREATE TYPE user_role
AS ENUM ('user', 'moderator', 'admin');

CREATE TABLE users (
  id                  SERIAL NOT NULL,
  tg_id               BIGINT NOT NULL,
  nick                VARCHAR(50) NOT NULL,
  gender              user_gender NOT NULL,
  status              user_status NOT NULL,
  role                user_role NOT NULL,
  register_date       TIMESTAMPTZ NOT NULL,
  last_activity       TIMESTAMPTZ NOT NULL,
  avatar              VARCHAR(100),
  about               TEXT,
  tg_data             JSONB,

  PRIMARY KEY(id),
  UNIQUE(tg_id)
);

--GRANT SELECT, INSERT, UPDATE ON users TO fotozzz_bot;

