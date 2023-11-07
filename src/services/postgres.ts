import pg from 'pg'
import { PostgresServiceOptions } from '../interfaces/postgres.js'
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

  async checkConnection(): Promise<void> {
    const client = await this.pool.connect()
    await client.query('SELECT 1')
    client.release()
  }
}
