import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  Navigation,
  AppContext,
  AppContextHandler,
  AppContextExceptionHandler
} from '../interfaces/app.js'
import { RedisService } from '../services/redis.js'
import { PostgresService } from '../services/postgres.js'
import {
  sureSessionAuthorize,
  sureSessionNavigation,
  replyMainMenu,
  replyMainError,
  replyProfileMenu,
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ProfileController implements Controller {
  scene: Scenes.BaseScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.BaseScene<AppContext>('profile')

    this.scene.enter(this.enterSceneHandler)

    this.scene.action('profile-change-avatar', this.changeAvatarHandler)
    this.scene.action('profile-change-about', this.changeAboutHandler)
    this.scene.action('profile-back', this.returnMainHandler)

    this.scene.use(this.enterSceneHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      const userFull = await this.postgresService.getUserFull(authorize.id)

      await replyProfileMenu(ctx, authorize, navigation, userFull)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx, authorize, navigation)
    }
  }

  private changeAvatarHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()

    await ctx.scene.enter('change-avatar')
  }

  private changeAboutHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()

    await ctx.scene.enter('change-about')
  }

  private returnMainHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await ctx.scene.leave()

    await replyMainMenu(ctx, authorize, navigation)
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`ProfileScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    await ctx.scene.leave()

    await replyMainError(ctx)
  }
}
