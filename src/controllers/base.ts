import { AppOptions } from '../interfaces/app.js'
import { RedisService } from '../services/redis.js'
import { PostgresService } from '../services/postgres.js'

export abstract class BaseController {
  protected redisService = RedisService.instance()
  protected postgresService = PostgresService.instance()

  constructor(protected readonly options: AppOptions) {}
}
