import { Markup } from 'telegraf'
import { ReplyKeyboardMarkup, User } from 'telegraf/types'
import { AppContext, AppWizardSession } from '../interfaces/app.js'
import { UserGender, Register } from '../interfaces/user.js'
import { USER_NICK_REGEXP, USER_GENDERS } from '../constants/user.js'
import { GENDER_EMOJIS, GENDER_EMOJI_UNKNOWN } from '../constants/misc.js'

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

export const resetNavigation = (navigation: Navigation) => {
  navigation.messageId = null
  navigation.currentPage = 0
  navigation.totalPages = 0
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
    Markup.button.callback('Вернуться в меню', 'back-main'),
  ])
}

export const markupKeyboardPhoto = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Предыдущее', 'nav-prev'),
      Markup.button.callback('Просмотр', 'view')
      Markup.button.callback('Следующее', 'nav-next'),
    ],
    [
      Markup.button.callback('Удалить', 'delete')
    ],
    [
      Markup.button.callback('В главное меню', 'return-menu')
    ]
  ])
}
