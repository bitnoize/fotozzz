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
  resetNavigation,
  navigationNextPage,
  navigationPrevPage,
  sureSessionAuthorize,
  sureSessionNavigation,
  initSceneSessionDeletePhoto,
  replyMainMenu,
  replyMainError,
  replyPhotoMenu
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class PhotoController implements Controller {
  scene: Scenes.BaseScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.BaseScene<AppContext>('photo')

    this.scene.enter(this.enterSceneHandler)

    this.scene.action('photo-prev', this.prevPhotoHandler)
    this.scene.action('photo-next', this.nextPhotoHandler)
    this.scene.action('photo-new', this.newPhotoHandler)
    this.scene.action(/^photo-delete-photo-(\d+)$/, this.deletePhotoHandler)
    this.scene.action('photo-back', this.returnMainHandler)

    this.scene.use(this.enterSceneHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      const photos = await this.postgresService.getPhotosUser(authorize.id)

      await replyPhotoMenu(ctx, authorize, navigation, photos)
    } else {
      resetNavigation(navigation)

      await ctx.scene.leave()

      await replyMainMenu(ctx, authorize, navigation)
    }
  }

  private prevPhotoHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    navigationPrevPage(navigation)

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    await replyPhotoMenu(ctx, authorize, navigation, photos)
  }

  private nextPhotoHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    navigationNextPage(navigation)

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    await replyPhotoMenu(ctx, authorize, navigation, photos)
  }

  private deletePhotoHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    const photoId = parseInt(ctx.match[1])

    if (
      photoId != null &&
      typeof photoId === 'number' &&
      photos.map((photo) => photo.id).indexOf(photoId) != -1
    ) {
      resetNavigation(navigation)

      initSceneSessionDeletePhoto(ctx, photoId)

      await ctx.scene.leave()

      await ctx.scene.enter('delete-photo')
    } else {
      await replyPhotoMenu(ctx, authorize, navigation, photos)
    }
  }

  private newPhotoHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    resetNavigation(navigation)

    await ctx.scene.leave()

    await ctx.scene.enter('new-photo')
  }

  private returnMainHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    resetNavigation(navigation)

    await ctx.scene.leave()

    await replyMainMenu(ctx, authorize, navigation)
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`PhotoScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    await ctx.scene.leave()

    await replyMainError(ctx)
  }
}
