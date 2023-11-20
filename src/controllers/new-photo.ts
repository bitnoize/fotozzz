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
  getEmojiGender,
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class NewPhotoController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'new-photo',
      this.enterSceneHandler,
      this.queryPhotoHandler,
      this.replyPhotoComposer(),
      this.queryTopicHandler,
      this.replyTopicComposer(),
      this.queryDescriptionHandler,
      this.replyDescriptionComposer(),
      this.leaveSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
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

    navigation.messageId = null
    navigation.currentPage = 0
    navigation.totalPages = 0

    if (authorize.status !== 'active') {
      await ctx.replyWithMarkdownV2(
        `Добавление фото доступно только для активных пользователей`
      )

      await ctx.scene.leave()
      await ctx.scene.enter('photo')
    } else {
      ctx.wizard.next()

      if (typeof ctx.wizard.step !== 'function') {
        throw new Error(`context wizard step lost`)
      }

      return ctx.wizard.step(ctx, next)
    }
  }

  private returnMenuHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.scene.leave()

    await ctx.replyWithMarkdownV2(
      `Возврат в сцену фото`
    )
  }

  private queryPhotoHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
    `Запости фотку`
    )

    ctx.wizard.next()
  }

  private replyPhotoComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('photo', this.replyPhotoPhotoHandler)
    handler.use(this.replyAvatarUnknownHandler)

    return handler
  }

  private replyPhotoPhotoHandler: AppContextHandler = async (ctx, next) => {
    const newPhoto = ctx.scene.session.newPhoto
    if (newPhoto === undefined) {
      throw new Error(`context scene session newPhoto lost`)
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

      newPhoto.tgFileId = photoSize['file_id']

      ctx.wizard.next()

      if (typeof ctx.wizard.step !== 'function') {
        throw new Error(`context wizard step lost`)
      }

      return ctx.wizard.step(ctx, next)
    }
  }

  private replyPhotoUnknownHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      `Запости фотку`
    )
  }

  private queryTopicHandler: AppContextHandler = async (ctx) => {
    await ctx.replyWithMarkdownV2(
      'Укажи топик',
      markupKeyboardTopics()
    )

    ctx.wizard.next()
  }

  private replyTopicComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    const topics = this.postgresService.getTopics()

    const topicsIds = topics.map((topic) => topic.id)

    handler.action(topics, this.replyGenderActionHandler)
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

    const newPhoto = ctx.scene.session.newPhoto
    if (newPhoto === undefined) {
      throw new Error(`context scene session newPhoto lost`)
    }

    if (!isNewPhoto(newPhoto)) {
      throw new Error(`scene session newPhoto data malformed`)
    }

    const photo = await this.postgresService.newPhoto(
      authorize.id,
      newPhoto.fileId,
      newPhoto.topicId,
      newPhoto.description
    )
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
