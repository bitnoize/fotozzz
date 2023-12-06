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
    this.resetNavigation(ctx)

    await ctx.scene.leave()

    await replyMainMenu(ctx)
  }

  protected returnProfileHandler: AppContextHandler = async (ctx) => {
    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }

  protected returnPhotoHandler: AppContextHandler = async (ctx) => {
    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }

  protected returnSearchHandler: AppContextHandler = async (ctx) => {
    await ctx.scene.leave()

    await ctx.scene.enter('search')
  }

  protected resetNavigation = (ctx: AppContext) => {
    const navigation = ctx.session.navigation!

    navigation.updatable = false
    navigation.currentPage = 0
    navigation.totalPages = 0
  }

  protected prevPageNavigation = (ctx: AppContext) => {
    const navigation = ctx.session.navigation!

    if (
      navigation.currentPage > 1 &&
      navigation.currentPage <= navigation.totalPages
    ) {
      navigation.currentPage = navigation.currentPage - 1
    }
  }

  protected nextPageNavigation = (ctx: AppContext) => {
    const navigation = ctx.session.navigation!

    if (
      navigation.currentPage >= 1 &&
      navigation.currentPage < navigation.totalPages
    ) {
      navigation.currentPage = navigation.currentPage + 1
    }
  }
}
