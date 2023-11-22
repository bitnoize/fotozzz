import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  ChangeAbout,
  Navigation,
  AppContext,
  AppContextHandler,
  AppContextExceptionHandler
} from '../interfaces/app.js'
import { RedisService } from '../services/redis.js'
import { PostgresService } from '../services/postgres.js'
import {
  isUserAbout,
  isChangeAbout,
  resetNavigation,
  keyboardMainMenu,
  keyboardChangeAboutConfirm
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ChangeAboutController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'change-about',
      this.startSceneHandler,
      this.queryConfirmHandler,
      this.replyConfirmComposer(),
      this.queryAboutHandler,
      this.replyAboutComposer(),
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

    ctx.scene.session.changeAbout = {} as Partial<ChangeAbout>

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
        `Редактирование о себе доступно только активным юзерам`,
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
      `Ты действительно хочешь поменять информацию о себе?`,
      keyboardChangeAboutConfirm()
    )

    navigation.messageId = message.message_id

    ctx.wizard.next()
  }

  private replyConfirmComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action('change-about-confirm-next', this.replyConfirmNextHandler)
    handler.action('change-about-confirm-back', this.replyConfirmBackHandler)
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

  private queryAboutHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Расскажи о себе`
    )

    ctx.wizard.next()
  }

  private replyAboutComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyAboutTextHandler)
    handler.use(this.replyAboutUnknownHandler)

    return handler
  }

  private replyAboutTextHandler: AppContextHandler = async (ctx, next) => {
    const changeAbout = ctx.scene.session.changeAbout
    if (changeAbout === undefined) {
      throw new Error(`context scene session changeAbout lost`)
    }

    if (ctx.has(message('text'))) {
      const userAbout = ctx.message.text

      if (isUserAbout(userAbout)) {
        changeAbout.about = userAbout

        ctx.wizard.next()

        if (typeof ctx.wizard.step !== 'function') {
          throw new Error(`context wizard step lost`)
        }

        return ctx.wizard.step(ctx, next)
      } else {
        await ctx.replyWithMarkdownV2(
          `Некорректный ввод, попробуй еще раз`
        )
      }
    }
  }

  private replyAboutUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Используй обычное текстовое сообщение`
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

    const changeAbout = ctx.scene.session.changeAbout
    if (changeAbout === undefined) {
      throw new Error(`context scene session changeAbout lost`)
    }

    if (!isChangeAbout(changeAbout)) {
      throw new Error(`scene session changeAbout data malformed`)
    }

    await this.postgresService.setUserAbout(
      authorize.id,
      changeAbout.about
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
      logger.error(`ChangeAboutScene error: ${error.message}`)
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
