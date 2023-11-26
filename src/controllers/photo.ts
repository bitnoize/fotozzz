import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  AppContext,
  DeletePhoto,
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
    this.scene.action(/^photo-delete-(\d+)$/, this.deletePhotoHandler)
    this.scene.action('photo-back', this.returnMainHandler)

    this.scene.use(this.enterSceneHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    resetNavigation(navigation)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      const photos = await this.postgresService.getPhotosUser(authorize.id)

      await replyPhotoMenu(ctx, authorize, navigation, photos)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx, authorize, navigation)
    }
  }

  private prevPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    navigationPrevPage(navigation)

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    await replyPhotoMenu(ctx, authorize, navigation, photos)
  }

  private nextPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    navigationNextPage(navigation)

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    await replyPhotoMenu(ctx, authorize, navigation, photos)
  }

  private deletePhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    const photoId = parseInt(ctx.match[1])

    if (photoId != null && typeof photoId === 'number') {
      const photo = photos.find((photo) => photo.id === photoId)

      if (photo !== undefined) {
        const deletePhoto: DeletePhoto = {
          id: photo.id,
          tgFileId: photo.tgFileId,
          description: photo.description
        }

        resetNavigation(navigation)

        await ctx.scene.leave()

        await ctx.scene.enter('delete-photo', { deletePhoto })
      } else {
        throw new Error(`can't find photo`)
      }
    } else {
      await replyPhotoMenu(ctx, authorize, navigation, photos)
    }
  }

  private newPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    resetNavigation(navigation)

    await ctx.scene.leave()

    await ctx.scene.enter('new-photo')
  }

  private returnMainHandler: AppContextHandler = async (ctx) => {
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
