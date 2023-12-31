import { Scenes, Composer, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppWizardScene
} from '../interfaces/app.js'
import { DeletePhoto } from '../interfaces/telegram.js'
import { replyMainMenu, replyDeletePhotoPhoto } from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class DeletePhotoController extends BaseController {
  readonly scene: AppWizardScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene<AppContext>(
      'delete-photo',
      this.startSceneHandler,
      this.quaerePhotoHandler,
      this.answerPhotoComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize!
    const deletePhoto = ctx.scene.state.deletePhoto

    this.resetNavigation(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (
      deletePhoto !== undefined &&
      allowedStatuses.includes(authorize.status)
    ) {
      const photo = await this.postgresService.getPhotoUser(
        deletePhoto.photoId,
        authorize.id
      )

      if (photo !== undefined) {
        ctx.scene.session.deletePhoto = deletePhoto

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      }
    }

    await ctx.scene.leave()

    await replyMainMenu(ctx)
  }

  private quaerePhotoHandler: AppContextHandler = async (ctx) => {
    const deletePhoto = ctx.scene.session.deletePhoto!

    const photoFull = await this.postgresService.getPhotoFull(deletePhoto.photoId)

    await replyDeletePhotoPhoto(ctx, photoFull)

    ctx.wizard.next()
  }

  private answerPhotoComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.action('delete-photo-next', this.answerPhotoInputHandler)
    composer.action('delete-photo-back', this.returnPhotoHandler)
    composer.use(this.answerPhotoUnknownHandler)

    return composer
  }

  private answerPhotoInputHandler: AppContextHandler = async (ctx, next) => {
    ctx.wizard.next()

    if (typeof ctx.wizard.step === 'function') {
      return ctx.wizard.step(ctx, next)
    }
  }

  private answerPhotoUnknownHandler: AppContextHandler = async (ctx) => {
    const deletePhoto = ctx.scene.session.deletePhoto!

    const photoFull = await this.postgresService.getPhotoFull(deletePhoto.photoId)

    await replyDeletePhotoPhoto(ctx, photoFull)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const deletePhoto = ctx.scene.session.deletePhoto!

    const photoFull = await this.postgresService.getPhotoFull(deletePhoto.photoId)

    try {
      await ctx.telegram.deleteMessage(
        photoFull.groupTgChatId,
        photoFull.groupTgMessageId
      )

      await ctx.telegram.deleteMessage(
        photoFull.channelTgChatId,
        photoFull.channelTgMessageId
      )
    } catch (error: unknown) {
      logger.error(error)
    }

    await this.postgresService.deletePhotoUser(
      photoFull.id,
      authorize.id,
      ctx.from
    )

    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }
}
