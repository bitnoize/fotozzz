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
      const photosFull = await this.postgresService.getPhotosFullUser(authorize.id)

      await replyPhotoMenu(ctx, authorize, photosFull)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx)
    }
  }

  private prevPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!

    this.prevPageNavigation(ctx)

    const photosFull = await this.postgresService.getPhotosFullUser(authorize.id)

    await replyPhotoMenu(ctx, authorize, photosFull)
  }

  private nextPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!

    this.nextPageNavigation(ctx)

    const photosFull = await this.postgresService.getPhotosFullUser(authorize.id)

    await replyPhotoMenu(ctx, authorize, photosFull)
  }

  private deletePhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!

    const photoId = parseInt(ctx.match[1])

    if (photoId != null && typeof photoId === 'number') {
      const photo = await this.postgresService.getPhotoUser(photoId, authorize.id)

      if (photo !== undefined) {
        const deletePhoto: DeletePhoto = {
          photoId: photo.id
        }

        await ctx.scene.leave()

        await ctx.scene.enter('delete-photo', { deletePhoto })
      }
    } else {
      const photosFull = await this.postgresService.getPhotosFullUser(authorize.id)

      await replyPhotoMenu(ctx, authorize, photosFull)
    }
  }

  private newPhotoHandler: AppContextHandler = async (ctx) => {
    await ctx.scene.leave()

    await ctx.scene.enter('new-photo')
  }
}
