import { Markup } from 'telegraf'
//import { ReplyKeyboardMarkup, User } from 'telegraf/types'
import {
  AppContext,
  AppWizardSession,
  Register,
  ChangeAvatar,
  ChangeAbout,
  NewPhoto,
  Navigation
} from '../interfaces/app.js'
import { UserGender } from '../interfaces/user.js'
import { USER_NICK_REGEXP, USER_GENDERS } from '../constants/user.js'

export const resetNavigation = (navigation: Navigation) => {
  navigation.messageId = null
  navigation.currentPage = 0
  navigation.totalPages = 0
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
    [Markup.button.callback('Вернуться в меню', 'profile-return-main-menu')]
  ])
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









/*
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
      Markup.button.callback('Просмотр', 'view'),
      Markup.button.callback('Следующее', 'nav-next')
    ],
    [
      Markup.button.callback('Удалить', 'delete')
    ],
    [
      Markup.button.callback('В главное меню', 'return-menu')
    ]
  ])
}
*/
