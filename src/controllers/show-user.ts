import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppBaseScene
} from '../interfaces/app.js'
import {
  isUserNick,
  replyMainMenu,
  replyShowUserMenu
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ShowUserController extends BaseController {
  readonly scene: AppBaseScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.BaseScene<AppContext>('show-user')

    this.scene.enter(this.enterSceneHandler)

    this.scene.action('show-user-prev', this.prevPhotoHandler)
    this.scene.action('show-user-next', this.nextPhotoHandler)
    this.scene.action('show-user-back', this.returnSearchHandler)

    this.scene.use(this.enterSceneHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const showUser = ctx.scene.state.showUser

    this.resetNavigation(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (
      showUser !== undefined &&
      allowedStatuses.includes(authorize.status)
    ) {
      ctx.scene.session.showUser = showUser

      const userFull = await this.postgresService.getUserFull(showUser.userId)
      const photos = await this.postgresService.getPhotosUser(showUser.userId)

      await replyShowUserMenu(ctx, userFull, photos)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx)
    }
  }

  private prevPhotoHandler: AppContextHandler = async (ctx) => {
    const showUser = ctx.scene.session.showUser!

    this.prevPageNavigation(ctx)

    const userFull = await this.postgresService.getUserFull(showUser.userId)
    const photos = await this.postgresService.getPhotosUser(showUser.userId)

    await replyShowUserMenu(ctx, userFull, photos)
  }

  private nextPhotoHandler: AppContextHandler = async (ctx) => {
    const showUser = ctx.scene.session.showUser!

    this.nextPageNavigation(ctx)

    const userFull = await this.postgresService.getUserFull(showUser.userId)
    const photos = await this.postgresService.getPhotosUser(showUser.userId)

    await replyShowUserMenu(ctx, userFull, photos)
  }
}
