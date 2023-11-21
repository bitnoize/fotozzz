import pg, { types } from 'pg'
import { PostgresServiceOptions } from '../interfaces/postgres.js'
import { Authorize, User, UserGender } from '../interfaces/user.js'
import { Topic } from '../interfaces/topic.js'
import { Photo } from '../interfaces/photo.js'
import { Rate } from '../interfaces/rate.js'
import { Comment } from '../interfaces/comment.js'
import {
  isRowId,
  isRowCount,
  isRowAuthorize,
  isRowUser,
  isRowTopic,
  isRowsTopics,
  isRowPhoto,
  isRowsPhotos,
  isRowComment,
  isRowsComments,
  buildAuthorize,
  buildUser,
  buildTopic,
  buildTopics,
  buildPhoto,
  buildPhotos,
  buildComment,
  buildComments
} from '../helpers/postgres.js'
import { logger } from '../logger.js'

export class PostgresService {
  private pool: pg.Pool

  constructor(private readonly options: PostgresServiceOptions) {
    const { postgresUrl } = this.options

    this.pool = new pg.Pool({
      connectionString: postgresUrl,
      idleTimeoutMillis: 10000,
      max: 10,
      allowExitOnIdle: true
    })

    types.setTypeParser(types.builtins.INT8, (value: string) => {
      return parseInt(value)
    })

    logger.info(`PostgresService initialized`)
  }

  private static _instance: PostgresService | undefined

  static register(options: PostgresServiceOptions) {
    if (this._instance !== undefined) {
      throw new Error(`PostgresService allready registered`)
    }

    this._instance = new PostgresService(options)
  }

  static instance(): PostgresService {
    if (this._instance === undefined) {
      throw new Error(`PostgresService does not registered`)
    }

    return this._instance
  }

  async authorizeUser(tgId: number, from: unknown): Promise<Authorize> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      let authorize: Authorize

      const resultSelectUserExists = await client.query(
        this.selectAuthorizeByTgIdForShareSql,
        [tgId]
      )

      if (resultSelectUserExists.rowCount === 0) {
        const resultInsertUser = await client.query(
          this.insertUserSql,
          [tgId, 'register', 'user']
        )

        const rowInsertUser = resultInsertUser.rows.shift()
        if (!isRowId(rowInsertUser)) {
          throw new Error(`insert user malformed result`)
        }

        const resultSelectUser = await client.query(
          this.selectAuthorizeByIdForShareSql,
          [rowInsertUser['id']]
        )

        const rowSelectUser = resultSelectUser.rows.shift()
        if (!isRowAuthorize(rowSelectUser)) {
          throw new Error(`select user malformed result`)
        }

        await client.query(
          this.insertUserLogSql,
          [
            rowSelectUser['id'],
            rowSelectUser['id'],
            'user_register',
            rowSelectUser['status'],
            rowSelectUser['role'],
            { from }
          ]
        )

        authorize = buildAuthorize(rowSelectUser)
      } else {
        const rowSelectUserExists =
          resultSelectUserExists.rows.shift()
        if (!isRowAuthorize(rowSelectUserExists)) {
          throw new Error(`selected user malformed result`)
        }

        authorize = buildAuthorize(rowSelectUserExists)
      }

      await client.query('COMMIT')

      return authorize
    } catch (error: unknown) {
      await client.query('ROLLBACK')

      throw error
    } finally {
      client.release()
    }
  }

  async checkUserNick(nick: string): Promise<boolean> {
    const client = await this.pool.connect()

    try {
      const resultSelectUserNick = await client.query(
        this.selectUserByNickSql,
        [nick]
      )

      return resultSelectUserNick.rowCount === 0 ? true : false
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  async activateUser(
    id: number,
    nick: string,
    gender: UserGender,
    avatarTgFileId: string,
    about: string,
    from: unknown
  ): Promise<Authorize> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const resultSelectUserExists = await client.query(
        this.selectAuthorizeByIdForUpdateSql,
        [id]
      )

      if (resultSelectUserExists.rowCount === 0) {
        throw new Error(`expected user does not exists`)
      }

      const rowSelectUserExists = resultSelectUserExists.rows.shift()
      if (!isRowAuthorize(rowSelectUserExists)) {
        throw new Error(`select user malformed result`)
      }

      if (rowSelectUserExists['status'] !== 'register') {
        throw new Error(`only register user can be activated`)
      }

      const resultSelectUserNick = await client.query(
        this.selectUserByNickSql,
        [nick]
      )

      if (resultSelectUserNick.rowCount !== 0) {
        throw new Error(`user nick allready used`)
      }

      const resultUpdateUser = await client.query(
        this.updateUserActivateSql,
        [
          nick,
          gender,
          'active',
          avatarTgFileId,
          about,
          rowSelectUserExists['id']
        ]
      )

      const rowUpdateUser = resultUpdateUser.rows.shift()
      if (!isRowId(rowUpdateUser)) {
        throw new Error(`update user malformed result`)
      }

      const resultSelectUpdated = await client.query(
        this.selectAuthorizeByIdForShareSql,
        [rowUpdateUser['id']]
      )

      const rowSelectUser = resultSelectUpdated.rows.shift()
      if (!isRowAuthorize(rowSelectUser)) {
        throw new Error(`select user malformed result`)
      }

      await client.query(
        this.insertUserLogSql,
        [
          rowSelectUser['id'],
          rowSelectUser['id'],
          'user_activate',
          rowSelectUser['status'],
          rowSelectUser['role'],
          { from }
        ]
      )

      const authorize = buildAuthorize(rowSelectUser)

      await client.query('COMMIT')

      return authorize
    } catch (error) {
      await client.query('ROLLBACK')

      throw error
    } finally {
      client.release()
    }
  }

  async getUser(id: number): Promise<User> {
    const client = await this.pool.connect()

    try {
      const resultSelectUser = await client.query(
        this.selectUserByIdSql,
        [id]
      )

      if (resultSelectUser.rowCount === 0) {
        throw new Error(`expected user does not exists`)
      }

      const rowSelectUser = resultSelectUser.rows.shift()
      if (!isRowUser(rowSelectUser)) {
        throw new Error(`validate RowUser failed`)
      }

      const resultSelectPhotosCount = await client.query(
        this.selectPhotosCountByUserIdSql,
        [
          rowSelectUser['id'],
          'approved'
        ]
      )

      const rowSelectPhotosCount = resultSelectPhotosCount.rows.shift()
      if (!isRowCount(rowSelectPhotosCount)) {
        throw new Error(`validate RowCount failed`)
      }

      const resultSelectCommentsCount = await client.query(
        this.selectCommentsCountByUserIdSql,
        [
          rowSelectUser['id'],
          'approved'
        ]
      )

      const rowSelectCommentsCount = resultSelectCommentsCount.rows.shift()
      if (!isRowCount(rowSelectCommentsCount)) {
        throw new Error(`validate RowCount failed`)
      }

      const user = buildUser(
        rowSelectUser,
        rowSelectPhotosCount,
        rowSelectCommentsCount
      )

      return user
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  async getTopic(id: number): Promise<Topic[]> {
    const client = await this.pool.connect()

    try {
      const resultSelectTopic = await client.query(
        this.selectTopicSql
      )

      const rowsSelectTopic = resultSelectTopic.rows
      if (!isRowsTopic(rowsSelectTopic)) {
        throw new Error(`select topic malformed result`)
      }

      const topic = buildTopic(rowsSelectTopic)

      return topic
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  async getTopics(): Promise<Topic[]> {
    const client = await this.pool.connect()

    try {
      const resultSelectTopics = await client.query(
        this.selectTopicsSql
      )

      const rowsSelectTopics = resultSelectTopics.rows
      if (!isRowsTopics(rowsSelectTopics)) {
        throw new Error(`select topics malformed result`)
      }

      const topics = buildTopics(rowsSelectTopics)

      return topics
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  async newPhoto(
    userId: number,
    topicId: number,
    tgFileId: string,
    description: string
    from: unknown
  ): Promise<Photo> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const resultSelectUser = await client.query(
        this.selectAuthorizeByIdForShareSql,
        [userId]
      )

      if (resultSelectUser.rowCount === 0) {
        throw new Error(`expected user does not exists`)
      }

      const rowSelectUser = resultSelectUser.rows.shift()
      if (!isRowAuthorize(rowSelectUser)) {
        throw new Error(`select user malformed result`)
      }

      if (rowSelectUser['status'] !== 'active') {
        throw new Error(`only active user can create photo`)
      }

      const resultSelectTopic = await client.query(
        this.selectTopicByIdForShareSql,
        [topicId]
      )

      if (resultSelectTopic.rowCount === 0) {
        throw new Error(`expected topic does not exists`)
      }

      const rowSelectTopic = resultSelectTopic.rows.shift()
      if (!isRowTopic(rowSelectTopic)) {
        throw new Error(`select topic malformed result`)
      }

      if (rowSelectTopic['status'] !== 'available') {
        throw new Error(`only in available topic can create photo`)
      }

      const resultInsertPhoto = await client.query(
        this.insertPhotoSql,
        [
          rowSelectUser['id'],
          rowSelectTopic['id'],
          tgFileId,
          description,
          { from }
        ]
      )

      const rowInsertPhoto = resultInsertPhoto.rows.shift()
      if (!isRowId(rowInsertPhoto)) {
        throw new Error(`insert photo malformed result`)
      }

      const resultSelectPhoto = await client.query(
        this.selectPhotoByIdForShareSql,
        [rowInsertPhoto['id']]
      )

      const rowSelectPhoto = resultSelectPhoto.rows.shift()
      if (!isRowPhoto(rowSelectPhoto)) {
        throw new Error(`select photo malformed result`)
      }

      await client.query(
        this.insertPhotoLogSql,
        [
          rowSelectPhoto['id'],
          rowSelectPhoto['user_id'],
          'photo_create',
          rowSelectPhoto['status'],
          { from }
        ]
      )

      const photo = buildPhoto(rowSelectPhoto)

      await client.query('COMMIT')

      return photo
    } catch (error) {
      await client.query('ROLLBACK')

      throw error
    } finally {
      client.release()
    }
  }

  async getPhotosUser(userId: number): Promise<Photo[]> {
    const client = await this.pool.connect()

    try {
      const resultSelectUser = await client.query(
        this.selectAuthorizeByIdForShareSql,
        [userId]
      )

      if (resultSelectUser.rowCount === 0) {
        throw new Error(`expected user does not exists`)
      }

      const rowSelectUser = resultSelectUser.rows.shift()
      if (!isRowAuthorize(rowSelectUser)) {
        throw new Error(`select user malformed result`)
      }

      if (rowSelectUser['status'] !== 'active') {
        throw new Error(`only active user can create photo`)
      }

      const resultSelectPhotos = await client.query(
        this.selectPhotosByUserIdSql,
        [rowSelectUser['id'], 'approved']
      )

      const rowsSelectPhotos = resultSelectPhotos.rows
      if (!isRowsPhotos(rowsSelectPhotos)) {
        throw new Error(`select photos malformed result`)
      }

      const photos = buildPhotos(rowsSelectPhotos)

      return photos
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  async newComment(
    userId: number,
    topicId: number,
    photoId: number,
    tgId: number,
    text: string,
    from: unknown
  ): Promise<Comment> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const resultSelectUser = await client.query(
        this.selectAuthorizeByIdForShareSql,
        [userId]
      )

      if (resultSelectUser.rowCount === 0) {
        throw new Error(`expected user does not exists`)
      }

      const rowSelectUser = resultSelectUser.rows.shift()
      if (!isRowAuthorize(rowSelectUser)) {
        throw new Error(`select user malformed result`)
      }

      if (rowSelectUser['status'] !== 'active') {
        throw new Error(`only active user can create comment`)
      }

      const resultSelectTopic = await client.query(
        this.selectTopicByIdForShareSql,
        [topicId]
      )

      if (resultSelectTopic.rowCount === 0) {
        throw new Error(`expected topic does not exists`)
      }

      const rowSelectTopic = resultSelectTopic.rows.shift()
      if (!isRowTopic(rowSelectTopic)) {
        throw new Error(`select topic malformed result`)
      }

      if (rowSelectTopic['status'] !== 'available') {
        throw new Error(`only in available topic can create comment`)
      }

      const resultSelectPhoto = await client.query(
        this.selectPhotoByIdForShareSql,
        [photoId]
      )

      if (resultSelectPhoto.rowCount === 0) {
        throw new Error(`expected photo does not exists`)
      }

      const rowSelectPhoto = resultSelectPhoto.rows.shift()
      if (!isRowPhoto(rowSelectPhoto)) {
        throw new Error(`select photo malformed result`)
      }

      if (rowSelectPhoto['status'] !== 'approved') {
        throw new Error(`only in approved photo can create comment`)
      }

      const resultInsertComment = await client.query(
        this.insertCommentSql,
        [
          rowSelectUser['id'],
          rowSelectTopic['id'],
          rowSelectPhoto['id'],
          tgId,
          'approved',
          text,
          { from }
        ]
      )

      const rowInsertComment = resultInsertComment.rows.shift()
      if (!isRowId(rowInsertComment)) {
        throw new Error(`insert comment malformed result`)
      }

      const resultSelectComment = await client.query(
        this.selectCommentByIdForShareSql,
        [rowInsertComment['id']]
      )

      const rowSelectComment = resultSelectComment.rows.shift()
      if (!isRowComment(rowSelectComment)) {
        throw new Error(`select comment malformed result`)
      }

      await client.query(
        this.updateUserLastActivityTimeSql,
        [rowSelectUser['id']]
      )

      await client.query(
        this.insertCommentLogSql,
        [
          rowSelectComment['id'],
          rowSelectComment['user_id'],
          'comment_create',
          rowSelectComment['status'],
          { from }
        ]
      )

      const comment = buildComment(rowSelectComment)

      await client.query('COMMIT')

      return comment
    } catch (error) {
      await client.query('ROLLBACK')

      throw error
    } finally {
      client.release()
    }
  }

  async getCommentsUser(userId: number): Promise<Comment[]> {
    const client = await this.pool.connect()

    try {
      const resultSelectUser = await client.query(
        this.selectAuthorizeByIdForShareSql,
        [userId]
      )

      if (resultSelectUser.rowCount === 0) {
        throw new Error(`expected user does not exists`)
      }

      const rowSelectUser = resultSelectUser.rows.shift()
      if (!isRowAuthorize(rowSelectUser)) {
        throw new Error(`select user malformed result`)
      }

      if (rowSelectUser['status'] !== 'active') {
        throw new Error(`only active user can create comment`)
      }

      const resultSelectComments = await client.query(
        this.selectCommentsByUserIdSql,
        [rowSelectUser['id'], 'approved']
      )

      const rowsSelectComments = resultSelectComments.rows
      if (!isRowsComments(rowsSelectComments)) {
        throw new Error(`select comments malformed result`)
      }

      const comments = buildComments(rowsSelectComments)

      return comments
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  private readonly selectAuthorizeByIdForShareSql = `
SELECT
  id, tg_from_id, nick, gender, status, role, register_time, last_activity_time
FROM users
WHERE id = $1
FOR SHARE
`

  private readonly selectAuthorizeByIdForUpdateSql = `
SELECT
  id, tg_from_id, nick, gender, status, role, register_time, last_activity_time
FROM users
WHERE id = $1
FOR UPDATE
`

  private readonly selectAuthorizeByTgIdForShareSql = `
SELECT
  id, tg_from_id, nick, gender, status, role, register_time, last_activity_time
FROM users
WHERE tg_from_id = $1
FOR SHARE
`

  private readonly selectUserByIdSql = `
SELECT
  id, tg_from_id, nick, gender, status, role, avatar_tg_file_id, about,
  register_time, last_activity_time
FROM users
WHERE id = $1
`

  private readonly selectUserByNickSql = `
SELECT id FROM users WHERE nick = $1
`

  private readonly insertUserSql = `
INSERT INTO users (
  tg_from_id, status, role
)
VALUES ($1, $2, $3)
RETURNING id
`

  private readonly updateUserActivateSql = `
UPDATE users SET
  nick = $1,
  gender = $2,
  status = $3,
  avatar_tg_file_id = $4,
  about = $5,
  last_activity_time = NOW()
WHERE id = $6
RETURNING id
`

  private readonly updateUserLastActivityTimeSql = `
UPDATE users SET
  last_activity_time = NOW()
WHERE id = $1
`

  private readonly insertUserLogSql = `
INSERT INTO user_logs (
  user_id, mod_user_id, action, status, role, data
)
VALUES ($1, $2, $3, $4, $5, $6)
`

  private readonly selectTopicByIdForShareSql = `
SELECT
  id, tg_chat_id, tg_thread_id, name, status, description, create_time
FROM topics
WHERE id = $1
FOR SHARE
`

  private readonly selectTopicByIdForUpdateSql = `
SELECT
  id, tg_chat_id, tg_thread_id, name, status, description, create_time
FROM topics
WHERE id = $1
FOR UPDATE
`

  private readonly selectTopicsSql = `
SELECT
  id, tg_chat_id, tg_thread_id, name, status, description, create_time
FROM topics
WHERE id = $1
ORDER BY id ASC
`

  private readonly insertTopicSql = `
INSERT INTO topics (
  tg_chat_id, tg_thread_id, name, description
)
VALUES ($1, $2, $3, $4)
RETURNING id
`

  private readonly insertTopicLogSql = `
INSERT INTO topic_logs (
  topic_id, mod_user_id, action, status, data
)
VALUES ($1, $2, $3, $4, $5)
`

  private readonly selectPhotoByIdForShareSql = `
SELECT
  id, user_id, topic_id, group_tg_chat_id, group_tg_message_id,
  channel_tg_chat_id, channel_tg_message_id, tg_file_id,
  description, status, create_time
FROM photos
WHERE id = $1
FOR SHARE
`

  private readonly selectPhotoByIdForUpdateSql = `
SELECT
  id, user_id, topic_id, group_tg_chat_id, group_tg_message_id,
  channel_tg_chat_id, channel_tg_message_id, tg_file_id,
  description, status, create_time
FROM photos
WHERE id = $1
FOR UPDATE
`

  private readonly selectPhotosByUserIdSql = `
SELECT
  id, user_id, topic_id, group_tg_chat_id, group_tg_message_id,
  channel_tg_chat_id, channel_tg_message_id, tg_file_id,
  description, status, create_time
FROM photos
WHERE user_id = $1 AND status = $2
ORDER BY create_time DESC
`

  private readonly selectPhotosCountByUserIdSql = `
SELECT
  COUNT(*) AS count
FROM photos
WHERE user_id = $1 AND status = $2
`

  private readonly insertPhotoSql = `
INSERT INTO photos (
  user_id, topic_id, group_tg_chat_id, group_tg_message_id,
  channel_tg_chat_id, channel_tg_message_id, tg_file_id,
  description, status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id
`

  private readonly updatePhotoStatusSql = `
UPDATE photos SET
  status = $1
WHERE id = $2
RETURNING id
`

  private readonly insertPhotoLogSql = `
INSERT INTO photo_logs (
  photo_id, mod_user_id, action, status, data
)
VALUES ($1, $2, $3, $4, $5)
`

  private readonly insertRateSql = `
INSERT INTO rates (
  user_id, topic_id, photo_id, value
)
VALUES ($1, $2, $3, $4)
RETURNING id
`

  private readonly insertRateLogSql = `
INSERT INTO rate_logs (
  rate_id, mod_user_id, action, value, data
)
VALUES ($1, $2, $3, $4, $5)
`

  private readonly selectCommentByIdForShareSql = `
SELECT
  id, user_id, topic_id, photo_id, tg_id, status, text, create_time
FROM comments
WHERE id = $1
FOR SHARE
`

  private readonly selectCommentByIdForUpdateSql = `
SELECT
  id, user_id, topic_id, photo_id, tg_id, status, text, create_time
FROM comments
WHERE id = $1
FOR UPDATE
`

  private readonly selectCommentsByUserIdSql = `
SELECT
  id, user_id, topic_id, photo_id, tg_id, status, text, create_time
FROM comments
WHERE user_id = $1 AND status = $2
ORDER BY create_time DESC
`

  private readonly selectCommentsCountByUserIdSql = `
SELECT
  COUNT(*) AS count
FROM comments
WHERE user_id = $1 AND status = $2
`

  private readonly insertCommentSql = `
INSERT INTO comments
  (user_id, topic_id, photo_id, tg_id, status, text)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id
`

  private readonly insertCommentLogSql = `
INSERT INTO comment_logs
  (comment_id, mod_user_id, action, status, data)
VALUES ($1, $2, $3, $4, $5)
`
}
