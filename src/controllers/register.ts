import { Scenes, Composer, Markup } from 'telegraf'
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
  getSessionUser,
  setSessionUser,
  getSceneSessionRegister,
  newSceneSessionRegister,
  isUserGender,
  isUserNick,
  isUserAbout,
  isSceneSessionRegister,
  markupKeyboardSaveMe,
  markupInlineKeyboardGender
} from '../helpers/telegram.js'
import { USER_GENDERS } from '../constants/user.js'
import { logger } from '../logger.js'

export class RegisterController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'register-scene',
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
    newSceneSessionRegister(ctx)

    await ctx.reply(
      `Ответь на несколько вопросов, чтобы завершить регистрацию`,
      Markup.removeKeyboard()
    )

    ctx.wizard.next()
    if (typeof ctx.wizard.step === 'function') {
      return ctx.wizard.step(ctx, next)
    }
  }

  private queryNickHandler: AppContextHandler = async (ctx) => {
    await ctx.reply(`Выбери ник`)

    ctx.wizard.next()
  }

  private replyNickComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyNickTextHandler)
    handler.use(this.replyNickUnknownHandler)

    return handler
  }

  private replyNickTextHandler: AppContextHandler = async (ctx, next) => {
    const sceneSessionRegister = getSceneSessionRegister(ctx)

    if (ctx.has(message('text'))) {
      const userNick = ctx.message.text.toLowerCase()

      if (isUserNick(userNick)) {
        const isSuccess = await this.postgresService.checkUserNick(userNick)

        if (isSuccess) {
          sceneSessionRegister.nick = userNick

          ctx.wizard.next()
          if (typeof ctx.wizard.step === 'function') {
            return ctx.wizard.step(ctx, next)
          }
        } else {
          await ctx.reply(`Этот ник уже используется, выбери другой`)
        }
      } else {
        await ctx.reply(
          `Неверный ввод, используй латинские буквы и цифры, от 4 до 20 символов`
        )
      }
    }
  }

  private replyNickUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.reply(`Используй обычное текстовое сообщение!`)
  }

  private queryGenderHandler: AppContextHandler = async (ctx) => {
    await ctx.reply(
      'Укажи пол',
      markupInlineKeyboardGender()
    )
    ctx.wizard.next()
  }

  private replyGenderComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action(USER_GENDERS, this.replyGenderActionHandler)
    handler.use(this.replyGenderUnknownHandler)

    return handler
  }

  private replyGenderActionHandler: AppContextHandler = async (ctx, next) => {
    const sceneSessionRegister = getSceneSessionRegister(ctx)

    const userGender = ctx.match.input

    if (isUserGender(userGender)) {
      sceneSessionRegister.gender = userGender

      ctx.wizard.next()
      if (typeof ctx.wizard.step === 'function') {
        return ctx.wizard.step(ctx, next)
      }
    } else {
      await ctx.reply('Некорректный ввод, попробуй еще раз')
    }
  }

  private replyGenderUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.reply('Используй кнопки в сообщении!')
  }

  private queryAvatarHandler: AppContextHandler = async (ctx) => {
    await ctx.reply('Загрузи аватар')

    ctx.wizard.next()
  }

  private replyAvatarComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('photo', this.replyAvatarPhotoHandler)
    handler.use(this.replyAvatarUnknownHandler)

    return handler
  }

  private replyAvatarPhotoHandler: AppContextHandler = async (ctx, next) => {
    const sceneSessionRegister = getSceneSessionRegister(ctx)

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

      sceneSessionRegister.avatarTgFileId = photoSize['file_id']

      ctx.wizard.next()
      if (typeof ctx.wizard.step === 'function') {
        return ctx.wizard.step(ctx, next)
      }
    }
  }

  private replyAvatarUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.reply('Запости картинку!')
  }

  private queryAboutHandler: AppContextHandler = async (ctx) => {
    await ctx.reply('Расскажи о себе')
    ctx.wizard.next()
  }

  private replyAboutComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyAboutTextHandler)
    handler.use(this.replyAboutUnknownHandler)

    return handler
  }

  private replyAboutTextHandler: AppContextHandler = async (ctx, next) => {
    const sceneSessionRegister = getSceneSessionRegister(ctx)

    if (ctx.has(message('text'))) {
      const userAbout = ctx.message.text

      if (isUserAbout(userAbout)) {
        sceneSessionRegister.about = userAbout

        ctx.wizard.next()
        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      } else {
        await ctx.reply(`Неверный ввод, используй 3-300 символов`)
      }
    }
  }

  private replyAboutUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.reply('Используй обычное текстовое сообщение!')
  }

  private leaveSceneHandler: AppContextHandler = async (ctx) => {
    const sessionUser = getSessionUser(ctx)
    const sceneSessionRegister = getSceneSessionRegister(ctx)

    if (isSceneSessionRegister(sceneSessionRegister)) {
      await this.postgresService.activateUser(
        sessionUser.id,
        sceneSessionRegister.nick,
        sceneSessionRegister.gender,
        sceneSessionRegister.avatarTgFileId,
        sceneSessionRegister.about,
        ctx.from
      )

      setSessionUser(ctx, sessionUser)

      await ctx.reply(
        `Регистрация окончена, спасибо!`,
        markupKeyboardSaveMe()
      )

      await ctx.scene.leave()
    } else {
      throw new Error(`scene session data lost`)
    }
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`RegisterScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx)
    }

    await ctx.reply(
      `Произошла ошибка, выход в главное меню`,
      markupKeyboardSaveMe()
    )

    await ctx.scene.leave()
  }
}
