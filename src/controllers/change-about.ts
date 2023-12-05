import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppWizardScene
} from '../interfaces/app.js'
import { ChangeAbout } from '../interfaces/telegram.js'
import {
  isUserAbout,
  isChangeAbout,
  replyMainMenu,
  replyChangeAboutAbout,
  replyChangeAboutAboutWrong
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ChangeAboutController extends BaseController {
  readonly scene: AppWizardScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene<AppContext>(
      'change-about',
      this.startSceneHandler,
      this.quaereAboutHandler,
      this.answerAboutComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize!

    this.resetNavigation(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      ctx.scene.session.changeAbout = {} as Partial<ChangeAbout>

      ctx.wizard.next()

      if (typeof ctx.wizard.step === 'function') {
        return ctx.wizard.step(ctx, next)
      }
    }

    await ctx.scene.leave()

    await replyMainMenu(ctx)
  }

  private quaereAboutHandler: AppContextHandler = async (ctx) => {
    await replyChangeAboutAbout(ctx)

    ctx.wizard.next()
  }

  private answerAboutComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('text', this.answerAboutInputHandler)
    composer.action('change-about-back', this.returnProfileHandler)
    composer.use(this.answerAboutUnknownHandler)

    return composer
  }

  private answerAboutInputHandler: AppContextHandler = async (ctx, next) => {
    const changeAbout = ctx.scene.session.changeAbout!

    if (ctx.has(message('text'))) {
      const about = ctx.message.text

      if (isUserAbout(about)) {
        changeAbout.about = about

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      } else {
        await replyChangeAboutAboutWrong(ctx)
      }
    }
  }

  private answerAboutUnknownHandler: AppContextHandler = async (ctx) => {
    await replyChangeAboutAbout(ctx)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const changeAbout = ctx.scene.session.changeAbout!

    if (!isChangeAbout(changeAbout)) {
      throw new Error(`scene session changeAbout data malformed`)
    }

    await this.postgresService.setUserAbout(
      authorize.id,
      changeAbout.about
    )

    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }
}
