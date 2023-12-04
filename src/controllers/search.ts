import { Scenes, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppBaseScene
} from '../interfaces/app.js'
import { Navigation, Search } from '../interfaces/telegram.js'
import { User } from '../interfaces/user.js'
import { Photo } from '../interfaces/photo.js'
import { isUserNick, replyMainMenu } from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class SearchController extends BaseController {
  readonly scene: AppBaseScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.BaseScene<AppContext>('search')

    this.scene.enter(this.enterSceneHandler)

    this.scene.on('text', this.searchUserHandler)
    this.scene.action('search-prev', this.prevPhotoHandler)
    this.scene.action('search-next', this.nextPhotoHandler)
    this.scene.action('search-back', this.returnMainHandler)

    this.scene.use(this.enterSceneHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const navigation = ctx.session.navigation!

    navigation.updatable = false
    navigation.currentPage = 0
    navigation.totalPages = 0

    const allowedStatuses = ['active', 'penalty']
    if (allowedStatuses.includes(authorize.status)) {
      await replySearchWelcome(ctx)
    } else {
      delete ctx.scene.session.search

      await ctx.scene.leave()

      await replyMainMenu(ctx)
    }
  }

  private searchUserHandler: AppContextHandler = async (ctx) => {
    const navigation = ctx.session.navigation!

    navigation.updatable = false
    navigation.currentPage = 0
    navigation.totalPages = 0

    delete ctx.scene.session.search

    if (ctx.has(message('text'))) {
      const userNick = ctx.message.text

      if (isUserNick(userNick)) {
        const userFull = await this.postgresService.searchUserFull(userNick)

        if (userFull !== undefined) {
          const search: Search = {
            userId: user.id
          }

          ctx.scene.session.search = search

          const photos = await this.postgresService.getPhotosUser(userFull.id)

          await replyUserFound(ctx, userFull, photos)
        } else {
          await replyUserNotFound(ctx)
        }
      } else {
        await replyUserNickWrong(ctx)
      }
    }
  }

  private prevPhotoHandler: AppContextHandler = async (ctx) => {
    const navigation = ctx.session.navigation!

    const search = ctx.scene.session.search
    if (search === undefined) {
      throw new Error(`context scene session search lost`)
    }

    if (
      navigation.currentPage > 1 &&
      navigation.currentPage <= navigation.totalPages
    ) {
      navigation.currentPage = navigation.currentPage - 1
    }

    const userFull = await this.postgresService.getUserFull(search.userId)

    const photos = await this.postgresService.getPhotosUser(userFull.id)

    await replyUserFound(ctx, userFull, photos)
  }

  private nextPhotoHandler: AppContextHandler = async (ctx) => {
    const navigation = ctx.session.navigation!

    const search = ctx.scene.session.search
    if (search === undefined) {
      throw new Error(`context scene session search lost`)
    }

    if (
      navigation.currentPage >= 1 &&
      navigation.currentPage < navigation.totalPages
    ) {
      navigation.currentPage = navigation.currentPage + 1
    }

    const userFull = await this.postgresService.getUserFull(search.userId)

    const photos = await this.postgresService.getPhotosUser(userFull.id)

    await replyUserFound(ctx, userFull, photos)
  }
}

export const replySearchWelcome = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Введи ник для поиска`,
    {
      parse_mode: 'MarkdownV2',
      ...keyboardSearchMenu(),
    }
  )

  navigation.messageId = message.message_id
}

export const replyUserNotFound = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Пользователь с указанным ником не найден, попробуй еще раз`,
    {
      parse_mode: 'MarkdownV2',
      ...keyboardSearchMenu(),
    }
  )

  navigation.messageId = message.message_id
}

export const replyUserNickWrong = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Некорректный ник, попробуй еще раз`,
    {
      parse_mode: 'MarkdownV2',
      ...keyboardSearchMenu(),
    }
  )

  navigation.messageId = message.message_id
}

export const replyUserFound = async (
  ctx: AppContext,
  userFull: UserFull,
  photos: Photo[]
): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  if (photos.length > 0) {
    navigation.totalPages = photos.length

    if (navigation.currentPage < 1) {
      navigation.currentPage = 1
    } else if (navigation.currentPage > navigation.totalPages) {
      navigation.currentPage = navigation.totalPages
    }

    const photo = photos[navigation.currentPage - 1]
    if (photo === undefined) {
      throw new Error(`can't get user photo by index`)
    }

    const caption = `${photo.description}\n` +
      `Фото ${navigation.currentPage} из ${navigation.totalPages}`

    const keyboard = keyboardUserFound(navigation, photo)

    if (navigation.updatable) {
      await ctx.editMessageMedia(
        {
          type: 'photo',
          media: photo.tgFileId
        },
        {
          ...keyboard
        }
      )

      await ctx.editMessageCaption(
        caption,
        {
          parse_mode: 'MarkdownV2',
          ...keyboard
        }
      )
    } else {
      navigation.updatable = true

      const message = await ctx.sendPhoto(
        photo.tgFileId,
        {
          caption,
          parse_mode: 'MarkdownV2',
          ...keyboard
        }
      )

      navigation.messageId = message.message_id
    }
  } else {
    const message = await ctx.reply(
      `Пользователь еще не опубликовал фотографий`,
      {
        parse_mode: 'MarkdownV2',
        ...keyboardSearchMenu()
      }
    )

    navigation.messageId = message.message_id
  }
}

export const keyboardSearchMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Вернуться в главное меню', 'search-back')]
  ])
}

export const keyboardUserFound = (navigation: Navigation, photo: Photo) => {
  const prevButton = navigation.currentPage !== 1 ? '<<' : ' '
  const nextButton = navigation.currentPage !== navigation.totalPages ? '>>' : ' '

  const {
    channelTgChatId,
    channelTgMessageId: messageId
  } = photo

  const chatId = Math.abs(channelTgChatId).toString().replace(/^100/, '')
  const url = `https://t.me/c/${chatId}/${messageId}`

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(prevButton, 'search-prev'),
      Markup.button.url('*', url),
      Markup.button.callback(nextButton, 'search-next')
    ],
    [Markup.button.callback('Вернуться в главное меню', 'search-back')]
  ])
}

