import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppBaseScene
} from '../interfaces/app.js'
import { ShowUser } from '../interfaces/telegram.js'
import {
  isUserNick,
  replyMainMenu,
  replySearchWelcome,
  replySearchNickWrong,
  replySearchUserNotFound,
  replySearchUserFound
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class SearchController extends BaseController {
  readonly scene: AppBaseScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.BaseScene<AppContext>('search')

    this.scene.enter(this.enterSceneHandler)

    this.scene.on('text', this.searchUserHandler)
    this.scene.action(/^search-show-(\d+)$/, this.showUserHandler)
    this.scene.action('search-back', this.returnMainHandler)

    this.scene.use(this.enterSceneHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!

    this.resetNavigation(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      await replySearchWelcome(ctx)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx)
    }
  }

  private searchUserHandler: AppContextHandler = async (ctx) => {
    if (ctx.has(message('text'))) {
      const userNick = ctx.message.text

      if (isUserNick(userNick)) {
        const userFull = await this.postgresService.searchUserFull(userNick)

        if (userFull !== undefined) {
          await replySearchUserFound(ctx, userFull)
        } else {
          await replySearchUserNotFound(ctx)
        }
      } else {
        await replySearchNickWrong(ctx)
      }
    }
  }

  private showUserHandler: AppContextHandler = async (ctx) => {
    const userId = parseInt(ctx.match[1])

    if (userId != null && typeof userId === 'number') {
      const showUser: ShowUser = {
        userId
      }

      await ctx.scene.leave()

      await ctx.scene.enter('show-user', { showUser })
    } else {
      await replySearchWelcome(ctx)
    }
  }
}
