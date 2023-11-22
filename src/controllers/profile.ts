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
  resetNavigation,
  keyboardMainMenu,
  keyboardProfileMenu
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ProfileController implements Controller {
  scene: Scenes.BaseScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.BaseScene<AppContext>('profile')

    this.scene.enter(this.enterSceneHandler)

    this.scene.action('profile-change-avatar', this.changeAvatarHandler)
    this.scene.action('profile-change-about', this.changeAboutHandler)
    this.scene.action('profile-return-main-menu', this.returnMainMenuHandler)

    this.scene.leave(this.leaveSceneHandler)

    this.scene.use(this.unknownHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    const authorize = ctx.session.authorize
    if (authorize === undefined) {
      throw new Error(`context session authorize lost`)
    }

    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    resetNavigation(navigation)

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      const userFull = await this.postgresService.getUserFull(authorize.id)

      const extra = keyboardProfileMenu()

      const { emojiGender, nick, about } = userFull
      extra.caption = `${emojiGender} ${nick}\nО себе: ${about}`

      const message = await ctx.sendPhoto(userFull.avatarTgFileId, extra)

      navigation.messageId = message.message_id
    } else {
      await ctx.scene.leave()

      const message = await ctx.replyWithMarkdownV2(
        `Профиль доступен только для активных юзеров`,
        keyboardMainMenu()
      )

      navigation.messageId = message.message_id
    }
  }

  private changeAvatarHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()

    await ctx.scene.enter('change-avatar')
  }

  private changeAboutHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()

    await ctx.scene.enter('change-about')
  }

  private returnMainMenuHandler = async (ctx: AppContext): Promise<void> => {
    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    if (navigation.messageId !== null) {
      await ctx.deleteMessage(navigation.messageId)

      navigation.messageId = null
    }

    await ctx.scene.leave()

    const message = await ctx.replyWithMarkdownV2(
      `Возврат в главное меню`,
      keyboardMainMenu()
    )

    navigation.messageId = message.message_id
  }

  private leaveSceneHandler = async (ctx: AppContext): Promise<void> => {
    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    if (navigation.messageId !== null) {
      await ctx.deleteMessage(navigation.messageId)

      navigation.messageId = null
    }
  }

  private unknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.replyWithMarkdownV2(
      `Используй кнопки в меню выше`
    )
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`ProfileScene error: ${error.message}`)
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
