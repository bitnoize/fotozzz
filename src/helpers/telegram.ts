import { Markup } from 'telegraf'
import { AppContext } from '../interfaces/app.js'
import {
  Membership,
  Navigation,
  Register,
  ChangeAvatar,
  ChangeAbout,
  NewPhoto,
  DeletePhoto,
  ChatJoinRequest,
  RatePhotoRequest,
  CommentPhotoRequest,
  PhotoSize,
} from '../interfaces/telegram.js'
import { UserGender, User, UserFull } from '../interfaces/user.js'
import { Topic } from '../interfaces/topic.js'
import { Photo } from '../interfaces/photo.js'
import { RateAgg } from '../interfaces/rate.js'
import { USER_NICK_REGEXP, USER_GENDERS } from '../constants/user.js'
import { logger } from '../logger.js'

export const parseChatJoinRequest = (
  ctx: AppContext
): ChatJoinRequest | undefined => {
  if (
    ctx.chatJoinRequest != null &&
    typeof ctx.chatJoinRequest === 'object' &&
    'chat' in ctx.chatJoinRequest &&
    ctx.chatJoinRequest.chat != null &&
    typeof ctx.chatJoinRequest.chat === 'object' &&
    'id' in ctx.chatJoinRequest.chat &&
    ctx.chatJoinRequest.chat.id != null &&
    typeof ctx.chatJoinRequest.chat.id === 'number' &&
    'from' in ctx.chatJoinRequest &&
    ctx.chatJoinRequest.from != null &&
    typeof ctx.chatJoinRequest.from === 'object' &&
    'id' in ctx.chatJoinRequest.from &&
    ctx.chatJoinRequest.from.id != null &&
    typeof ctx.chatJoinRequest.from.id === 'number'
  ) {
    const { id: chatId } = ctx.chatJoinRequest.chat
    const { id: fromId } = ctx.chatJoinRequest.from

    return { chatId, fromId }
  }

  return undefined
}

export const parseRatePhotoRequest = (
  ctx: AppContext
): RatePhotoRequest | undefined => {
  if (
    ctx.callbackQuery != null &&
    typeof ctx.callbackQuery === 'object' &&
    'message' in ctx.callbackQuery &&
    ctx.callbackQuery.message != null &&
    typeof ctx.callbackQuery.message === 'object' &&
    'chat' in ctx.callbackQuery.message &&
    ctx.callbackQuery.message.chat != null &&
    typeof ctx.callbackQuery.message.chat === 'object' &&
    'id' in ctx.callbackQuery.message.chat &&
    ctx.callbackQuery.message.chat.id != null &&
    typeof ctx.callbackQuery.message.chat.id === 'number' &&
    'message_thread_id' in ctx.callbackQuery.message &&
    ctx.callbackQuery.message.message_thread_id != null &&
    typeof ctx.callbackQuery.message.message_thread_id === 'number'
  ) {
    const { id: groupTgChatId } = ctx.callbackQuery.message.chat

    const {
      message_thread_id: groupTgThreadId,
      message_id: groupTgMessageId
    } = ctx.callbackQuery.message

    return { groupTgChatId, groupTgThreadId, groupTgMessageId }
  }

  return undefined
}

export const parseCommentPhotoRequest = (
  ctx: AppContext
): CommentPhotoRequest | undefined => {
  if (
    ctx.message != null &&
    typeof ctx.message === 'object' &&
    'reply_to_message' in ctx.message &&
    ctx.message.reply_to_message != null &&
    typeof ctx.message.reply_to_message === 'object' &&
    'forward_from_chat' in ctx.message.reply_to_message &&
    ctx.message.reply_to_message.forward_from_chat != null &&
    typeof ctx.message.reply_to_message.forward_from_chat === 'object' &&
    'id' in ctx.message.reply_to_message.forward_from_chat &&
    typeof ctx.message.reply_to_message.forward_from_chat.id === 'number' &&
    'forward_from_message_id' in ctx.message.reply_to_message &&
    ctx.message.reply_to_message.forward_from_message_id != null &&
    typeof ctx.message.reply_to_message.forward_from_message_id === 'number'
  ) {
    const {
      id: channelTgChatId
    } = ctx.message.reply_to_message.forward_from_chat

    const {
      forward_from_message_id: channelTgMessageId
    } = ctx.message.reply_to_message

    const text = 'text' in ctx.message ? ctx.message.text ?? null : null

    return { channelTgChatId, channelTgMessageId, text }
  }

  return undefined
}

export const isUserGender = (userGender: unknown): userGender is UserGender => {
  return (
    userGender != null &&
    typeof userGender === 'string' &&
    USER_GENDERS.includes(userGender)
  )
}

export const isUserNick = (userNick: unknown): userNick is string => {
  return (
    userNick != null &&
    typeof userNick === 'string' &&
    USER_NICK_REGEXP.test(userNick)
  )
}

export const isUserAbout = (userAbout: unknown): userAbout is string => {
  return (
    userAbout != null &&
    typeof userAbout === 'string' &&
    userAbout.length >= 3 &&
    userAbout.length <= 300
  )
}

export const isPhotoDescription = (description: unknown): description is string => {
  return (
    description != null &&
    typeof description === 'string' &&
    description.length >= 3 &&
    description.length <= 300
  )
}

export const isRegister = (
  register: Partial<Register>
): register is Register => {
  return (
    register.nick !== undefined &&
    register.gender !== undefined &&
    register.avatarTgFileId !== undefined &&
    register.about !== undefined
  )
}

export const isChangeAvatar = (
  changeAvatar: Partial<ChangeAvatar>
): changeAvatar is ChangeAvatar => {
  return changeAvatar.avatarTgFileId !== undefined
}

export const isChangeAbout = (
  changeAbout: Partial<ChangeAbout>
): changeAbout is ChangeAbout => {
  return changeAbout.about !== undefined
}

export const isNewPhoto = (newPhoto: Partial<NewPhoto>): newPhoto is NewPhoto => {
  return (
    newPhoto.topicId !== undefined &&
    newPhoto.topicName !== undefined &&
    newPhoto.groupTgChatId !== undefined &&
    newPhoto.groupTgThreadId !== undefined &&
    newPhoto.groupTgMessageId !== undefined &&
    newPhoto.channelTgChatId !== undefined &&
    newPhoto.channelTgMessageId !== undefined &&
    newPhoto.tgFileId !== undefined &&
    newPhoto.description !== undefined
  )
}

export const isPhotoSize = (photoSize: unknown): photoSize is PhotoSize => {
  return (
    photoSize != null &&
    typeof photoSize === 'object' &&
    'file_id' in photoSize &&
    photoSize.file_id != null &&
    typeof photoSize.file_id === 'string'
  )
}

const removeLastMessage = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  const { messageId, updatable } = navigation
  if (messageId !== null && !updatable) {
    try {
      await ctx.deleteMessage(messageId)
    } catch (error: unknown) {
      logger.warn(`Navigation deleteMessage ${messageId} failed`)
    }

    navigation.messageId = null
  }
}

const redrawMessage = async (
  ctx: AppContext,
  handler: () => Promise<{ message_id: number } | undefined>
): Promise<void> => {
  const navigation = ctx.session.navigation!

  const { messageId, updatable } = navigation
  if (messageId !== null && !updatable) {
    try {
      await ctx.deleteMessage(messageId)
    } catch (error: unknown) {
      logger.warn(error)
    }
  }

  const message = await handler()

  if (message != undefined) {
    navigation.messageId = message.message_id
  }
}

export const replyMainCheckGroup = async (
  ctx: AppContext,
  groupUrl: string
): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Необходимо подписаться на <a href="${groupUrl}">группу</a>`,
    {
      parse_mode: 'HTML',
      ...keyboardMainCheckGroup()
    }
  )

  navigation.messageId = message.message_id
}

export const replyMainCheckChannel = async (
  ctx: AppContext,
  channelUrl: string
): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Необходимо подписаться на <a href="${channelUrl}">канал</a>`,
    {
      parse_mode: 'HTML',
      ...keyboardMainCheckChannel()
    }
  )

  navigation.messageId = message.message_id
}

export const replyMainMenu = async (ctx: AppContext): Promise<void> => {
  const authorize = ctx.session.authorize!

  await redrawMessage(ctx, async () => {
    const { nick, emojiGender } = authorize
    return await ctx.reply(
      `Бот приветствует тебя, ${emojiGender} <b>${nick}</b>`,
      {
        parse_mode: 'HTML',
        ...keyboardMainMenu()
      }
    )
  })
}

export const replyMainError = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Произошла непредвиденная ошибка`,
    {
      ...keyboardMainMenu()
    }
  )

  navigation.messageId = message.message_id
}

export const replyRegisterNick = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Выбери ник`,
    {
      parse_mode: 'HTML'
    }
  )

  navigation.messageId = message.message_id
}

export const replyRegisterNickUsed = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Этот ник уже используется, выбери другой`,
    {
      parse_mode: 'HTML'
    }
  )

  navigation.messageId = message.message_id
}

export const replyRegisterNickWrong = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Некорректный ник, попробуй еще раз`,
    {
      parse_mode: 'HTML'
    }
  )

  navigation.messageId = message.message_id
}

export const replyRegisterGender = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Укажи пол`,
    {
      parse_mode: 'HTML',
      ...keyboardRegisterGender()
    }
  )

  navigation.messageId = message.message_id
}

export const replyRegisterAvatar = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Загрузи фото для аватара`,
    {
      parse_mode: 'HTML'
    }
  )

  navigation.messageId = message.message_id
}

export const replyRegisterAbout = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Расскажи о себе`,
    {
      parse_mode: 'HTML'
    }
  )

  navigation.messageId = message.message_id
}

export const replyRegisterAboutWrong = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Некорректный ввод, попробуй еще раз`,
    {
      parse_mode: 'HTML'
    }
  )

  navigation.messageId = message.message_id
}

export const replyProfileMenu = async (
  ctx: AppContext,
  userFull: UserFull
): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const {
    emojiGender,
    nick,
    avatarTgFileId,
    about
  } = userFull

  const caption = `${emojiGender} <b>${nick}</b>\n` + 
    `О себе: ${about}`

  const message = await ctx.sendPhoto(
    avatarTgFileId,
    {
      caption,
      parse_mode: 'HTML',
      ...keyboardProfileMenu()
    }
  )

  navigation.messageId = message.message_id
}

export const replyChangeAvatarAvatar = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Загрузи новый аватар`,
    {
      parse_mode: 'HTML',
      ...keyboardChangeAvatarAvatar()
    }
  )

  navigation.messageId = message.message_id
}

export const replyChangeAboutAbout = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Расскажи о себе`,
    {
      parse_mode: 'HTML',
      ...keyboardChangeAboutAbout()
    }
  )

  navigation.messageId = message.message_id
}

export const replyChangeAboutAboutWrong = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Некорректный ввод, попробуй еще раз`,
    {
      ...keyboardChangeAboutAbout()
    }
  )

  navigation.messageId = message.message_id
}

export const replyPhotoMenu = async (
  ctx: AppContext,
  user: User,
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

    const keyboard = keyboardPhotoMenu(navigation, photo)

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
          parse_mode: 'HTML',
          ...keyboard
        }
      )
    } else {
      navigation.updatable = true

      const message = await ctx.sendPhoto(
        photo.tgFileId,
        {
          caption,
          parse_mode: 'HTML',
          ...keyboard
        }
      )

      navigation.messageId = message.message_id
    }
  } else {
    const message = await ctx.reply(
      `У тебя нет опубликованных фото\n` +
      `Отправь мне фото для публикации\n` +
      `Ты можешь загрузить 3 фото в течении 24 часов`,
      {
        parse_mode: 'HTML',
        ...keyboardPhotoBlank()
      }
    )

    navigation.messageId = message.message_id
  }
}

export const replyNewPhotoPhoto = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Загрузи фотографию`,
    {
      parse_mode: 'HTML',
      ...keyboardNewPhotoPhoto()
    }
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoTopics = async (
  ctx: AppContext,
  topics: Topic[]
): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Выбери раздел`,
    {
      parse_mode: 'HTML',
      ...keyboardNewPhotoTopics(topics)
    }
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoDescription = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Описание для фото`,
    {
      parse_mode: 'HTML',
      ...keyboardNewPhotoDescription()
    }
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoDescriptionWrong = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Некорректный ввод, попробуй еще раз`,
    {
      parse_mode: 'HTML',
      ...keyboardNewPhotoDescription()
    }
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoPublish = async (
  ctx: AppContext,
  newPhoto: NewPhoto
): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const { topicName, tgFileId, description } = newPhoto

  const caption = `Опубликовать фото?\n` +
    `Раздел: ${topicName}\n` +
    `Описание: ${description}`

  const message = await ctx.sendPhoto(
    tgFileId,
    {
      caption,
      parse_mode: 'HTML',
      ...keyboardNewPhotoPublish(),
    }
  )

  navigation.messageId = message.message_id
}

export const replyDeletePhotoPhoto = async (
  ctx: AppContext,
  photo: Photo
): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const { tgFileId, description } = photo

  const caption = `Точно удалить это фото?\n` + description

  const message = await ctx.sendPhoto(
    tgFileId,
    {
      caption,
      parse_mode: 'HTML',
      ...keyboardDeletePhotoPhoto()
    }
  )

  navigation.messageId = message.message_id
}

export const replySearchWelcome = async (ctx: AppContext): Promise<void> => {
  const navigation = ctx.session.navigation!

  await removeLastMessage(ctx)

  const message = await ctx.reply(
    `Введи ник для поиска`,
    {
      parse_mode: 'HTML',
      ...keyboardSearchWelcome(),
    }
  )

  navigation.messageId = message.message_id
}

export const replySearchNickWrong = async (ctx: AppContext): Promise<void> => {
  await redrawMessage(ctx, async () => {
    return await ctx.reply(
      `Некорректный ник, попробуй еще раз`,
      {
        parse_mode: 'HTML',
        ...keyboardSearchWelcome()
      }
    )
  })
}

export const replySearchUserNotFound = async (ctx: AppContext): Promise<void> => {
  await redrawMessage(ctx, async () => {
    return await ctx.reply(
      `Пользователь с указанным ником не найден, попробуй еще раз`,
      {
        parse_mode: 'HTML',
        ...keyboardSearchWelcome()
      }
    )
  })
}

export const replySearchUserFound = async (
  ctx: AppContext,
  userFull: UserFull
): Promise<void> => {
  await redrawMessage(ctx, async () => {
    const {
      id,
      emojiGender,
      nick,
      avatarTgFileId,
      about,
      photosTotal,
      commentsTotal
    } = userFull

    const caption = `${emojiGender} <b>${nick}</b>\n` +
      `О себе: ${about}\n` +
      `Фото: ${photosTotal}\n` +
      `Комментарии: ${commentsTotal}`

    return await ctx.sendPhoto(
      avatarTgFileId,
      {
        caption,
        parse_mode: 'HTML',
        ...keyboardSearchUserFound(id, photosTotal)
      }
    )
  })
}

export const replyShowUserMenu = async (
  ctx: AppContext,
  userFull: UserFull,
  photos: Photo[]
): Promise<void> => {
  const navigation = ctx.session.navigation!

  await redrawMessage(ctx, async () => {
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

      const { currentPage, totalPages } = navigation
      const { channelTgChatId, channelTgMessageId, tgFileId, description } = photo

      const caption =
        `Описание: ${description}\n` +
        `Фото ${currentPage} из ${totalPages}`

      const keyboard = keyboardShowUserMenu(
        currentPage,
        totalPages,
        channelTgChatId,
        channelTgMessageId
      )

      if (navigation.updatable) {
        await ctx.editMessageMedia(
          {
            type: 'photo',
            media: tgFileId
          },
          {
            ...keyboard
          }
        )

        await ctx.editMessageCaption(
          caption,
          {
            parse_mode: 'HTML',
            ...keyboard
          }
        )
      } else {
        navigation.updatable = true

        return await ctx.sendPhoto(
          tgFileId,
          {
            caption,
            parse_mode: 'HTML',
            ...keyboard
          }
        )
      }
    } else {
      return await ctx.reply(
        `Пользователь еще не опубликовал фотографий`,
        {
          parse_mode: 'HTML',
          ...keyboardShowUserBlank()
        }
      )
    }

    return undefined
  })
}

export const postNewPhotoGroup = async (
  ctx: AppContext,
  user: User,
  newPhoto: NewPhoto
): Promise<number> => {
  const { nick, emojiGender } = user
  const {
    groupTgChatId,
    groupTgThreadId,
    tgFileId,
    description
  } = newPhoto

  const caption = `${emojiGender} <b>${nick}</b>\n` + description

  const message = await ctx.telegram.sendPhoto(
    groupTgChatId,
    tgFileId,
    {
      message_thread_id: groupTgThreadId,
      caption,
      parse_mode: 'HTML',
      ...keyboardNewPhotoGroup(newPhoto),
    }
  )

  return message.message_id
}

export const postNewPhotoChannel = async (
  ctx: AppContext,
  user: User,
  newPhoto: NewPhoto
): Promise<number> => {
  const { nick, emojiGender } = user
  const {
    topicName,
    channelTgChatId,
    tgFileId,
    description
  } = newPhoto

  const caption = `${emojiGender} <b>${nick}</b>\n` +
    `Раздел: #${topicName}\n` +
    description

  const message = await ctx.telegram.sendPhoto(
    channelTgChatId,
    tgFileId,
    {
      caption,
      parse_mode: 'HTML',
    }
  )

  return message.message_id
}

export const updatePhotoGroup = async (
  ctx: AppContext,
  user: User,
  photo: Photo,
  ratesAgg: RateAgg[]
): Promise<void> => {
  const { nick, emojiGender } = user
  const {
    groupTgChatId,
    groupTgThreadId,
    groupTgMessageId,
    description
  } = photo

  const ratesView = ratesAgg.map((rateCount) => {
    if (rateCount.value === 'not_appropriate') {
      return `\u{1F627} ${rateCount.count}`
    } else if (rateCount.value === 'cute') {
      return `\u{1F970} ${rateCount.count}`
    } else if (rateCount.value === 'amazing') {
      return `\u{1F60D} ${rateCount.count}`
    } else if (rateCount.value === 'shock') {
      return `\u{1F92A} ${rateCount.count}`
    }
  }).join(' ')

  const caption = `${emojiGender} <b>${nick}</b>\n` +
    `${description}\n` +
    `Оценки: ${ratesView}`

  await ctx.telegram.editMessageCaption(
    groupTgChatId,
    groupTgMessageId,
    undefined,
    caption,
    {
      message_thread_id: groupTgThreadId,
      parse_mode: 'HTML',
      ...keyboardUpdatePhotoGroup(photo)
    }
  )
}

const keyboardMainCheckGroup = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Я уже подписан на группу`, 'main-start')
  ])
}

const keyboardMainCheckChannel = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Я уже подписан на канал`, 'main-start')
  ])
}

const keyboardMainMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Профиль', 'main-profile')],
    [Markup.button.callback('Фото', 'main-photo')],
    [Markup.button.callback('Поиск', 'main-search')]
  ])
}

const keyboardRegisterGender = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Мужской`, 'register-gender-male'),
    Markup.button.callback(`Женский`, 'register-gender-female'),
    Markup.button.callback(`Пара`, 'register-gender-couple')
  ])
}

const keyboardProfileMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Изменить аватар', 'profile-change-avatar')],
    [Markup.button.callback('Редактировать о себе', 'profile-change-about')],
    [Markup.button.callback('Вернуться в главное меню', 'profile-back')]
  ])
}

const keyboardChangeAvatarAvatar = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'change-avatar-back')
  ])
}

const keyboardChangeAboutAbout = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'change-about-back')
  ])
}

const keyboardPhotoMenu = (
  navigation: Navigation,
  photo: Photo
) => {
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
      Markup.button.callback(prevButton, 'photo-prev'),
      Markup.button.url('*', url),
      Markup.button.callback(nextButton, 'photo-next')
    ],
    [Markup.button.callback('Удалить', `photo-delete-${photo.id}`)],
    [Markup.button.callback('Добавить', 'photo-new')],
    [Markup.button.callback('Вернуться в главное меню', 'photo-back')]
  ])
}

const keyboardPhotoBlank = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Добавить', 'photo-new')],
    [Markup.button.callback('Вернуться в главное меню', 'photo-back')]
  ])
}

const keyboardNewPhotoPublish = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'new-photo-back'),
    Markup.button.callback('Да, опубликовать', 'new-photo-publish')
  ])
}

const keyboardNewPhotoPhoto = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'new-photo-back')
  ])
}

const keyboardNewPhotoDescription = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'new-photo-back')
  ])
}

const keyboardNewPhotoTopics = (topics: Topic[]) => {
  const topicsButtons = topics.map((topic) => {
    return [Markup.button.callback(topic.name, `new-photo-topic-${topic.id}`)]
  })

  return Markup.inlineKeyboard([
    ...topicsButtons,
    [Markup.button.callback('Отмена', 'new-photo-back')]
  ])
}

export const keyboardDeletePhotoPhoto = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'delete-photo-back'),
    Markup.button.callback('Да, удалить', 'delete-photo-next')
  ])
}

export const keyboardSearchWelcome = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Вернуться в главное меню', 'search-back')]
  ])
}

export const keyboardSearchUserFound = (
  userId: number,
  photosTotal: number
) => {
  const buttons = []

  if (photosTotal > 0) {
    buttons.push(
      [Markup.button.callback('Просмотреть фото', `search-show-${userId}`)]
    )
  }

  buttons.push(
    [Markup.button.callback('Вернуться в главное меню', 'search-back')]
  )

  return Markup.inlineKeyboard(buttons)
}

export const keyboardShowUserMenu = (
  currentPage: number,
  totalPages: number,
  channelTgChatId: number,
  channelTgMessageId: number
) => {
  const prevButton = currentPage !== 1 ? '<<' : ' '
  const nextButton = currentPage !== totalPages ? '>>' : ' '

  const channelTgChatIdFix =
    Math.abs(channelTgChatId).toString().replace(/^100/, '')
  const url = `https://t.me/c/${channelTgChatIdFix}/${channelTgMessageId}`

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(prevButton, 'show-user-prev'),
      Markup.button.url('*', url),
      Markup.button.callback(nextButton, 'show-user-next')
    ],
    [Markup.button.callback('Вернуться в поиск', 'show-user-back')]
  ])
}

export const keyboardShowUserBlank = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Вернуться в поиск', 'show-user-back')]
  ])
}

const keyboardNewPhotoGroup = (newPhoto: NewPhoto) => {
  const { channelTgChatId, channelTgMessageId } = newPhoto

  const chatId = Math.abs(channelTgChatId).toString().replace(/^100/, '')
  const url = `https://t.me/c/${chatId}/${channelTgMessageId}`

  return Markup.inlineKeyboard([
    [Markup.button.callback('\u{1F92A} Шокирует', 'rate-shock')],
    [Markup.button.callback('\u{1F60D} Восхищяет', 'rate-amazing')],
    [Markup.button.callback('\u{1F970} Умиляет', 'rate-cute')],
    [Markup.button.callback('\u{1F627} Не уместно', 'rate-not_appropriate')],
    [Markup.button.url('Комментарии', url)]
  ])
}

const keyboardUpdatePhotoGroup = (photo: Photo) => {
  const { channelTgChatId, channelTgMessageId } = photo

  const chatId = Math.abs(channelTgChatId).toString().replace(/^100/, '')
  const url = `https://t.me/c/${chatId}/${channelTgMessageId}`

  return Markup.inlineKeyboard([
    [Markup.button.callback('\u{1F92A} Шокирует', 'rate-shock')],
    [Markup.button.callback('\u{1F60D} Восхищяет', 'rate-amazing')],
    [Markup.button.callback('\u{1F970} Умиляет', 'rate-cute')],
    [Markup.button.callback('\u{1F627} Не уместно', 'rate-not_appropriate')],
    [Markup.button.url('Комментарии', url)]
  ])
}
