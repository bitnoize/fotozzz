import { Scenes, Composer, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppWizardScene
} from '../interfaces/app.js'
import { ChangeAvatar } from '../interfaces/telegram.js'
import {
  isChangeAvatar,
  isPhotoSize,
  replyMainMenu,
  replyChangeAvatarAvatar
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ChangeAvatarController extends BaseController {
  readonly scene: AppWizardScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene<AppContext>(
      'change-avatar',
      this.startSceneHandler,
      this.quaereAvatarHandler,
      this.answerAvatarComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize!
    const navigation = ctx.session.navigation!

    navigation.updatable = false

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      ctx.scene.session.changeAvatar = {} as Partial<ChangeAvatar>

      ctx.wizard.next()

      if (typeof ctx.wizard.step === 'function') {
        return ctx.wizard.step(ctx, next)
      }
    }

    delete ctx.scene.session.changeAvatar

    await ctx.scene.leave()

    await replyMainMenu(ctx)
  }

  private quaereAvatarHandler: AppContextHandler = async (ctx) => {
    await replyChangeAvatarAvatar(ctx)

    ctx.wizard.next()
  }

  private answerAvatarComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('photo', this.answerAvatarInputHandler)
    composer.action('change-avatar-back', this.returnProfileHandler)
    composer.use(this.answerAvatarUnknownHandler)

    return composer
  }

  private answerAvatarInputHandler: AppContextHandler = async (ctx, next) => {
    const changeAvatar = ctx.scene.session.changeAvatar!

    if (ctx.has(message('photo'))) {
      const photo = ctx.message.photo

      const photoSize = photo.pop()

      if (isPhotoSize(photoSize)) {
        changeAvatar.avatarTgFileId = photoSize.file_id

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      } else {
        await replyChangeAvatarAvatar(ctx)
      }
    }
  }

  private answerAvatarUnknownHandler: AppContextHandler = async (ctx) => {
    await replyChangeAvatarAvatar(ctx)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const changeAvatar = ctx.scene.session.changeAvatar!

    if (!isChangeAvatar(changeAvatar)) {
      throw new Error(`scene session changeAvatar data malformed`)
    }

    await this.postgresService.setUserAvatar(
      authorize.id,
      changeAvatar.avatarTgFileId
    )

    delete ctx.scene.session.changeAvatar

    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }

  private returnProfileHandler: AppContextHandler = async (ctx) => {
    delete ctx.scene.session.changeAvatar

    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }
}
