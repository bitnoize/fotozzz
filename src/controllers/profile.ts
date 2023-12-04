import { Scenes, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppBaseScene
} from '../interfaces/app.js'
import { UserFull } from '../interfaces/user.js'
import { replyMainMenu, replyProfileMenu } from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ProfileController extends BaseController {
  readonly scene: AppBaseScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.BaseScene<AppContext>('profile')

    this.scene.enter(this.enterSceneHandler)

    this.scene.action('profile-change-avatar', this.changeAvatarHandler)
    this.scene.action('profile-change-about', this.changeAboutHandler)
    this.scene.action('profile-back', this.returnMainHandler)

    this.scene.use(this.enterSceneHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const navigation = ctx.session.navigation!

    navigation.updatable = false

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      const userFull = await this.postgresService.getUserFull(authorize.id)

      await replyProfileMenu(ctx, userFull)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx)
    }
  }

  private changeAvatarHandler: AppContextHandler = async (ctx) => {
    await ctx.scene.leave()

    await ctx.scene.enter('change-avatar')
  }

  private changeAboutHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()

    await ctx.scene.enter('change-about')
  }
}
