import { Scenes, Composer, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppWizardScene
} from '../interfaces/app.js'
import { Register } from '../interfaces/telegram.js'
import {
  isUserGender,
  isUserNick,
  isUserAbout,
  isRegister,
  isPhotoSize,
  replyMainMenu,
  replyRegisterNick,
  replyRegisterNickUsed,
  replyRegisterNickWrong,
  replyRegisterGender,
  replyRegisterAvatar,
  replyRegisterAbout,
  replyRegisterAboutWrong
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class RegisterController extends BaseController {
  readonly scene: AppWizardScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene<AppContext>(
      'register',
      this.startSceneHandler,
      this.quaereNickHandler,
      this.answerNickComposer(),
      this.quaereGenderHandler,
      this.answerGenderComposer(),
      this.quaereAvatarHandler,
      this.answerAvatarComposer(),
      this.quaereAboutHandler,
      this.answerAboutComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize!

    this.resetNavigation(ctx)

    if (authorize.status === 'register') {
      ctx.scene.session.register = {} as Partial<Register>

      ctx.wizard.next()

      if (typeof ctx.wizard.step === 'function') {
        return ctx.wizard.step(ctx, next)
      }
    }

    await ctx.scene.leave()

    await replyMainMenu(ctx)
  }

  private quaereNickHandler: AppContextHandler = async (ctx) => {
    await replyRegisterNick(ctx)

    ctx.wizard.next()
  }

  private answerNickComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('text', this.answerNickInputHandler)
    composer.use(this.answerNickUnknownHandler)

    return composer
  }

  private answerNickInputHandler: AppContextHandler = async (ctx, next) => {
    const register = ctx.scene.session.register!

    if (ctx.has(message('text'))) {
      const nick = ctx.message.text.toLowerCase()

      if (isUserNick(nick)) {
        const check = await this.postgresService.checkUserNick(nick)

        if (check) {
          register.nick = nick

          ctx.wizard.next()

          if (typeof ctx.wizard.step === 'function') {
            return ctx.wizard.step(ctx, next)
          }
        } else {
          await replyRegisterNickUsed(ctx)
        }
      } else {
        await replyRegisterNickWrong(ctx)
      }
    }
  }

  private answerNickUnknownHandler: AppContextHandler = async (ctx) => {
    await replyRegisterNick(ctx)
  }

  private quaereGenderHandler: AppContextHandler = async (ctx) => {
    await replyRegisterGender(ctx)

    ctx.wizard.next()
  }

  private answerGenderComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.action(/^register-gender-(\w+)$/, this.answerGenderInputHandler)
    composer.use(this.answerGenderUnknownHandler)

    return composer
  }

  private answerGenderInputHandler: AppContextHandler = async (ctx, next) => {
    const register = ctx.scene.session.register!

    const gender = ctx.match[1]

    if (isUserGender(gender)) {
      register.gender = gender

      ctx.wizard.next()

      if (typeof ctx.wizard.step === 'function') {
        return ctx.wizard.step(ctx, next)
      }
    } else {
      await replyRegisterGender(ctx)
    }
  }

  private answerGenderUnknownHandler: AppContextHandler = async (ctx) => {
    await replyRegisterGender(ctx)
  }

  private quaereAvatarHandler: AppContextHandler = async (ctx) => {
    await replyRegisterAvatar(ctx)

    ctx.wizard.next()
  }

  private answerAvatarComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('photo', this.answerAvatarInputHandler)
    composer.use(this.answerAvatarUnknownHandler)

    return composer
  }

  private answerAvatarInputHandler: AppContextHandler = async (ctx, next) => {
    const register = ctx.scene.session.register!

    if (ctx.has(message('photo'))) {
      const photo = ctx.message.photo

      const photoSize = photo.pop()

      if (isPhotoSize(photoSize)) {
        register.avatarTgFileId = photoSize.file_id

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      } else {
        await replyRegisterAvatar(ctx)
      }
    }
  }

  private answerAvatarUnknownHandler: AppContextHandler = async (ctx) => {
    await replyRegisterAvatar(ctx)
  }

  private quaereAboutHandler: AppContextHandler = async (ctx) => {
    await replyRegisterAbout(ctx)

    ctx.wizard.next()
  }

  private answerAboutComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('text', this.answerAboutInputHandler)
    composer.use(this.answerAboutUnknownHandler)

    return composer
  }

  private answerAboutInputHandler: AppContextHandler = async (ctx, next) => {
    const register = ctx.scene.session.register!

    if (ctx.has(message('text'))) {
      const about = ctx.message.text

      if (isUserAbout(about)) {
        register.about = about

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      } else {
        await replyRegisterAboutWrong(ctx)
      }
    }
  }

  private answerAboutUnknownHandler: AppContextHandler = async (ctx) => {
    await replyRegisterAbout(ctx)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const register = ctx.scene.session.register!

    if (!isRegister(register)) {
      throw new Error(`scene session register data malformed`)
    }

    const user = await this.postgresService.activateUser(
      authorize.id,
      register.nick,
      register.gender,
      register.avatarTgFileId,
      register.about,
      ctx.from
    )

    ctx.session.authorize = user

    await ctx.scene.leave()

    await replyMainMenu(ctx)
  }
}

