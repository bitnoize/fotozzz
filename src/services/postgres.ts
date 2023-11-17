import pg from 'pg'
import { PostgresServiceOptions } from '../interfaces/postgres.js'
import { SessionUser, User, UserGender } from '../interfaces/user.js'
import {
  isRowId,
  isRowCount,
  isRowSessionUser,
  isRowUser,
  isRowPhoto,
  isRowsPhotos,
  buildSessionUser,
  buildUser,
  buildPhoto,
  buildPhotos
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

  async authorizeUser(tgId: number, from: unknown): Promise<SessionUser> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      let sessionUser: SessionUser

      const resultSelectExists = await client.query(
        this.authorizeUserSelectExistsSql,
        [tgId]
      )

      if (resultSelectExists.rowCount === 0) {
        const resultInsert = await client.query(
          this.authorizeUserInsertSql,
          [tgId, 'register', 'user']
        )

        const rowInsert = resultInsert.rows.shift()
        if (!isRowId(rowInsert)) {
          throw new Error(`inserted row validation failed`)
        }

        const resultSelectInserted = await client.query(
          this.authorizeUserSelectInsertedSql,
          [rowInsert['id']]
        )

        const rowSelectInserted = resultSelectInserted.rows.shift()
        if (!isRowSessionUser(rowSelectInserted)) {
          throw new Error(`selected row validation failed`)
        }

        await client.query(
          this.commonUserLogInsertSql,
          [
            rowSelectInserted['id'],
            rowSelectInserted['id'],
            'user_register',
            rowSelectInserted['status'],
            rowSelectInserted['role'],
            { from }
          ]
        )

        sessionUser = buildSessionUser(rowSelectInserted)
      } else {
        const rowSelectExists = resultSelectExists.rows.shift()
        if (!isRowSessionUser(rowSelectExists)) {
          throw new Error(`selected row validation failed`)
        }

        sessionUser = buildSessionUser(rowSelectExists)
      }

      await client.query('COMMIT')

      return sessionUser
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
      const resultSelect = await client.query(
        this.checkUserNickSelectSql,
        [nick]
      )

      return resultSelect.rowCount === 0 ? true : false
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
  ): Promise<SessionUser> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const resultSelectLock = await client.query(
        this.activateUserSelectLockSql,
        [id]
      )

      if (resultSelectLock.rowCount === 0) {
        throw new Error(`expected user ${id} not exists`)
      }

      const rowSelectLock = resultSelectLock.rows.shift()
      if (!isRowSessionUser(rowSelectLock)) {
        throw new Error(`select row validation failed`)
      }

      if (rowSelectLock['status'] !== 'register') {
        throw new Error(`only register users can be activated`)
      }

      const resultSelectNick = await client.query(
        this.activateUserSelectNickSql,
        [nick]
      )

      if (resultSelectNick.rowCount !== 0) {
        throw new Error(`register nick allready exists`)
      }

      const resultUpdate = await client.query(
        this.activateUserUpdateSql,
        [
          nick,
          gender,
          avatarTgFileId,
          about,
          rowSelectLock['id']
        ]
      )

      const rowUpdate = resultUpdate.rows.shift()
      if (!isRowId(rowUpdate)) {
        throw new Error(`updated row validation failed`)
      }

      const resultSelectUpdated = await client.query(
        this.activateUserSelectUpdatedSql,
        [rowUpdate['id']]
      )

      const rowSelectUpdated = resultSelectUpdated.rows.shift()
      if (!isRowSessionUser(rowSelectUpdated)) {
        throw new Error(`selected row validation failed`)
      }

      await client.query(
        this.commonUserLogInsertSql,
        [
          rowSelectUpdated['id'],
          rowSelectUpdated['id'],
          'user_activate',
          rowSelectUpdated['status'],
          rowSelectUpdated['role'],
          { from }
        ]
      )

      const sessionUser = buildSessionUser(rowSelectUpdated)

      await client.query('COMMIT')

      return sessionUser
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
      const resultSelect = await client.query(
        this.getUserSelectSql,
        [id]
      )

      if (resultSelect.rowCount === 0) {
        throw new Error(`expected user ${id} not exists`)
      }

      const rowSelect = resultSelect.rows.shift()
      if (!isRowUser(rowSelect)) {
        throw new Error(`selected row validation failed`)
      }

      const resultSelectPhotosCount = await client.query(
        this.getUserSelectPhotosCountSql,
        [id]
      )

      const rowSelectPhotosCount = resultSelectPhotosCount.rows.shift()
      if (!isRowCount(rowSelectPhotosCount)) {
        throw new Error(`selected row count validation failed`)
      }

      const resultSelectCommentsCount = await client.query(
        this.getUserSelectCommentsCountSql,
        [id]
      )

      const rowSelectCommentsCount = resultSelectCommentsCount.rows.shift()
      if (!isRowCount(rowSelectCommentsCount)) {
        throw new Error(`selected row count validation failed`)
      }

      const user = buildUser(
        rowSelect,
        rowSelectPhotosCount.count,
        rowSelectCommentsCount.count
      )

      return user
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  async newPhoto(
    userId: number,
    topicId: number,
    tgId: number,
    tgFileId: string
    from: unknown
  ): Promise<Photo> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const resultSelectLock = await client.query(
        this.commonSessionUserSelectLockSql,
        [userId]
      )

      if (resultSelectLock.rowCount === 0) {
        throw new Error(`expected user ${userId} not exists`)
      }

      const rowSelectLock = resultSelectLock.rows.shift()
      if (!isRowSessionUser(rowSelectLock)) {
        throw new Error(`select row validation failed`)
      }

      if (rowSelectLock['status'] !== 'active') {
        throw new Error(`only active users can post photos`)
      }

      const resultInsert = await client.query(
        this.newPhotoInsertSql,
        [
          userId,
          topicId,
          tgId,
          tgFileId,
          { from }
        ]
      )

      const rowInsert = resultInsert.rows.shift()
      if (!isRowId(rowInsert)) {
        throw new Error(`inserted row validation failed`)
      }

      const resultSelectInserted = await client.query(
        this.newPhotoSelectInsertedSql,
        [rowInsert['id']]
      )

      const rowSelectInserted = resultSelectInserted.rows.shift()
      if (!isRowPhoto(rowSelectInserted)) {
        throw new Error(`selected row validation failed`)
      }

      await client.query(
        this.commonPhotoLogInsertSql,
        [
          rowSelectInserted['id'],
          rowSelectInserted['user_id'],
          'photo_create',
          rowSelectInserted['status'],
          { from }
        ]
      )

      const photo = buildPhoto(rowSelectInserted)

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
      const resultSelect = await client.query(
        this.getPhotosUserSelectSql,
        [userId]
      )

      const rowsSelect = resultSelect.rows
      if (!isRowsPhotos(rowsSelect)) {
        throw new Error(`selected rows validation failed`)
      }

      const photos = buildPhotos(rowsSelect)

      return photos
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  async getCommentsUser(userId: number): Promise<Comment[]> {
    const client = await this.pool.connect()

    try {
      const resultSelect = await client.query(
        this.getCommentsUserSelectSql,
        [userId]
      )

      const rowsSelect = resultSelect.rows
      if (!isRowsComments(rowsSelect)) {
        throw new Error(`selected rows validation failed`)
      }

      const comments = buildComments(rowsSelect)

      return comments
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  private readonly authorizeUserSelectExistsSql = `
SELECT
  id, tg_id, nick, gender, status, role, register_time, last_activity_time
FROM users
WHERE tg_id = $1
FOR SHARE
`

  private readonly authorizeUserInsertSql = `
INSERT INTO users
  (tg_id, status, role)
VALUES ($1, $2, $3)
RETURNING id
`

  private readonly authorizeUserSelectInsertedSql = `
SELECT
  id, tg_id, nick, gender, status, role, register_time, last_activity_time
FROM users
WHERE id = $1
FOR SHARE
`

  private readonly checkUserNickSelectSql = `
SELECT id FROM users WHERE nick = $1
`

  private readonly activateUserSelectLockSql = `
SELECT
  id, tg_id, nick, gender, status, role, register_time, last_activity_time
FROM users
WHERE id = $1
FOR UPDATE
`

  private readonly activateUserSelectNickSql = `
SELECT id FROM users WHERE nick = $1 FOR SHARE
`

  private readonly activateUserUpdateSql = `
UPDATE users SET
  nick = $1,
  gender = $2,
  status = 'active',
  avatar_tg_file_id = $3,
  about = $4,
  last_activity_time = NOW()
WHERE id = $5
RETURNING id
`

  private readonly activateUserSelectUpdatedSql = `
SELECT
  id, tg_id, nick, gender, status, role, register_time, last_activity_time
FROM users
WHERE id = $1
FOR SHARE
`

  private readonly getUserSelectSql = `
SELECT
  id, tg_id, nick, gender, status, role, avatar_tg_file_id, about,
  register_time, last_activity_time
FROM users
WHERE id = $1
`

  private readonly getUserSelectPhotosCountSql = `
SELECT
  COUNT() AS count
FROM photos
WHERE user_id = $1 AND status IN ('unknown', 'approved')
`

  private readonly getUserSelectCommentsCountSql = `
SELECT
  COUNT() AS count
FROM comments
WHERE user_id = $1 AND status IN ('unknown', 'approved')
`

  private readonly getPhotosUserSelectSql = `
SELECT
  id, user_id, topic_id, tg_id, tg_file_id, status, create_time
FROM photos
WHERE user_id = $1 AND status IN ('unknown', 'approved')
ORDER BY create_time DESC
`

  private readonly getCommentsUserSelectSql = `
SELECT
  id, user_id, topic_id, photo_id, tg_id, status, text, create_time
FROM comments
WHERE user_id = $1 AND status IN ('unknown', 'approved')
ORDER BY create_time DESC
`

  private readonly newPhotoInsertSql = `
INSERT INTO photos
  (user_id, topic_id, tg_id, tg_file_id, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id
`

  private readonly newRateInsertSql = `
INSERT INTO rates
  (user_id, topic_id, photo_id, tg_id, value)
VALUES ($1, $2, $3, $4, $5)
RETURNING id
`

  private readonly newCommentInsertSql = `
INSERT INTO comments
  (user_id, topic_id, photo_id, tg_id, status, text)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id
`

  private readonly commonUserSelectLockSql = `
SELECT
  id, tg_id, nick, gender, status, role, register_time, last_activity_time
FROM users
WHERE id = $1
FOR SHARE
`

  private readonly commonUserLogInsertSql = `
INSERT INTO user_logs
  (user_id, mod_user_id, action, status, role, data)
VALUES ($1, $2, $3, $4, $5, $6)
`

  private readonly commonTopicLogInsertSql = `
INSERT INTO topic_logs
  (topic_id, mod_user_id, action, status, data)
VALUES ($1, $2, $3, $4, $5)
`

  private readonly commonPhotoLogInsertSql = `
INSERT INTO photo_logs
  (photo_id, mod_user_id, action, status, data)
VALUES ($1, $2, $3, $4, $5)
`

  private readonly commonRateLogInsertSql = `
INSERT INTO rate_logs
  (rate_id, mod_user_id, action, value, data)
VALUES ($1, $2, $3, $4, $5)
`

  private readonly commonCommentLogInsertSql = `
INSERT INTO comment_logs
  (comment_id, mod_user_id, action, status, data)
VALUES ($1, $2, $3, $4, $5)
`
}
