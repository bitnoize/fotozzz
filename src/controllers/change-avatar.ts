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
  isChangeAvatar,
  resetNavigation,
  keyboardMainMenu,
  keyboardChangeAvatarConfirm
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
      this.queryConfirmHandler,
      this.replyConfirmComposer(),
      this.queryAvatarHandler,
      this.replyAvatarComposer(),
      this.completeSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize
    if (authorize === undefined) {
      throw new Error(`context session authorize lost`)
    }

    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    resetNavigation(navigation)

    ctx.scene.session.changeAvatar = {} as Partial<ChangeAvatar>

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      ctx.wizard.next()

      if (typeof ctx.wizard.step !== 'function') {
        throw new Error(`context wizard step lost`)
      }

      return ctx.wizard.step(ctx, next)
    } else {
      await ctx.scene.leave()

      const message = await ctx.replyWithMarkdownV2(
        `Редактирование аватара доступно только активным юзерам`,
        keyboardMainMenu()
      )

      navigation.messageId = message.message_id
    }
  }

  private queryConfirmHandler: AppContextHandler = async (ctx) => {
    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    const message = await ctx.replyWithMarkdownV2(
      `Ты действительно хочешь сменить аватар?`,
      keyboardChangeAvatarConfirm()
    )

    navigation.messageId = message.message_id

    ctx.wizard.next()
  }

  private replyConfirmComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action('change-avatar-confirm-next', this.replyConfirmNextHandler)
    handler.action('change-avatar-confirm-back', this.replyConfirmBackHandler)
    handler.use(this.replyConfirmUnknownHandler)

    return handler
  }

  private replyConfirmNextHandler: AppContextHandler = async (ctx, next) => {
    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    if (navigation.messageId !== null) {
      await ctx.deleteMessage(navigation.messageId)

      navigation.messageId = null
    }

    ctx.wizard.next()

    if (typeof ctx.wizard.step !== 'function') {
      throw new Error(`context wizard step lost`)
    }

    return ctx.wizard.step(ctx, next)
  }

  private replyConfirmBackHandler: AppContextHandler = async (ctx, next) => {
    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    if (navigation.messageId !== null) {
      await ctx.deleteMessage(navigation.messageId)

      navigation.messageId = null
    }

    await ctx.scene.leave()

    await ctx.scene.enter('profile')
  }

  private replyConfirmUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Используй кнопки в меню выше`
    )
  }

  private queryAvatarHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Загрузи аватар`
    )

    ctx.wizard.next()
  }

  private replyAvatarComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('photo', this.replyAvatarPhotoHandler)
    handler.use(this.replyAvatarUnknownHandler)

    return handler
  }

  private replyAvatarPhotoHandler: AppContextHandler = async (ctx, next) => {
    const changeAvatar = ctx.scene.session.changeAvatar
    if (changeAvatar === undefined) {
      throw new Error(`context scene session changeAvatar lost`)
    }

    if (ctx.has(message('photo'))) {
      const photo = ctx.message.photo

      const photoSize = photo.pop()

      if (!(
        photoSize != null &&
        typeof photoSize === 'object' &&
        'file_id' in photoSize &&
        photoSize['file_id'] != null &&
        typeof photoSize['file_id'] === 'string'
      )) {
        throw new Error(`response photoSize malformed`)
      }

      changeAvatar.avatarTgFileId = photoSize['file_id']

      ctx.wizard.next()

      if (typeof ctx.wizard.step !== 'function') {
        throw new Error(`context wizard step lost`)
      }

      return ctx.wizard.step(ctx, next)
    }
  }

  private replyAvatarUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Запости фотку`
    )
  }

  private completeSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize
    if (authorize === undefined) {
      throw new Error(`context session authorize lost`)
    }

    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    const changeAvatar = ctx.scene.session.changeAvatar
    if (changeAvatar === undefined) {
      throw new Error(`context scene session changeAvatar lost`)
    }

    if (!isChangeAvatar(changeAvatar)) {
      throw new Error(`scene session changeAvatar data malformed`)
    }

    await this.postgresService.setUserAvatar(
      authorize.id,
      changeAvatar.avatarTgFileId
    )

    if (navigation.messageId !== null) {
      await ctx.deleteMessage(navigation.messageId)

      navigation.messageId = null
    }

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

    await ctx.replyWithMarkdownV2(
      `Произошла ошибка, выход в главное меню`,
      keyboardMainMenu()
    )
  }
}
