import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppBaseScene
} from '../interfaces/app.js'
import { DeletePhoto } from '../interfaces/telegram.js'
import { replyMainMenu, replyPhotoMenu } from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class PhotoController extends BaseController {
  readonly scene: AppBaseScene

  constructor(options: AppOptions) {
    super(options)

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
    const authorize = ctx.session.authorize!

    this.resetNavigation(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      const photos = await this.postgresService.getPhotosUser(authorize.id)

      await replyPhotoMenu(ctx, authorize, photos)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx)
    }
  }

  private prevPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!

    this.prevPageNavigation(ctx)

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    await replyPhotoMenu(ctx, authorize, photos)
  }

  private nextPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!

    this.nextPageNavigation(ctx)

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    await replyPhotoMenu(ctx, authorize, photos)
  }

  private deletePhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!

    const photos = await this.postgresService.getPhotosUser(authorize.id)

    const photoId = parseInt(ctx.match[1])

    if (photoId != null && typeof photoId === 'number') {
      const photo = photos.find((photo) => photo.id === photoId)

      if (photo !== undefined) {
        const deletePhoto: DeletePhoto = {
          photoId: photo.id
        }

        await ctx.scene.leave()

        await ctx.scene.enter('delete-photo', { deletePhoto })
      } else {
        throw new Error(`can't find photo ${photoId}`)
      }
    } else {
      await replyPhotoMenu(ctx, authorize, photos)
    }
  }

  private newPhotoHandler: AppContextHandler = async (ctx) => {
    await ctx.scene.leave()

    await ctx.scene.enter('new-photo')
  }
}
