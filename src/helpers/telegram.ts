import { Markup } from 'telegraf'
import { ReplyKeyboardMarkup, User } from 'telegraf/types'
import { AppContext, AppWizardSession } from '../interfaces/app.js'
import { UserGender, Register } from '../interfaces/user.js'
import { USER_NICK_REGEXP, USER_GENDERS } from '../constants/user.js'
import { GENDER_EMOJIS, GENDER_EMOJI_UNKNOWN } from '../constants/misc.js'

export const getEmojiGender = (gender: UserGender | null): string => {
  let genderEmoji: string | undefined

  if (gender !== null) {
    genderEmoji = GENDER_EMOJIS[gender]

    if (genderEmoji === undefined) {
      throw new Error(`unknown gender '${gender}'`)
    }
  } else {
    genderEmoji = GENDER_EMOJI_UNKNOWN
  }

  return genderEmoji
}

export const isUserGender = (userGender: unknown): userGender is UserGender => {
  return (
    userGender != null &&
    typeof userGender === 'string' &&
    USER_GENDERS.includes(userGender)
  )
}

export const isUserNick = (userNick: unknown): userNick is string => {
  const regExp = /^[a-z0-9_]{4,20}$/i

  return (
    userNick != null &&
    typeof userNick === 'string' &&
    regExp.test(userNick)
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

export const isNewPhoto = (
  newPhoto: Partial<NewPhoto>
): newPhoto is NewPhoto => {
  return (
    newPhoto.tgFileId !== undefined &&
    newPhoto.topicId !== undefined &&
    newPhoto.description !== undefined
  )
}

export const markupKeyboardCheckGroup = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Я уже подписан на группу`, 'main-start'),
  ])
}

export const markupKeyboardCheckChannel = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Я уже подписан на канал`, 'main-start'),
  ])
}

export const markupKeyboardMain = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Профиль', 'main-profile')],
    [Markup.button.callback('Фото', 'main-photo')],
    [Markup.button.callback('Поиск', 'main-search')],
  ])
}

export const markupKeyboardGender = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Мужской`, 'male'),
    Markup.button.callback(`Женский`, 'female'),
    Markup.button.callback(`Пара`, 'couple'),
  ])
}

export const markupKeyboardProfile = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback('Редактировать аватар', 'edit-avatar'),
    Markup.button.callback('Редактировать о себе', 'edit-about'),
    Markup.button.callback('Вернуться в меню', 'return-menu'),
  ])
}

export const markupKeyboardPhoto = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Предыдущее', 'photo-prev'),
      Markup.button.callback('Просмотр', 'photo-view')
      Markup.button.callback('Следующее', 'photo-next'),
    ],
    [
      Markup.button.callback('Удалить', 'photo-delete')
    ],
    [
      Markup.button.callback('В главное меню', 'return-menu')
    ]
  ])
}
