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
  isUserGender,
  isUserNick,
  isUserAbout,
  getEmojiGender,
  markupKeyboardProfile
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ProfileController implements Controller {
  scene: Scenes.BaseScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.BaseScene<AppContext>('profile')

    this.scene.enter(this.enterSceneHandler)

    this.scene.action('edit-avatar', this.editAvatarHandler)
    this.scene.action('edit-about', this.editAboutHandler)
    this.scene.action('return-menu', this.returnMenuHandler)

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

    const user = await this.postgresService.getUser(authorize.id)

    const emojiGender = getEmojiGender(user.gender)
    const extra = markupKeyboardProfile()

    extra.caption =
      `${emojiGender} ${user.nick}\n` +
      `О себе: ${user.about}`

    const message = await ctx.sendPhoto(user.avatarTgFileId, extra)

    navigation.messageId = message.message_id
    navigation.currentPage = 0
    navigation.totalPages = 0
  }

  private editAvatarHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()
    await ctx.scene.enter('profile-avatar')
  }

  private editAboutHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()
    await ctx.scene.enter('profile-about')
  }

  private returnMenuHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()

    await ctx.replyWithMarkdownV2(
      `Возврат в главное меню`
    )
  }

  private leaveSceneHandler = async (ctx: AppContext): Promise<void> => {
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
  }

  private unknownHandler = async (ctx: AppContext): Promise<void> => {
    logger.debug(`ProfileScene: ignore message`)
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`ProfileScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    await ctx.replyWithMarkdownV2(
      `Произошла ошибка, выход в главное меню`
    )

    await ctx.scene.leave()
  }
}
