import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  AppContext,
  AppContextHandler,
  AppContextExceptionHandler
} from '../interfaces/app.js'
import { RedisService } from '../services/redis.js'
import { PostgresService } from '../services/postgres.js'
import {
  wizardNextStep,
  sureSessionAuthorize,
  sureSessionNavigation,
  initSceneSessionChangeAbout,
  sureSceneSessionChangeAbout,
  dropSceneSessionChangeAbout,
  isUserAbout,
  isChangeAbout,
  replyMainMenu,
  replyMainError,
  replyChangeAboutAbout,
  replyChangeAboutAboutWrong
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ChangeAboutController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'change-about',
      this.startSceneHandler,
      this.queryAboutHandler,
      this.replyAboutComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    initSceneSessionChangeAbout(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      return wizardNextStep(ctx, next)
    }

    dropSceneSessionChangeAbout(ctx)

    await ctx.scene.leave()

    await replyMainMenu(ctx, authorize, navigation)
  }

  private queryAboutHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyChangeAboutAbout(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyAboutComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('text', this.replyAboutInputHandler)
    composer.action('change-about-back', this.returnProfileHandler)
    composer.use(this.replyAboutUnknownHandler)

    return composer
  }

  private replyAboutInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const changeAbout = sureSceneSessionChangeAbout(ctx)

    if (ctx.has(message('text'))) {
      const userAbout = ctx.message.text

      if (isUserAbout(userAbout)) {
        changeAbout.about = userAbout

        return wizardNextStep(ctx, next)
      } else {
        await replyChangeAboutAboutWrong(ctx, authorize, navigation)
      }
    }
  }

  private replyAboutUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyChangeAboutAbout(ctx, authorize, navigation)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const changeAbout = sureSceneSessionChangeAbout(ctx)

    if (!isChangeAbout(changeAbout)) {
      throw new Error(`scene session changeAbout data malformed`)
    }

    await this.postgresService.setUserAbout(authorize.id, changeAbout.about)

    dropSceneSessionChangeAbout(ctx)

    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }

  private returnProfileHandler: AppContextHandler = async (ctx, next) => {
    dropSceneSessionChangeAbout(ctx)

    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`ChangeAboutScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    dropSceneSessionChangeAbout(ctx)

    await ctx.scene.leave()

    await replyMainError(ctx)
  }
}
