--CREATE DATABASE fotozzz;

--CREATE USER fotozzz_app WITH encrypted password 'supeprsecret';

--GRANT USAGE ON SCHEMA public TO fotozzz_app;

--
-- Users
--

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
  avatar              VARCHAR(128),
  about               TEXT,
  tg_data             JSONB NOT NULL,

  PRIMARY KEY(id),
  UNIQUE(tg_id),
  UNIQUE(nick)
);

--GRANT SELECT, INSERT, UPDATE ON users TO fotozzz_app;

CREATE INDEX users_gender_key ON users (gender);
CREATE INDEX users_status_key ON users (status);
CREATE INDEX users_role_key ON users (role);
CREATE INDEX users_register_date_key ON users (register_date);
CREATE INDEX users_last_activity_key ON users (last_activity);

--
-- Photos
--

CREATE TYPE photo_status
AS ENUM ('active', 'hidden', 'deleted');

CREATE TABLE photos (
  id                  SERIAL NOT NULL,
  user_id             INTEGER NOT NULL,
  tg_id               BIGINT NOT NULL,
  photo_type_id       VARCHAR(100),
  tg_file_id          VARCHAR(100),
  file_path           VARCHAR(100),
  date                TIMESTAMPTZ NOT NULL,
  status              photo_status NOT NULL,
  mod_status          photo_mod_status NOT NULL,
  mod_id              INTEGER NOT NULL,
  tg_data             JSONB NOT NULL,

  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

--GRANT SELECT, INSERT, UPDATE ON photos TO fotozzz_app;

CREATE INDEX photos_user_id_key ON photos (user_id);
CREATE INDEX photos_tg_id_key ON photos (tg_id);
CREATE INDEX photos_date_key ON photos (date);
CREATE INDEX photos_status_key ON photos (status);
CREATE INDEX photos_mod_status_key ON photos (mod_status);
CREATE INDEX photos_mod_id_key ON photos (mod_id);

--
-- Rates
--

CREATE TYPE rate_value
AS ENUM ('not_appropriate', 'cute', 'amazing', 'shock');

CREATE TABLE rates (
  id                  SERIAL NOT NULL,
  user_id             INTEGER NOT NULL,
  photo_id            INTEGER NOT NULL,
  date                TIMESTAMPTZ NOT NULL,
  value               rate_value NOT NULL,

  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(photo_id) REFERENCES photos(id)
);

--GRANT SELECT, INSERT, UPDATE ON rates TO fotozzz_app;

CREATE INDEX rates_user_id_key ON rates (user_id);
CREATE INDEX rates_photo_id_key ON rates (photo_id);
CREATE INDEX rates_date_key ON rates (date);

--
-- Comments
--

CREATE TABLE commends (
  id                  SERIAL NOT NULL,
  user_id             INTEGER NOT NULL,

  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
);

--GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fotozzz_app;

