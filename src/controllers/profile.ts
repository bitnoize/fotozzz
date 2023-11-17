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
  getEmojiGender,
  isUserGender,
  isUserNick,
  isUserAbout,
  markupInlineKeyboardProfile
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class ProfileController implements Controller {
  scene: Scenes.BaseScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.BaseScene<AppContext>('profile-scene')

    this.scene.enter(this.enterSceneHandler)
    this.scene.leave(this.leaveSceneHandler)

    this.scene.action('edit-avatar', this.editAvatarHandler)
    this.scene.action('edit-about', this.editAboutHandler)
    this.scene.action('return-menu', this.returnMenuHandler)

    this.scene.use(this.unknownHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    const sessionUser = getSessionUser(ctx)

    const user = await this.postgresService.getUser(sessionUser.id)

    const emojiGender = getEmojiGender(user.gender)
    const extra = markupInlineKeyboardProfile()

    extra.caption =
      `${emojiGender} ${user.nick}\n` +
      `О себе: ${user.about}`

    if (user.avatarTgFileId === undefined) {
      throw new Error(`user ${user.id} avatarTgFileId undefined`)
    } else {
      await ctx.sendPhoto(user.avatarTgFileId, extra)
    }
  }

  private leaveSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply(
      `Ты в главном меню`,
      Markup.removeKeyboard()
    )
  }

  private editAvatarHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.deleteMessage()

    await ctx.scene.leave()
    await ctx.scene.enter('profile-avatar')
  }

  private editAboutHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.deleteMessage()

    await ctx.scene.leave()
    await ctx.scene.enter('profile-about')
  }

  private returnMenuHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.deleteMessage()

    await ctx.scene.leave()
  }

  private unknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply(
      `Неизвестная команда, испольуй кнопки в сообщении`
    )
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`ProfileScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx)
    }

    await ctx.reply(
      `Произошла ошибка, выход в главное меню`
    )

    await ctx.scene.leave()
  }
}


/*

    this.scene.hears('Показать профиль', this.showProfileHandler)
    this.scene.hears('В главное меню', this.leaveSceneHandler)



*/
