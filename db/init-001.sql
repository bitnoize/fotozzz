--CREATE USER fotozzz_app WITH ENCRYPTED PASSWORD 'supersecret';

--CREATE DATABASE fotozzz;

GRANT USAGE ON SCHEMA public TO fotozzz_app;

--
-- Users
--

CREATE TYPE user_gender
AS ENUM ('male', 'female', 'couple');

CREATE TYPE user_status
AS ENUM ('register', 'active', 'penalty', 'banned');

CREATE TYPE user_role
AS ENUM ('user', 'moderator', 'admin');

CREATE TABLE users (
  id                    INTEGER GENERATED ALWAYS AS IDENTITY,
  tg_from_id            BIGINT NOT NULL,
  nick                  VARCHAR(50),
  gender                user_gender,
  status                user_status NOT NULL,
  role                  user_role NOT NULL,
  avatar_tg_file_id     VARCHAR(100),
  about                 TEXT,
  register_time         TIMESTAMPTZ DEFAULT NOW(),
  last_activity_time    TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(id),
  UNIQUE(tg_from_id),
  UNIQUE(nick)
);

GRANT SELECT, INSERT, UPDATE ON users TO fotozzz_app;
GRANT USAGE, SELECT ON users_id_seq TO fotozzz_app;

CREATE INDEX users_gender_key ON users (gender);
CREATE INDEX users_status_key ON users (status);
CREATE INDEX users_role_key ON users (role);
CREATE INDEX users_register_time_key ON users (register_time);
CREATE INDEX users_last_activity_time_key ON users (last_activity_time);

CREATE TABLE user_logs (
  id                    UUID DEFAULT gen_random_uuid(),
  user_id               INTEGER NOT NULL,
  mod_user_id           INTEGER NOT NULL,
  time                  TIMESTAMPTZ DEFAULT NOW(),
  action                VARCHAR(100) NOT NULL,
  status                user_status NOT NULL,
  role                  user_role NOT NULL,
  data                  JSONB NOT NULL,

  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(mod_user_id) REFERENCES users(id)
);

GRANT SELECT, INSERT ON user_logs TO fotozzz_app;

CREATE INDEX user_logs_user_id_key ON user_logs (user_id);
CREATE INDEX user_logs_mod_user_id_key ON user_logs (mod_user_id);
CREATE INDEX user_logs_time_key ON user_logs (time);
CREATE INDEX user_logs_action_key ON user_logs (action);

--
-- Topics
--

CREATE TYPE topic_status
AS ENUM ('available');

CREATE TABLE topics (
  id                    INTEGER GENERATED ALWAYS AS IDENTITY,
  tg_chat_id            BIGINT NOT NULL,
  tg_thread_id          BIGINT NOT NULL,
  name                  VARCHAR(100) NOT NULL,
  status                topic_status NOT NULL,
  description           TEXT,
  create_time           TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(id),
  UNIQUE(tg_chat_id, tg_thread_id)
);

GRANT SELECT, INSERT, UPDATE ON topics TO fotozzz_app;
GRANT USAGE, SELECT ON topics_id_seq TO fotozzz_app;

CREATE INDEX topics_status_key ON topics (status);
CREATE INDEX topics_create_time_key ON topics (create_time);

CREATE TABLE topic_logs (
  id                    UUID DEFAULT gen_random_uuid(),
  topic_id              INTEGER NOT NULL,
  mod_user_id           INTEGER NOT NULL,
  time                  TIMESTAMPTZ DEFAULT NOW(),
  action                VARCHAR(100) NOT NULL,
  status                topic_status NOT NULL,
  data                  JSONB NOT NULL,

  PRIMARY KEY(id),
  FOREIGN KEY(topic_id) REFERENCES topics(id),
  FOREIGN KEY(mod_user_id) REFERENCES users(id)
);

GRANT SELECT, INSERT ON topic_logs TO fotozzz_app;

CREATE INDEX topic_logs_topic_id_key ON topic_logs (topic_id);
CREATE INDEX topic_logs_mod_user_id_key ON topic_logs (mod_user_id);
CREATE INDEX topic_logs_time_key ON topic_logs (time);
CREATE INDEX topic_logs_action_key ON topic_logs (action);

--
-- Photos
--

CREATE TYPE photo_status
AS ENUM ('published', 'hidden', 'deleted');

CREATE TABLE photos (
  id                    INTEGER GENERATED ALWAYS AS IDENTITY,
  user_id               INTEGER NOT NULL,
  topic_id              SMALLINT NOT NULL,
  group_tg_chat_id      BIGINT NOT NULL,
  group_tg_thread_id    BIGINT NOT NULL,
  group_tg_message_id   BIGINT NOT NULL,
  channel_tg_chat_id    BIGINT NOT NULL,
  channel_tg_message_id BIGINT NOT NULL,
  tg_file_id            VARCHAR(100) NOT NULL,
  description           TEXT,
  status                photo_status NOT NULL,
  create_time           TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(topic_id) REFERENCES topics(id),
  UNIQUE(group_tg_chat_id, group_tg_thread_id, group_tg_message_id),
  UNIQUE(channel_tg_chat_id, channel_tg_message_id)
);

GRANT SELECT, INSERT, UPDATE ON photos TO fotozzz_app;
GRANT USAGE, SELECT ON photos_id_seq TO fotozzz_app;

CREATE INDEX photos_user_id_key ON photos (user_id);
CREATE INDEX photos_topic_id_key ON photos (topic_id);
CREATE INDEX photos_status_key ON photos (status);
CREATE INDEX photos_create_time_key ON photos (create_time);

CREATE TABLE photo_logs (
  id                    UUID DEFAULT gen_random_uuid(),
  photo_id              INTEGER NOT NULL,
  mod_user_id           INTEGER NOT NULL,
  time                  TIMESTAMPTZ DEFAULT NOW(),
  action                VARCHAR(100) NOT NULL,
  status                photo_status NOT NULL,
  data                  JSONB NOT NULL,

  PRIMARY KEY(id),
  FOREIGN KEY(photo_id) REFERENCES photos(id),
  FOREIGN KEY(mod_user_id) REFERENCES users(id)
);

GRANT SELECT, INSERT ON photo_logs TO fotozzz_app;

CREATE INDEX photo_logs_user_id_key ON photo_logs (photo_id);
CREATE INDEX photo_logs_mod_user_id_key ON photo_logs (mod_user_id);
CREATE INDEX photo_logs_time_key ON photo_logs (time);
CREATE INDEX photo_logs_action_key ON photo_logs (action);

--
-- Rates
--

CREATE TYPE rate_value
AS ENUM ('not_appropriate', 'cute', 'amazing', 'shock');

CREATE TABLE rates (
  id                    INTEGER GENERATED ALWAYS AS IDENTITY,
  user_id               INTEGER NOT NULL,
  topic_id              SMALLINT NOT NULL,
  photo_id              INTEGER NOT NULL,
  value                 rate_value NOT NULL,
  create_time           TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(topic_id) REFERENCES topics(id),
  FOREIGN KEY(photo_id) REFERENCES photos(id),
  UNIQUE(user_id, photo_id)
);

GRANT SELECT, INSERT, UPDATE ON rates TO fotozzz_app;
GRANT USAGE, SELECT ON rates_id_seq TO fotozzz_app;

CREATE INDEX rates_user_id_key ON rates (user_id);
CREATE INDEX rates_topic_id_key ON rates (topic_id);
CREATE INDEX rates_photo_id_key ON rates (photo_id);
--CREATE INDEX rates_value_key ON rates (value);
CREATE INDEX rates_create_time_key ON rates (create_time);

CREATE TABLE rate_logs (
  id                    UUID DEFAULT gen_random_uuid(),
  rate_id               INTEGER NOT NULL,
  mod_user_id           INTEGER NOT NULL,
  time                  TIMESTAMPTZ DEFAULT NOW(),
  action                VARCHAR(100) NOT NULL,
  value                 rate_value NOT NULL,
  data                  JSONB NOT NULL,

  PRIMARY KEY(id),
  FOREIGN KEY(rate_id) REFERENCES rates(id),
  FOREIGN KEY(mod_user_id) REFERENCES users(id)
);

GRANT SELECT, INSERT ON rate_logs TO fotozzz_app;

CREATE INDEX rate_logs_rate_id_key ON rate_logs (rate_id);
CREATE INDEX rate_logs_mod_user_id_key ON rate_logs (mod_user_id);
CREATE INDEX rate_logs_time_key ON rate_logs (time);
CREATE INDEX rate_logs_action_key ON rate_logs (action);

--
-- Comments
--

CREATE TYPE comment_status
AS ENUM ('published', 'deleted');

CREATE TABLE comments (
  id                    INTEGER GENERATED ALWAYS AS IDENTITY,
  user_id               INTEGER NOT NULL,
  topic_id              SMALLINT NOT NULL,
  photo_id              INTEGER NOT NULL,
  channel_tg_chat_id    BIGINT NOT NULL,
  channel_tg_message_id BIGINT NOT NULL,
  status                comment_status NOT NULL,
  text                  TEXT,
  create_time           TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(topic_id) REFERENCES topics(id),
  FOREIGN KEY(photo_id) REFERENCES photos(id),
  UNIQUE(channel_tg_chat_id, channel_tg_message_id)
);

GRANT SELECT, INSERT, UPDATE ON comments TO fotozzz_app;
GRANT USAGE, SELECT ON comments_id_seq TO fotozzz_app;

CREATE INDEX comments_user_id_key ON comments (user_id);
CREATE INDEX comments_topic_id_key ON comments (topic_id);
CREATE INDEX comments_photo_id_key ON comments (photo_id);
CREATE INDEX comments_create_time_key ON comments (create_time);

CREATE TABLE comment_logs (
  id                    UUID DEFAULT gen_random_uuid(),
  comment_id            INTEGER NOT NULL,
  mod_user_id           INTEGER NOT NULL,
  time                  TIMESTAMPTZ DEFAULT NOW(),
  action                VARCHAR(100) NOT NULL,
  status                comment_status NOT NULL,
  data                  JSONB NOT NULL,

  PRIMARY KEY(id),
  FOREIGN KEY(comment_id) REFERENCES comments(id),
  FOREIGN KEY(mod_user_id) REFERENCES users(id)
);

GRANT SELECT, INSERT ON comment_logs TO fotozzz_app;

CREATE INDEX comment_logs_comment_id_key ON comment_logs (comment_id);
CREATE INDEX comment_logs_mod_user_id_key ON comment_logs (mod_user_id);
CREATE INDEX comment_logs_time_key ON comment_logs (time);
CREATE INDEX comment_logs_action_key ON comment_logs (action);

--
-- Test Data
--

INSERT INTO topics (
  tg_chat_id, tg_thread_id, name, status, description
)
VALUES (-1002066427722, 1, 'Анонсы', 'available', NULL);

INSERT INTO topics (
  tg_chat_id, tg_thread_id, name, status, description
)
VALUES (-1002066427722, 7, 'Портрет', 'available', NULL);

INSERT INTO topics (
  tg_chat_id, tg_thread_id, name, status, description
)
VALUES (-1002066427722, 8, 'Пейзаж', 'available', NULL);

INSERT INTO topics (
  tg_chat_id, tg_thread_id, name, status, description
)
VALUES (-1002066427722, 10, 'Натюрморт', 'available', NULL);

