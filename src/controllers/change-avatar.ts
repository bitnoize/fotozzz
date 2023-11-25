import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  ChangeAvatar,
  Navigation,
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
  initSceneSessionChangeAvatar,
  sureSceneSessionChangeAvatar,
  dropSceneSessionChangeAvatar,
  isChangeAvatar,
  isPhotoSize,
  replyMainMenu,
  replyMainError,
  replyChangeAvatarAvatar,
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ChangeAvatarController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'change-avatar',
      this.startSceneHandler,
      this.queryAvatarHandler,
      this.replyAvatarComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    initSceneSessionChangeAvatar(ctx)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      return wizardNextStep(ctx, next)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx, authorize, navigation)
    }
  }

  private queryAvatarHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyChangeAvatarAvatar(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyAvatarComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('photo', this.replyAvatarInputHandler)
    composer.action('change-avatar-back', this.returnProfileHandler)
    composer.use(this.replyAvatarUnknownHandler)

    return composer
  }

  private replyAvatarInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const changeAvatar = sureSceneSessionChangeAvatar(ctx)

    if (ctx.has(message('photo'))) {
      const photo = ctx.message.photo

      const photoSize = photo.pop()

      if (isPhotoSize(photoSize)) {
        changeAvatar.avatarTgFileId = photoSize.file_id

        return wizardNextStep(ctx, next)
      } else {
        await replyChangeAvatarAvatar(ctx, authorize, navigation)
      }
    }
  }

  private replyAvatarUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyChangeAvatarAvatar(ctx, authorize, navigation)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const changeAvatar = sureSceneSessionChangeAvatar(ctx)

    if (!isChangeAvatar(changeAvatar)) {
      throw new Error(`scene session changeAvatar data malformed`)
    }

    await this.postgresService.setUserAvatar(
      authorize.id,
      changeAvatar.avatarTgFileId
    )

    dropSceneSessionChangeAvatar(ctx)

    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }

  private returnProfileHandler: AppContextHandler = async (ctx, next) => {
    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`ChangeAvatarScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    await ctx.scene.leave()

    await replyMainError(ctx)
  }
}
