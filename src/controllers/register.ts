import { Scenes, Composer, Markup } from 'telegraf'
import { AppOptions, AppContext } from '../interfaces/app.js'
import { BaseController } from './base.js'
import { isUserGender, isUserNick, isUserAbout } from '../helpers.js'
import { USER_GENDERS } from '../constants.js'
import { logger } from '../logger.js'

export class RegisterController extends BaseController {
  scene: Scenes.WizardScene<AppContext>

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene<AppContext>(
      'register-scene',
      this.queryNickHandler,
      this.replyNickComposer(),
      this.queryGenderHandler,
      this.replyGenderComposer(),
      this.queryAvatarHandler,
      this.replyAvatarComposer(),
      this.queryAboutHandler,
      this.replyAboutComposer(),
      this.completeHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private queryNickHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Выбери ник')
    ctx.wizard.next()
  }

  private replyNickComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyNickTextHandler)
    handler.use(this.replyNickUnknownHandler)

    return handler
  }

  private replyNickTextHandler = async (
    ctx: AppContext,
    next: () => Promise<void>
  ): Promise<void> => {
    const userNick = ctx.message.text

    if (isUserNick(userNick)) {
      const userNickLowerCase = userNick.toLowerCase()

      const check = await this.postgresService.checkUserNick(userNickLowerCase)

      if (check !== undefined) {
        if (check) {
          ctx.scene.state.userNick = userNickLowerCase

          ctx.wizard.next()
          if (typeof ctx.wizard.step === 'function') {
            return ctx.wizard.step(ctx, next)
          }
        } else {
          await ctx.reply('Этот ник уже используется, выбери другой')
        }
      } else {
        await ctx.reply('Ошибка в базе, попробуй еще раз')
      }
    } else {
      await ctx.reply('Неверный ввод, используй латинские буквы и цифры, от 4 до 20 символов')
    }
  }

  private replyNickUnknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Используй обычное текстовое сообщение!')
  }

  private queryGenderHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply(
      'Укажи пол',
      Markup.inlineKeyboard([
        Markup.button.callback('Мужской', 'male'),
        Markup.button.callback('Женский', 'female'),
        Markup.button.callback('Пара', 'couple'),
      ])
    )
    ctx.wizard.next()
  }

  private replyGenderComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action(USER_GENDERS, this.replyGenderActionHandler)
    handler.use(this.replyGenderUnknownHandler)

    return handler
  }

  private replyGenderActionHandler = async (
    ctx: AppContext,
    next: () => Promise<void>
  ): Promise<void> => {
    const userGender = ctx.match.input

    if (isUserGender(userGender)) {
      ctx.scene.state.userGender = userGender

      ctx.wizard.next()
      if (typeof ctx.wizard.step === 'function') {
        return ctx.wizard.step(ctx, next)
      }
    } else {
      await ctx.reply('Некорректный ввод, попробуй еще раз')
    }
  }

  private replyGenderUnknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Используй кнопки в сообщении!')
  }

  private queryAvatarHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Загрузи аватар')
    ctx.wizard.next()
  }

  private replyAvatarComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('photo', this.replyAvatarPhotoHandler)
    handler.use(this.replyAvatarUnknownHandler)

    return handler
  }

  private replyAvatarPhotoHandler = async (
    ctx: AppContext,
    next: () => Promise<void>
  ): Promise<void> => {
    const photo = ctx.message.photo

    if (!(photo != null && Array.isArray(photo))) {
      throw new Error(`response photo malformed`)
    }

    const photoItem = photo.pop()

    if (!(
      photoItem != null &&
      typeof photoItem === 'object' &&
      'file_id' in photoItem &&
      photoItem['file_id'] != null &&
      typeof photoItem['file_id'] === 'string'
    )) {
      throw new Error(`response photoItem malformed`)
    }

    ctx.scene.state.userAvatar = photoItem['file_id']

    ctx.wizard.next()
    if (typeof ctx.wizard.step === 'function') {
      return ctx.wizard.step(ctx, next)
    }
  }

  private replyAvatarUnknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Запости картинку!')
  }

  private queryAboutHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Расскажи о себе')
    ctx.wizard.next()
  }

  private replyAboutComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyAboutTextHandler)
    handler.use(this.replyAboutUnknownHandler)

    return handler
  }

  private replyAboutTextHandler = async (
    ctx: AppContext,
    next: () => Promise<void>
  ): Promise<void> => {
    const userAbout = ctx.message.text

    if (isUserAbout(userAbout)) {
      ctx.scene.state.userAbout = userAbout

      ctx.wizard.next()
      if (typeof ctx.wizard.step === 'function') {
        return ctx.wizard.step(ctx, next)
      }
    } else {
      await ctx.reply(`Неверный ввод, используй 3-300 символов`)
    }
  }

  private replyAboutUnknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Используй обычное текстовое сообщение!')
  }

  private completeHandler = async (ctx: AppContext): Promise<void> => {
    const { groupChatId } = this.options

    const state = ctx.scene.state
    const user = ctx.session.user

    if (state === undefined) {
      throw new Error(`Scene state lost`)
    }

    if (user === undefined) {
      throw new Error(`Session user lost`)
    }

    if (
      state.userNick == null ||
      state.userGender == null ||
      state.userAvatar == null ||
      state.userAbout == null
    ) {
      throw new Error(`Scene data lost`)
    } else {
      await this.postgresService.activateUser(
        user.id,
        state.userNick,
        state.userGender,
        state.userAvatar,
        state.userAbout
      )

      await ctx.reply('Регистрация окончена, спасибо!')

      await ctx.scene.leave()
      await ctx.scene.enter('main-scene')
    }
  }

  private exceptionHandler = async (
    error: unknown,
    ctx: AppContext
  ): Promise<void> => {
    if (error instanceof Error) {
      logger.error(`RegisterScene error: ${error.message}`)
    }

    await ctx.reply('Произошла ошибка, выход из сцены')

    await ctx.scene.leave()
  }
}
