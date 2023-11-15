import pg from 'pg'
import { PostgresServiceOptions } from '../interfaces/postgres.js'
import { SessionUser, User, UserGender } from '../interfaces/user.js'
import {
  isRowId,
  isRowSessionUser,
  isRowUser,
  buildSessionUser,
  buildUser
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

        if (resultInsert.rowCount === 0) {
          throw new Error(`no user row inserted`)
        }

        const rowInsert = resultInsert.rows.shift()
        if (!isRowId(rowInsert)) {
          throw new Error(`inserted row validation failed`)
        }

        const resultSelectInserted = await client.query(
          this.authorizeUserSelectInsertedSql,
          [rowInsert['id']]
        )

        if (resultSelectInserted.rowCount === 0) {
          throw new Error(`no user row selected after insert`)
        }

        const rowSelectInserted = resultSelectInserted.rows.shift()
        if (!isRowSessionUser(rowSelectInserted)) {
          throw new Error(`selected row validation failed`)
        }

        const resultInsertLog = await client.query(
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

        if (resultInsertLog.rowCount === 0) {
          throw new Error(`no user_log row inserted`)
        }

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
    } catch (error) {
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
        throw new Error(`no row select lock`)
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

      if (resultUpdate.rowCount === 0) {
        throw new Error(`no user row updated`)
      }

      const rowUpdate = resultUpdate.rows.shift()
      if (!isRowId(rowUpdate)) {
        throw new Error(`updated row validation failed`)
      }

      const resultSelectUpdated = await client.query(
        this.activateUserSelectUpdatedSql,
        [rowUpdate['id']]
      )

      if (resultSelectUpdated.rowCount === 0) {
        throw new Error(`no user row selected after update`)
      }

      const rowSelectUpdated = resultSelectUpdated.rows.shift()
      if (!isRowSessionUser(rowSelectUpdated)) {
        throw new Error(`selected row validation failed`)
      }

      const resultInsertLog = await client.query(
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

      if (resultInsertLog.rowCount === 0) {
        throw new Error(`no user_log row inserted`)
      }

      const sessionUser = buildSessionUser(rowSelectUpdated)

      await client.query('COMMIT')

      return sessionUser
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

  private readonly commonUserLogInsertSql = `
INSERT INTO user_logs
  (user_id, mod_user_id, action, status, role, data)
VALUES ($1, $2, $3, $4, $5, $6)
`

  private readonly getUserSelectSql = `
SELECT
  id, tg_id, nick, gender, status, role, avatar_tg_file_id, about,
  register_time, last_activity_time
FROM users
WHERE id = $1
FOR SHARE
`
}
