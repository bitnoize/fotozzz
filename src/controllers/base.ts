import { Markup } from 'telegraf'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppContextExceptionHandler,
  AppBaseScene,
  AppWizardScene,
  Controller
} from '../interfaces/app.js'
import { RedisService } from '../services/redis.js'
import { PostgresService } from '../services/postgres.js'
import { replyMainMenu, replyMainError } from '../helpers/telegram.js'
import { logger } from '../logger.js'

export abstract class BaseController implements Controller {
  abstract readonly scene: AppBaseScene | AppWizardScene

  protected redisService = RedisService.instance()
  protected postgresService = PostgresService.instance()

  constructor(protected readonly options: AppOptions) {}

  protected exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`Scene ${this.scene.id} error: ${error.message}`)
      console.error(error.stack)
    }

    //console.dir(ctx, { depth: 4 })

    await ctx.scene.leave()

    await replyMainError(ctx)
  }

  protected returnMainHandler: AppContextHandler = async (ctx) => {
    const navigation = ctx.session.navigation!

    navigation.updatable = false

    await ctx.scene.leave()

    await replyMainMenu(ctx)
  }
}
