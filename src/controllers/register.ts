import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  Register,
  Navigation,
  AppContext,
  AppContextHandler,
  AppContextExceptionHandler
} from '../interfaces/app.js'
import { RedisService } from '../services/redis.js'
import { PostgresService } from '../services/postgres.js'
import {
  wizardNextStep,
  initSessionAuthorize,
  sureSessionAuthorize,
  sureSessionNavigation,
  initSceneSessionRegister,
  sureSceneSessionRegister,
  isUserGender,
  isUserNick,
  isUserAbout,
  isRegister,
  isPhotoSize,
  replyMainMenu,
  replyMainError,
  replyRegisterNick,
  replyRegisterNickUsed,
  replyRegisterNickWrong,
  replyRegisterGender,
  replyRegisterAvatar,
  replyRegisterAbout,
  replyRegisterAboutWrong
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class RegisterController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'register',
      this.startSceneHandler,
      this.queryNickHandler,
      this.replyNickComposer(),
      this.queryGenderHandler,
      this.replyGenderComposer(),
      this.queryAvatarHandler,
      this.replyAvatarComposer(),
      this.queryAboutHandler,
      this.replyAboutComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    initSceneSessionRegister(ctx)

    if (authorize.status === 'register') {
      ctx.wizard.next()

      return wizardNextStep(ctx, next)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx, authorize, navigation)
    }
  }

  private queryNickHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyRegisterNick(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyNickComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyNickTextHandler)
    handler.use(this.replyNickUnknownHandler)

    return handler
  }

  private replyNickTextHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const register = sureSceneSessionRegister(ctx)

    if (ctx.has(message('text'))) {
      const userNick = ctx.message.text.toLowerCase()

      if (isUserNick(userNick)) {
        const isSuccess = await this.postgresService.checkUserNick(userNick)

        if (isSuccess) {
          register.nick = userNick

          ctx.wizard.next()

          return wizardNextStep(ctx, next)
        } else {
          await replyRegisterNickUsed(ctx, authorize, navigation)
        }
      } else {
        await replyRegisterNickWrong(ctx, authorize, navigation)
      }
    }
  }

  private replyNickUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyRegisterNick(ctx, authorize, navigation)
  }

  private queryGenderHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyRegisterGender(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyGenderComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action(/^register-gender-(\w+)$/, this.replyGenderActionHandler)
    handler.use(this.replyGenderUnknownHandler)

    return handler
  }

  private replyGenderActionHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const register = sureSceneSessionRegister(ctx)

    const userGender = ctx.match[1]

    if (isUserGender(userGender)) {
      register.gender = userGender

      ctx.wizard.next()

      return wizardNextStep(ctx, next)
    } else {
      await replyRegisterGender(ctx, authorize, navigation)
    }
  }

  private replyGenderUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyRegisterGender(ctx, authorize, navigation)
  }

  private queryAvatarHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyRegisterAvatar(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyAvatarComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('photo', this.replyAvatarPhotoHandler)
    handler.use(this.replyAvatarUnknownHandler)

    return handler
  }

  private replyAvatarPhotoHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const register = sureSceneSessionRegister(ctx)

    if (ctx.has(message('photo'))) {
      const photo = ctx.message.photo

      const photoSize = photo.pop()

      if (isPhotoSize(photoSize)) {
        register.avatarTgFileId = photoSize.file_id

        ctx.wizard.next()

        return wizardNextStep(ctx, next)
      } else {
        await replyRegisterAvatar(ctx, authorize, navigation)
      }
    }
  }

  private replyAvatarUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyRegisterAvatar(ctx, authorize, navigation)
  }

  private queryAboutHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyRegisterAbout(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyAboutComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyAboutTextHandler)
    handler.use(this.replyAboutUnknownHandler)

    return handler
  }

  private replyAboutTextHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const register = sureSceneSessionRegister(ctx)

    if (ctx.has(message('text'))) {
      const userAbout = ctx.message.text

      if (isUserAbout(userAbout)) {
        register.about = userAbout

        ctx.wizard.next()

        return wizardNextStep(ctx, next)
      } else {
        await replyRegisterAboutWrong(ctx, authorize, navigation)
      }
    }
  }

  private replyAboutUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyRegisterAbout(ctx, authorize, navigation)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const register = sureSceneSessionRegister(ctx)

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

    initSessionAuthorize(ctx, user)

    await ctx.scene.leave()

    await replyMainMenu(ctx, authorize, navigation)
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`RegisterScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    await ctx.scene.leave()

    await replyMainError(ctx)
  }
}
