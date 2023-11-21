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
  isUserGender,
  isUserNick,
  isUserAbout,
  isRegister,
  markupKeyboardGender
} from '../helpers/telegram.js'
import { USER_GENDERS } from '../constants/user.js'
import { logger } from '../logger.js'

export class RegisterController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'register',
      this.enterSceneHandler,
      this.queryNickHandler,
      this.replyNickComposer(),
      this.queryGenderHandler,
      this.replyGenderComposer(),
      this.queryAvatarHandler,
      this.replyAvatarComposer(),
      this.queryAboutHandler,
      this.replyAboutComposer(),
      this.leaveSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize
    if (authorize === undefined) {
      throw new Error(`context session authorize lost`)
    }

    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    if (authorize.status !== 'register') {
      throw new Error(`authorize status not allowed to enter scene`)
    }

    resetNavigation(navigation)

    ctx.scene.session.register = {} as Partial<Register>

    await ctx.replyWithMarkdownV2(
      `Ответь на несколько вопросов, чтобы завершить регистрацию`
    )

    ctx.wizard.next()

    if (typeof ctx.wizard.step !== 'function') {
      throw new Error(`context wizard step lost`)
    }

    return ctx.wizard.step(ctx, next)
  }

  private queryNickHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Выбери ник`
    )

    ctx.wizard.next()
  }

  private replyNickComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyNickTextHandler)
    handler.use(this.replyNickUnknownHandler)

    return handler
  }

  private replyNickTextHandler: AppContextHandler = async (ctx, next) => {
    const register = ctx.scene.session.register
    if (register === undefined) {
      throw new Error(`context scene session register lost`)
    }

    if (ctx.has(message('text'))) {
      const userNick = ctx.message.text.toLowerCase()

      if (isUserNick(userNick)) {
        const isSuccess = await this.postgresService.checkUserNick(userNick)

        if (isSuccess) {
          register.nick = userNick

          ctx.wizard.next()

          if (typeof ctx.wizard.step !== 'function') {
            throw new Error(`context wizard step lost`)
          }

          return ctx.wizard.step(ctx, next)
        } else {
          await ctx.replyWithMarkdownV2(
            `Этот ник уже используется, выбери другой`
          )
        }
      } else {
        await ctx.replyWithMarkdownV2(
          `Некорректный ввод, попробуй еще раз`
        )
      }
    }
  }

  private replyNickUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Используй обычное текстовое сообщение`
    )
  }

  private queryGenderHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      'Укажи пол',
      markupKeyboardGender()
    )

    ctx.wizard.next()
  }

  private replyGenderComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    for (gender of USER_GENDERS) {
      handler.action(`register-gender-${gener}`, this.replyGenderActionHandler)
    }

    handler.action(USER_GENDERS, this.replyGenderActionHandler)
    handler.use(this.replyGenderUnknownHandler)

    return handler
  }

  private replyGenderActionHandler: AppContextHandler = async (ctx, next) => {
    const register = ctx.scene.session.register
    if (register === undefined) {
      throw new Error(`context scene session register lost`)
    }

    const userGender = ctx.match.input

    if (isUserGender(userGender)) {
      register.gender = userGender

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

  private replyGenderUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Используй кнопки в сообщении`
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
    const register = ctx.scene.session.register
    if (register === undefined) {
      throw new Error(`context scene session register lost`)
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

      register.avatarTgFileId = photoSize['file_id']

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
    const register = ctx.scene.session.register
    if (register === undefined) {
      throw new Error(`context scene session register lost`)
    }

    if (ctx.has(message('text'))) {
      const userAbout = ctx.message.text

      if (isUserAbout(userAbout)) {
        register.about = userAbout

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

  private leaveSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize
    if (authorize === undefined) {
      throw new Error(`context session authorize lost`)
    }

    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    if (navigation.messageId !== null) {
      await ctx.deleteMessage(navigation.messageId)

      navigation.messageId = null
    }

    navigation.currentPage = 0
    navigation.totalPages = 0

    const register = ctx.scene.session.register
    if (register === undefined) {
      throw new Error(`context scene session register lost`)
    }

    if (!isRegister(register)) {
      throw new Error(`scene session register data malformed`)
    }

    ctx.session.authorize = await this.postgresService.activateUser(
      authorize.id,
      register.nick,
      register.gender,
      register.avatarTgFileId,
      register.about,
      ctx.from
    )

    await ctx.replyWithMarkdownV2(
      `Регистрация окончена, спасибо`
    )

    await ctx.scene.leave()
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`RegisterScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    await ctx.replyWithMarkdownV2(
      `Произошла ошибка, выход в главное меню`
    )

    await ctx.scene.leave()
  }
}
