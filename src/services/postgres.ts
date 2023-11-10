import pg from 'pg'
import {
  PostgresServiceOptions,
  PostgresSerial,
  PostgresUser
} from '../interfaces/postgres.js'
import { User, UserGender } from '../interfaces/user.js'
import { USER_FIELDS } from '../constants.js'
import { isPostgresSerial, isPostgresUser } from '../helpers.js'
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

  async authorizeUser(tgId: number): Promise<User | undefined> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      let user: User

      const resultSelectExists = await client.query(
        this.authorizeUserSelectExistsSql,
        [tgId]
      )

      if (resultSelectExists.rowCount === 0) {
        const resultInsert = await client.query(
          this.authorizeUserInsertSql,
          [tgId]
        )

        if (resultInsert.rowCount === 0) {
          throw new Error(`no user row inserted`)
        }

        const postgresSerial = resultInsert.rows.shift()
        if (!isPostgresSerial(postgresSerial)) {
          throw new Error(`postgresSerial validation failed`)
        }

        const resultSelectInserted = await client.query(
          this.authorizeUserSelectInsertedSql,
          [postgresSerial.id]
        )

        if (resultSelectInserted.rowCount !== 1) {
          throw new Error(`no user row selected after insert`)
        }

        const postgresUser = resultSelectInserted.rows.shift()
        if (!isPostgresUser(postgresUser)) {
          throw new Error(`postgresUser validation failed`)
        }

        user = this.buildUser(postgresUser)
      } else {
        const postgresUser = resultSelectExists.rows.shift()
        if (!isPostgresUser(postgresUser)) {
          throw new Error(`postgresUser validation failed`)
        }

        user = this.buildUser(postgresUser)
      }

      await client.query('COMMIT')

      return user
    } catch (error) {
      logger.error(error.toString())

      return undefined
    } finally {
      client.release()
    }
  }

  async checkUserNick(nick: string): Promise<boolean | undefined> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        this.checkUserNickSelectSql,
        [nick]
      )

      return result.rowCount === 0 ? true : false
    } catch (error) {
      logger.error(error.toString)

      return undefined
    } finally {
      client.release()
    }
  }

  async activateUser(
    id: number,
    nick: string,
    gender: UserGender,
    avatar: string,
    about: string
  ): Promise<User | undefined> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const resultSelectLock = await client.query(
        this.activateUserSelectLockSql,
        [id]
      )

      if (resultSelectLock.rowCount === 0) {
        throw new Error(`no select lock`)
      }

      const postgresUserLock = resultSelectLock.rows.shift()
      if (!isPostgresUser(postgresUserLock)) {
        throw new Error(`postgresUserLock validation failed`)
      }

      const userLock = this.buildUser(postgresUserLock)

      if (userLock.status !== 'blank') {
        throw new Error(`only blank users can be activated`)
      }

      // ... other checks here

      const resultSelectNick = await client.query(
        this.activateUserSelectNickSql,
        [nick]
      )

      if (resultSelectNick.rowCount !== 0) {
        throw new Error(`nick allready exists`)
      }

      const resultUpdate = await client.query(
        this.activateUserUpdateSql,
        [nick, gender, avatar, about, id]
      )

      if (resultUpdate.rowCount === 0) {
        throw new Error(`no user row updated`)
      }

      const resultSelectUpdated = await client.query(
        this.activateUserSelectUpdatedSql,
        [id]
      )

      if (resultSelectUpdated.rowCount !== 1) {
        throw new Error(`no user row selected after update`)
      }

      const postgresUser = resultSelectUpdated.rows.shift()
      if (!isPostgresUser(postgresUser)) {
        throw new Error(`postgresUser validation failed`)
      }

      const user = this.buildUser(postgresUser)

      await client.query('COMMIT')

      return user
    } catch (error) {
      logger.error(error.toString())

      return undefined
    } finally {
      client.release()
    }
  }

  private buildUser = (postgresUser: PostgresUser): User => {
    const user: User = {
      id: postgresUser['id'],
      tgId: postgresUser['tg_id'],
      nick: postgresUser['nick'],
      gender: postgresUser['gender'],
      status: postgresUser['status'],
      role: postgresUser['role'],
      registerDate: postgresUser['register_date'],
      lastActivity: postgresUser['last_activity']
    }

    return user
  }

  private readonly authorizeUserSelectExistsSql = `
SELECT
  ${USER_FIELDS.join(', ')}
FROM users
WHERE tg_id = $1
FOR SHARE
`

  private readonly authorizeUserInsertSql = `
INSERT INTO users
  (tg_id, register_date, last_activity)
VALUES ($1, NOW(), NOW())
RETURNING id
`

  private readonly authorizeUserSelectInsertedSql = `
SELECT
  ${USER_FIELDS.join(', ')}
FROM users
WHERE id = $1
FOR SHARE
`

  private readonly checkUserNickSelectSql = `
SELECT id FROM users WHERE nick = $1
`

  private readonly activateUserSelectLockSql = `
SELECT
  ${USER_FIELDS.join(', ')}
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
  last_activity = NOW(),
  avatar = $3,
  about = $4
WHERE id = $5
RETURNING id
`

  private readonly activateUserSelectUpdatedSql = `
SELECT
  ${USER_FIELDS.join(', ')}
FROM users
WHERE id = $1
FOR SHARE
`
}
