import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  AppContext,
  AppContextHandler,
  AppContextExceptionHandler
} from '../interfaces/app.js'
import { RedisService } from '../services/redis.js'
import { PostgresService } from '../services/postgres.js'
import {
  wizardNextStep,
  sureSessionAuthorize,
  sureSessionNavigation,
  initSceneSessionDeletePhoto,
  sureSceneSessionDeletePhoto,
  dropSceneSessionDeletePhoto,
  replyMainMenu,
  replyMainError,
  replyDeletePhotoPhoto
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class DeletePhotoController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'delete-photo',
      this.startSceneHandler,
      this.queryPhotoHandler,
      this.replyPhotoComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    const allowedStatuses = ['active']
    if (allowedStatuses.includes(authorize.status)) {
      const deletePhoto = ctx.scene.state.deletePhoto

      if (deletePhoto !== undefined) {
        const checkPhoto = await this.postgresService.checkPhotoUser(
          deletePhoto.id,
          authorize.id
        )

        if (checkPhoto) {
          initSceneSessionDeletePhoto(ctx, deletePhoto)

          return wizardNextStep(ctx, next)
        }
      }
    }

    dropSceneSessionDeletePhoto(ctx)

    await ctx.scene.leave()

    await replyMainMenu(ctx, authorize, navigation)
  }

  private queryPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const deletePhoto = sureSceneSessionDeletePhoto(ctx)

    await replyDeletePhotoPhoto(ctx, authorize, navigation, deletePhoto)

    ctx.wizard.next()
  }

  private replyPhotoComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.action('delete-photo-next', this.replyPhotoInputHandler)
    composer.action('delete-photo-back', this.returnPhotoHandler)
    composer.use(this.replyPhotoUnknownHandler)

    return composer
  }

  private replyPhotoInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const deletePhoto = sureSceneSessionDeletePhoto(ctx)

    return wizardNextStep(ctx, next)
  }

  private replyPhotoUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const deletePhoto = sureSceneSessionDeletePhoto(ctx)

    await replyDeletePhotoPhoto(ctx, authorize, navigation, deletePhoto)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const deletePhoto = sureSceneSessionDeletePhoto(ctx)

    const photo = await this.postgresService.deletePhotoUser(
      deletePhoto.id,
      authorize.id,
      ctx.from
    )

    dropSceneSessionDeletePhoto(ctx)

    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }

  private returnPhotoHandler: AppContextHandler = async (ctx) => {
    dropSceneSessionDeletePhoto(ctx)

    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`NewPhotoScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    dropSceneSessionDeletePhoto(ctx)

    await ctx.scene.leave()

    await replyMainError(ctx)
  }
}
