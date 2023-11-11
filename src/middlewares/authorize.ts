import { AppContextHandler } from '../interfaces/app.js'
import { PostgresService } from '../services/postgres.js'

export const authorize: AppContextHandler = async (ctx, next) => {
  const postgresService = PostgresService.instance()

}
