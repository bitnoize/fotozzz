import { Scenes, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppBaseScene
} from '../interfaces/app.js'
import { Navigation, Search } from '../interfaces/telegram.js'
import { User, UserFull } from '../interfaces/user.js'
import { Photo } from '../interfaces/photo.js'
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
    this.scene.action('search-prev', this.prevPhotoHandler)
    this.scene.action('search-next', this.nextPhotoHandler)
    this.scene.action('search-back', this.returnMainHandler)

    this.scene.use(this.enterSceneHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const navigation = ctx.session.navigation!

    navigation.updatable = false
    navigation.currentPage = 0
    navigation.totalPages = 0

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      await replySearchWelcome(ctx)
    } else {
      delete ctx.scene.session.search

      await ctx.scene.leave()

      await replyMainMenu(ctx)
    }
  }

  private searchUserHandler: AppContextHandler = async (ctx) => {
    const navigation = ctx.session.navigation!

    navigation.updatable = false
    navigation.currentPage = 0
    navigation.totalPages = 0

    delete ctx.scene.session.search

    if (ctx.has(message('text'))) {
      const userNick = ctx.message.text

      if (isUserNick(userNick)) {
        const userFull = await this.postgresService.searchUserFull(userNick)

        if (userFull !== undefined) {
          const search: Search = {
            userId: userFull.id
          }

          ctx.scene.session.search = search

          const photos = await this.postgresService.getPhotosUser(userFull.id)

          await replySearchUserFound(ctx, userFull, photos)
        } else {
          await replySearchUserNotFound(ctx)
        }
      } else {
        await replySearchNickWrong(ctx)
      }
    }
  }

  private prevPhotoHandler: AppContextHandler = async (ctx) => {
    const navigation = ctx.session.navigation!

    const search = ctx.scene.session.search
    if (search === undefined) {
      throw new Error(`context scene session search lost`)
    }

    if (
      navigation.currentPage > 1 &&
      navigation.currentPage <= navigation.totalPages
    ) {
      navigation.currentPage = navigation.currentPage - 1
    }

    const userFull = await this.postgresService.getUserFull(search.userId)

    const photos = await this.postgresService.getPhotosUser(userFull.id)

    await replySearchUserFound(ctx, userFull, photos)
  }

  private nextPhotoHandler: AppContextHandler = async (ctx) => {
    const navigation = ctx.session.navigation!

    const search = ctx.scene.session.search
    if (search === undefined) {
      throw new Error(`context scene session search lost`)
    }

    if (
      navigation.currentPage >= 1 &&
      navigation.currentPage < navigation.totalPages
    ) {
      navigation.currentPage = navigation.currentPage + 1
    }

    const userFull = await this.postgresService.getUserFull(search.userId)

    const photos = await this.postgresService.getPhotosUser(userFull.id)

    await replySearchUserFound(ctx, userFull, photos)
  }
}
