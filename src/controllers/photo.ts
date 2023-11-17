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
  markupInlineKeyboardPhoto
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class PhotoController implements Controller {
  scene: Scenes.BaseScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.BaseScene<AppContext>('photo-scene')

    this.scene.enter(this.enterSceneHandler)
    this.scene.leave(this.leaveSceneHandler)

    this.scene.action('next-photo', this.nextPhotoHandler)

    this.scene.use(this.unknownHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    const sessionUser = getSessionUser(ctx)
  }

  private leaveSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply(
      `Ты в главном меню`
    )
  }

  private backMenuHandler = async (ctx: AppContext): Promise<void> => {
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
      `Произошла ошибка, выход в главное меню`,
    )

    await ctx.scene.leave()
  }
}
