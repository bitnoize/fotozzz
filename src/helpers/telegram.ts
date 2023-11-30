import { Markup } from 'telegraf'
//import { ReplyKeyboardMarkup, User } from 'telegraf/types'
import {
  AppContext,
  Register,
  ChangeAvatar,
  ChangeAbout,
  NewPhoto,
  NewPhotoPublish,
  DeletePhoto,
  Membership,
  Navigation
} from '../interfaces/app.js'
import { UserGender, User, UserFull } from '../interfaces/user.js'
import { Topic } from '../interfaces/topic.js'
import { Photo } from '../interfaces/photo.js'
import { RateAgg } from '../interfaces/rate.js'
import {
  ChatJoinRequest,
  RatePhotoRequest,
  CommentPhotoRequest,
  PhotoSize
} from '../interfaces/telegram.js'
import { USER_NICK_REGEXP, USER_GENDERS } from '../constants/user.js'

export const wizardNextStep = (
  ctx: AppContext,
  next: () => Promise<void>
): unknown => {
  ctx.wizard.next()

  if (typeof ctx.wizard.step !== 'function') {
    throw new Error(`context wizard step lost`)
  }

  return ctx.wizard.step(ctx, next)
}

export const blankNavigation = (): Navigation => {
  const navigation: Navigation = {
    messageId: null,
    updatable: false,
    currentPage: 0,
    totalPages: 0
  }

  return navigation
}

export const resetNavigation = (navigation: Navigation) => {
  navigation.updatable = false
  navigation.currentPage = 0
  navigation.totalPages = 0
}

export const navigationNextPage = (navigation: Navigation) => {
  if (
    navigation.currentPage >= 1 &&
    navigation.currentPage < navigation.totalPages
  ) {
    navigation.currentPage = navigation.currentPage + 1
  }
}

export const navigationPrevPage = (navigation: Navigation) => {
  if (
    navigation.currentPage > 1 &&
    navigation.currentPage <= navigation.totalPages
  ) {
    navigation.currentPage = navigation.currentPage - 1
  }
}

export const blankMembership = (): Membership => {
  const membership: Membership = {
    checkGroup: null,
    checkChannel: null
  }

  return membership
}

export const initSessionAuthorize = (ctx: AppContext, user: User) => {
  ctx.session.authorize = user
}

export const sureSessionAuthorize = (ctx: AppContext): User => {
  const authorize = ctx.session.authorize
  if (authorize === undefined) {
    throw new Error(`context session authorize lost`)
  }

  return authorize
}

export const initSessionMembership = (ctx: AppContext, membership: Membership) => {
  ctx.session.membership = membership
}

export const sureSessionMembership = (ctx: AppContext): Membership => {
  const membership = ctx.session.membership
  if (membership === undefined) {
    throw new Error(`context session membership lost`)
  }

  return membership
}

export const initSessionNavigation = (ctx: AppContext, navigation: Navigation) => {
  ctx.session.navigation = navigation
}

export const sureSessionNavigation = (ctx: AppContext): Navigation => {
  const navigation = ctx.session.navigation
  if (navigation === undefined) {
    throw new Error(`context session navigation lost`)
  }

  return navigation
}

export const initSceneSessionRegister = (ctx: AppContext) => {
  ctx.scene.session.register = {} as Partial<Register>
}

export const sureSceneSessionRegister = (ctx: AppContext): Partial<Register> => {
  const register = ctx.scene.session.register
  if (register === undefined) {
    throw new Error(`context scene session register lost`)
  }

  return register
}

export const dropSceneSessionRegister = (ctx: AppContext) => {
  delete ctx.scene.session.register
}

export const initSceneSessionChangeAvatar = (ctx: AppContext) => {
  ctx.scene.session.changeAvatar = {} as Partial<ChangeAvatar>
}

export const sureSceneSessionChangeAvatar = (
  ctx: AppContext
): Partial<ChangeAvatar> => {
  const changeAvatar = ctx.scene.session.changeAvatar
  if (changeAvatar === undefined) {
    throw new Error(`context scene session changeAvatar lost`)
  }

  return changeAvatar
}

export const dropSceneSessionChangeAvatar = (ctx: AppContext) => {
  delete ctx.scene.session.changeAvatar
}

export const initSceneSessionChangeAbout = (ctx: AppContext) => {
  ctx.scene.session.changeAbout = {} as Partial<ChangeAbout>
}

export const sureSceneSessionChangeAbout = (
  ctx: AppContext
): Partial<ChangeAbout> => {
  const changeAbout = ctx.scene.session.changeAbout
  if (changeAbout === undefined) {
    throw new Error(`context scene session changeAbout lost`)
  }

  return changeAbout
}

export const dropSceneSessionChangeAbout = (ctx: AppContext) => {
  delete ctx.scene.session.changeAbout
}

export const initSceneSessionNewPhoto = (ctx: AppContext) => {
  ctx.scene.session.newPhoto = {} as Partial<NewPhoto>
}

export const sureSceneSessionNewPhoto = (ctx: AppContext): Partial<NewPhoto> => {
  const newPhoto = ctx.scene.session.newPhoto
  if (newPhoto === undefined) {
    throw new Error(`context scene session newPhoto lost`)
  }

  return newPhoto
}

export const dropSceneSessionNewPhoto = (ctx: AppContext) => {
  delete ctx.scene.session.newPhoto
}

export const initSceneSessionDeletePhoto = (
  ctx: AppContext,
  deletePhoto: DeletePhoto
) => {
  ctx.scene.session.deletePhoto = deletePhoto
}

export const sureSceneSessionDeletePhoto = (ctx: AppContext): DeletePhoto => {
  const deletePhoto = ctx.scene.session.deletePhoto
  if (deletePhoto === undefined) {
    throw new Error(`context scene session deletePhoto lost`)
  }

  return deletePhoto
}

export const dropSceneSessionDeletePhoto = (ctx: AppContext) => {
  delete ctx.scene.session.deletePhoto
}

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

export const isPhotoSize = (photoSize: unknown): photoSize is PhotoSize => {
  return (
    photoSize != null &&
    typeof photoSize === 'object' &&
    'file_id' in photoSize &&
    photoSize.file_id != null &&
    typeof photoSize.file_id === 'string'
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

export const isRegister = (register: Partial<Register>): register is Register => {
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

export const isNewPhotoPublish = (
  newPhoto: Partial<NewPhotoPublish>
): newPhoto is NewPhotoPublish => {
  return (
    newPhoto.topicId !== undefined &&
    newPhoto.topicName !== undefined &&
    newPhoto.groupTgChatId !== undefined &&
    newPhoto.groupTgThreadId !== undefined &&
    newPhoto.channelTgChatId !== undefined &&
    newPhoto.tgFileId !== undefined &&
    newPhoto.description !== undefined
  )
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

export const keyboardMainCheckGroup = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Я уже подписан на группу`, 'main-start')
  ])
}

export const keyboardMainCheckChannel = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Я уже подписан на канал`, 'main-start')
  ])
}

export const keyboardMainMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Профиль', 'main-profile')],
    [Markup.button.callback('Фото', 'main-photo')],
    [Markup.button.callback('Поиск', 'main-search')]
  ])
}

export const keyboardRegisterGender = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Мужской`, 'register-gender-male'),
    Markup.button.callback(`Женский`, 'register-gender-female'),
    Markup.button.callback(`Пара`, 'register-gender-couple')
  ])
}

export const keyboardProfileMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Редактировать аватар', 'profile-change-avatar')],
    [Markup.button.callback('Редактировать о себе', 'profile-change-about')],
    [Markup.button.callback('Вернуться в главное меню', 'profile-back')]
  ])
}

export const keyboardChangeAvatarAvatar = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'change-avatar-back')
  ])
}

export const keyboardChangeAboutAbout = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'change-about-back')
  ])
}

export const keyboardPhotoMenu = (
  photo: Photo,
  navigation: Navigation
) => {
  const prevBtn = navigation.currentPage !== 1 ? '<<' : ' '
  const nextBtn = navigation.currentPage !== navigation.totalPages ? '>>' : ' '

  const {
    channelTgChatId,
    channelTgMessageId: messageId
  } = photo

  const chatId = Math.abs(channelTgChatId).toString().replace(/^100/, '')
  const url = `https://t.me/c/${chatId}/${messageId}`

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(prevBtn, 'photo-prev'),
      Markup.button.url('*', url),
      Markup.button.callback(nextBtn, 'photo-next')
    ],
    [Markup.button.callback('Удалить', `photo-delete-${photo.id}`)],
    [Markup.button.callback('Добавить', 'photo-new')],
    [Markup.button.callback('Вернуться в главное меню', 'photo-back')]
  ])
}

export const keyboardPhotoBlank = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Добавить', 'photo-new')],
    [Markup.button.callback('Вернуться в главное меню', 'photo-back')]
  ])
}

export const keyboardNewPhotoPhoto = () => {
  return Markup.inlineKeyboard([Markup.button.callback('Отмена', 'new-photo-back')])
}

export const keyboardNewPhotoDescription = () => {
  return Markup.inlineKeyboard([Markup.button.callback('Отмена', 'new-photo-back')])
}

export const keyboardNewPhotoTopics = (topics: Topic[]) => {
  const topicsButtons = topics.map((topic) => {
    return [Markup.button.callback(topic.name, `new-photo-topic-${topic.id}`)]
  })

  return Markup.inlineKeyboard([
    ...topicsButtons,
    [Markup.button.callback('Отмена', 'new-photo-back')]
  ])
}

export const keyboardNewPhotoPublish = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'new-photo-back'),
    Markup.button.callback('Да, конечно!', 'new-photo-publish')
  ])
}

export const keyboardDeletePhotoPhoto = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'delete-photo-back'),
    Markup.button.callback('Да, удаляем', 'delete-photo-next')
  ])
}

export const keyboardSearchIntro = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Вернуться в главное меню', 'search-back')]
  ])
}

export const keyboardNewPhotoGroup = (
  channelTgChatId: number,
  channelTgMessageId: number
) => {
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

export const removeLastMessage = async (
  ctx: AppContext,
  navigation: Navigation
): Promise<void> => {
  if (navigation.messageId !== null && !navigation.updatable) {
    await ctx.deleteMessage(navigation.messageId)

    navigation.messageId = null
  }
}

export const replyMainCheckGroup = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  groupUrl: string
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Необходимо подписаться на [группу](${groupUrl})`,
    keyboardMainCheckGroup()
  )

  navigation.messageId = message.message_id
}

export const replyMainCheckChannel = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  channelUrl: string
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Необходимо подписаться на [канал](${channelUrl})`,
    keyboardMainCheckChannel()
  )

  navigation.messageId = message.message_id
}

export const replyMainMenu = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const { nick, emojiGender } = authorize

  const message = await ctx.replyWithMarkdownV2(
    `Бот приветствует тебя, ${emojiGender} *${nick}*\n`,
    keyboardMainMenu()
  )

  navigation.messageId = message.message_id
}

export const replyMainError = async (ctx: AppContext): Promise<void> => {
  await ctx.replyWithMarkdownV2(
    `Произошла непредвиденная ошибка, возврат в главное меню`
  )
}

export const replyRegisterNick = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(`Выбери ник`)

  navigation.messageId = message.message_id
}

export const replyRegisterNickUsed = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Этот ник уже используется, выбери другой`
  )

  navigation.messageId = message.message_id
}

export const replyRegisterNickWrong = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Некорректный ввод, попробуй еще раз`
  )

  navigation.messageId = message.message_id
}

export const replyRegisterGender = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Укажи пол`,
    keyboardRegisterGender()
  )

  navigation.messageId = message.message_id
}

export const replyRegisterAvatar = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(`Загрузи аватар`)

  navigation.messageId = message.message_id
}

export const replyRegisterAbout = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(`Расскажи о себе`)

  navigation.messageId = message.message_id
}

export const replyRegisterAboutWrong = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Некорректный ввод, попробуй еще раз`
  )

  navigation.messageId = message.message_id
}

export const replyProfileMenu = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  userFull: UserFull
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const { emojiGender, nick, about } = userFull
  const caption = `${emojiGender} ${nick}\nО себе: ${about}`

  const message = await ctx.sendPhoto(userFull.avatarTgFileId, {
    ...keyboardProfileMenu(),
    //reply_markup: 'MarkdownV2',
    caption
  })

  navigation.messageId = message.message_id
}

export const replyChangeAvatarAvatar = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Загрузи новый аватар`,
    keyboardChangeAvatarAvatar()
  )

  navigation.messageId = message.message_id
}

export const replyChangeAboutAbout = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Расскажи о себе`,
    keyboardChangeAboutAbout()
  )

  navigation.messageId = message.message_id
}

export const replyChangeAboutAboutWrong = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Некорректный ввод, попробуй еще раз`,
    keyboardChangeAboutAbout()
  )

  navigation.messageId = message.message_id
}

export const replyPhotoMenu = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  photos: Photo[]
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

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

    const keyboard = keyboardPhotoMenu(photo, navigation)

    if (navigation.updatable) {
      await ctx.editMessageMedia(
        {
          type: 'photo',
          media: photo.tgFileId
        },
        {
          ...keyboard,
          //reply_markup: 'MarkdownV2',
        }
      )

      await ctx.editMessageCaption(
        caption,
        {
          ...keyboard
        }
      )
    } else {
      navigation.updatable = true

      const message = await ctx.sendPhoto(photo.tgFileId, {
        ...keyboard,
        //reply_markup: 'MarkdownV2',
        caption
      })

      navigation.messageId = message.message_id
    }
  } else {
    const message = await ctx.replyWithMarkdownV2(
      `У вас нет опубликованных фото\n` +
      `Отправьте мне фото для публикации\n` +
      `Вы можете загрузить 3 фото в течении 24 часов`,
      keyboardPhotoBlank()
    )

    navigation.messageId = message.message_id

    resetNavigation(navigation)
  }
}

export const replyNewPhotoPhoto = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Загрузи фотографию`,
    keyboardNewPhotoPhoto()
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoTopics = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  topics: Topic[]
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Выбери раздел`,
    keyboardNewPhotoTopics(topics)
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoDescription = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Описание для фото`,
    keyboardNewPhotoDescription()
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoDescriptionWrong = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Некорректный ввод, попробуй еще раз`,
    keyboardNewPhotoDescription()
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoPublish = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  newPhoto: NewPhotoPublish
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const { topicName, description } = newPhoto

  const caption =
    `*Опубликовать фото?*\n` + `Раздел: ${topicName}\n` + `Описание: ${description}`

  const message = await ctx.sendPhoto(
    newPhoto.tgFileId,
    {
      ...keyboardNewPhotoPublish(),
      //reply_markup: 'MarkdownV2',
      caption
    }
  )

  navigation.messageId = message.message_id
}

export const replyDeletePhotoPhoto = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  deletePhoto: DeletePhoto
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const { description } = deletePhoto

  const caption = `*Точно удалить фото?*\n` + description

  const message = await ctx.sendPhoto(
    deletePhoto.tgFileId,
    {
      ...keyboardDeletePhotoPhoto(),
      //reply_markup: 'MarkdownV2',
      caption
    }
  )

  navigation.messageId = message.message_id
}

export const replySearchIntro = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
): Promise<void> => {
  await removeLastMessage(ctx, navigation)

  const message = await ctx.reply(
    `Введи ник для поиска`,
    {
      ...keyboardSearchIntro(),
    }
  )

  navigation.messageId = message.message_id
}

export const postNewPhotoGroup = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  newPhoto: NewPhotoPublish
): Promise<number> => {
  const { nick, emojiGender } = authorize
  const {
    channelTgChatId,
    channelTgMessageId,
    description
  } = newPhoto

  const caption = `${emojiGender} *${nick}*\n` + description

  const message = await ctx.telegram.sendPhoto(
    newPhoto.groupTgChatId,
    newPhoto.tgFileId,
    {
      ...keyboardNewPhotoGroup(channelTgChatId, channelTgMessageId),
      message_thread_id: newPhoto.groupTgThreadId,
      //reply_markup: 'MarkdownV2',
      caption
    }
  )

  return message.message_id
}

export const updatePhotoGroup = async (
  ctx: AppContext,
  authorize: User,
  photo: Photo,
  ratesAgg: RateAgg[]
): Promise<void> => {
  const { nick, emojiGender } = authorize
  const {
    channelTgChatId,
    channelTgMessageId,
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

  const caption = `${emojiGender} *${nick}*\n` +
    `${description}\n` +
    `Оценки: ${ratesView}`

  await ctx.telegram.editMessageCaption(
    photo.groupTgChatId,
    photo.groupTgMessageId,
    undefined,
    caption,
    {
      message_thread_id: photo.groupTgThreadId,
      ...keyboardNewPhotoGroup(channelTgChatId, channelTgMessageId)
    }
  )
}

export const postNewPhotoChannel = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  newPhoto: NewPhotoPublish
): Promise<number> => {
  const { nick, emojiGender } = authorize
  const { topicName, description } = newPhoto

  const caption = `${emojiGender} *${nick}*\n` +
    `Раздел: #${topicName}\n` +
    description

  const message = await ctx.telegram.sendPhoto(
    newPhoto.channelTgChatId,
    newPhoto.tgFileId,
    {
      //reply_markup: 'MarkdownV2',
      caption
    }
  )

  return message.message_id
}
