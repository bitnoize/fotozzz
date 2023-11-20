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
  markupKeyboardPhoto
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class PhotoController implements Controller {
  scene: Scenes.BaseScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.BaseScene<AppContext>('photo')

    this.scene.enter(this.enterSceneHandler)

    this.scene.action('next-photo', this.nextPhotoHandler)
    this.scene.action('view-photo', this.viewPhotoHandler)
    this.scene.action('prev-photo', this.prevPhotoHandler)
    this.scene.action('delete-photo', this.deletePhotoHandler)
    this.scene.action('return-menu', this.returnMenuHandler)

    this.scene.leave(this.leaveSceneHandler)

    this.scene.use(this.unknownHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private deletePhotoHandler = async (ctx: AppContext): Promise<void> => {
    
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

    const userPhotos = await this.postgresService.getUserPhotos(authorize.id)

    if (userPhotos.length === 0) {
      const message = await ctx.replyWithMarkdownV2(
        `У вас нет опубликованных фото\n` +
        `Отправьте мне фото для публикации` +
        `Вы можете загрузить 3 фото в течении 24 часов`
      )

      navigation.messageId = message.message_id
      navigation.currentPage = 0
      navigation.totalPages = 0
    } else {
      const userPhoto = userPhotos[1]
      if (userPhoto === undefined) {
        throw new Error(`can't get first user photo`)
      }

      const emojiGender = getEmojiGender(user.gender)
      const extra = markupKeyboardPhoto()

      extra.caption = userPhoto.description

      if (navigation.messageId != null) {
        const message = await ctx.editMessageMedia(
          {
            type: 'photo',
            file_id: user.avatarTgFileId
          },
          extra
        )

        navigation.messageId = message.message_id
      } else {
        const message = await ctx.sendPhoto(user.avatarTgFileId, extra)

        navigation.messageId = message.message_id
      }

      if (navigation.currentPage === 0) {
        navigation.currentPage = 1
      }

      navigation.totalPages = userPhotos.length
    }
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
