import { Markup } from 'telegraf'
//import { ReplyKeyboardMarkup, User } from 'telegraf/types'
import {
  AppContext,
  AppWizardSession,
  Register,
  ChangeAvatar,
  ChangeAbout,
  NewPhoto,
  Membership,
  Navigation
} from '../interfaces/app.js'
import { UserGender, User, UserFull } from '../interfaces/user.js'
import { Topic } from '../interfaces/topic.js'
import { Photo } from '../interfaces/photo.js'
import {
  USER_NICK_REGEXP,
  USER_GENDERS,
  USER_AVATAR_UNKNOWN
} from '../constants/user.js'

export interface PhotoSize {
  file_id: string
}

export const wizardNextStep = (
  ctx: AppContext,
  next: () => Promise<void>
): unknown => {
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

export const sureSceneSessionChangeAvatar = (ctx: AppContext): Partial<ChangeAvatar> => {
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

export const sureSceneSessionChangeAbout = (ctx: AppContext): Partial<ChangeAbout> => {
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

export const initSceneSessionDeletePhoto = (ctx: AppContext, photoId: number) => {
  ctx.scene.session.deletePhoto = photoId
}

export const sureSceneSessionDeletePhoto = (ctx: AppContext): number => {
  const deletePhoto = ctx.scene.session.deletePhoto
  if (deletePhoto === undefined) {
    throw new Error(`context scene session deletePhoto lost`)
  }

  return deletePhoto
}

export const dropSceneSessionDeletePhoto = (ctx: AppContext) => {
  delete ctx.scene.session.deletePhoto
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
  return (
    changeAvatar.avatarTgFileId !== undefined
  )
}

export const isChangeAbout = (
  changeAbout: Partial<ChangeAbout>
): changeAbout is ChangeAbout => {
  return (
    changeAbout.about !== undefined
  )
}

export const isNewPhoto = (
  newPhoto: Partial<NewPhoto>
): newPhoto is NewPhoto => {
  return (
    newPhoto.tgFileId !== undefined &&
    newPhoto.topicId !== undefined &&
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
    Markup.button.callback(`Я уже подписан на канал`, 'main-start'),
  ])
}

export const keyboardMainMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Профиль', 'main-profile')],
    [Markup.button.callback('Фото', 'main-photo')],
    [Markup.button.callback('Поиск', 'main-search')],
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

export const keyboardChangeAvatarMenu = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'change-avatar-back')
  ])
}

export const keyboardChangeAboutMenu = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'change-about-back')
  ])
}

export const keyboardPhotoMenu = (photo: Photo, navigation: Navigation) => {
  const navButtons = []

  if (navigation.currentPage !== 1) {
    navButtons.push(Markup.button.callback('< Предыдущее', 'photo-prev'))
  }

  navButtons.push(Markup.button.callback('Перейти', 'photo-goto'))

  if (navigation.currentPage !== navigation.totalPages) {
    navButtons.push(Markup.button.callback('Следующее >', 'photo-next'))
  }

  return Markup.inlineKeyboard([
    navButtons,
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
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'new-photo-photo-back')
  ])
}

export const keyboardNewPhotoTopics = (topics: Topic[]) => {
  const topicsButtons = topics.map((topic) => {
    return [Markup.button.callback(topic.name, `new-photo-topic-${topic.id}`)]
  })

  return Markup.inlineKeyboard([
    ...topicsButtons,
    [Markup.button.callback('Отмена', 'new-photo-topic-back')]
  ])
}

export const keyboardNewPhotoConfirm = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Отмена', 'new-photo-confirm-back'),
    Markup.button.callback('Продолжить', 'new-photo-confirm-next')
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
  removeLastMessage(ctx, navigation)

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
  removeLastMessage(ctx, navigation)

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
  removeLastMessage(ctx, navigation)

  const { nick, emojiGender } = authorize

  const message = await ctx.replyWithMarkdownV2(
    `Бот приветствует тебя, ${emojiGender} *${nick}*\n`,
    keyboardMainMenu()
  )

  navigation.messageId = message.message_id
}

export const replyMainError = async (ctx: AppContext): Promise<void> => {
  await ctx.replyWithMarkdownV2(
    `Произошла непредвиденная ошибка, возврат в главное меню`,
  )
}

export const replyRegisterNick = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Выбери ник`
  )

  navigation.messageId = message.message_id
}

export const replyRegisterNickUsed = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  removeLastMessage(ctx, navigation)

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
  removeLastMessage(ctx, navigation)

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
  removeLastMessage(ctx, navigation)

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
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Загрузи аватар`
  )

  navigation.messageId = message.message_id
}

export const replyRegisterAbout = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Расскажи о себе`
  )

  navigation.messageId = message.message_id
}

export const replyRegisterAboutWrong = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Некорректный ввод, попробуй еще раз`
  )

  navigation.messageId = message.message_id
}

export const replyProfileMenu = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  userFull: UserFull,
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const extra = keyboardProfileMenu()

  const { emojiGender, nick, about } = userFull
  extra.caption = `${emojiGender} ${nick}\nО себе: ${about}`

  const message = await ctx.sendPhoto(userFull.avatarTgFileId, extra)

  navigation.messageId = message.message_id
}

export const replyChangeAvatarMenu = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Загрузи новый аватар`,
    keyboardChangeAvatarMenu()
  )

  navigation.messageId = message.message_id
}

export const replyChangeAboutMenu = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Расскажи о себе`,
    keyboardChangeAboutMenu()
  )

  navigation.messageId = message.message_id
}

export const replyChangeAboutWrong = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Некорректный ввод, попробуй еще раз`,
    keyboardChangeAboutMenu()
  )

  navigation.messageId = message.message_id
}

export const replyPhotoMenu = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
  photos: Photo[]
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  if (photos.length > 0) {
    navigation.totalPages = photos.length

    if (navigation.currentPage < 1) {
      navigation.currentPage = 1
    } else if (navigation.currentPage > navigation.totalPages) {
      navigation.currentPage = navigation.totalPages
    }

    const navigationIndex = navigation.currentPage - 1

    const photo = photos[navigation.currentPage - 1]
    if (photo === undefined) {
      throw new Error(`can't get user photo by index`)
    }

    const extra = keyboardPhotoMenu(photo, navigation)

    extra.caption = photo.description

    if (navigation.updatable) {
      await ctx.editMessageMedia(
        {
          type: 'photo',
          media: photo.tgFileId,
        },
        extra
      )
    } else {
      navigation.updatable = true

      const message = await ctx.sendPhoto(photo.tgFileId, extra)

      navigation.messageId = message.message_id
    }
  } else {
    const message = await ctx.replyWithMarkdownV2(
      `У вас нет опубликованных фото\n` +
      `Отправьте мне фото для публикации\n` +
      `Вы можете загрузить 3 фото в течении 24 часов`,
      keyboardPhotoBlank()
    )

    console.dir(keyboardPhotoBlank())

    navigation.messageId = message.message_id

    resetNavigation(navigation)
  }
}

export const replyNewPhotoPhoto = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Загрузи фотограйию`,
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
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Выбери раздел`,
    keyboardNewPhotoTopics(topics)
  )

  navigation.messageId = message.message_id
}

export const replyNewPhotoConfirm = async (
  ctx: AppContext,
  authorize: User,
  navigation: Navigation,
): Promise<void> => {
  removeLastMessage(ctx, navigation)

  const message = await ctx.replyWithMarkdownV2(
    `Опубликовать фото?`,
    keyboardNewPhotoConfirm()
  )

  navigation.messageId = message.message_id
}













export const keyboardChangeAvatarConfirm = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Вернуться', 'change-avatar-confirm-back'),
    Markup.button.callback('Продолжить', 'change-avatar-confirm-next')
  ])
}

export const keyboardChangeAboutConfirm = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Вернуться', 'change-about-confirm-back'),
    Markup.button.callback('Продолжить', 'change-about-confirm-next')
  ])
}


