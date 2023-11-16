import { Markup } from 'telegraf'
import { ReplyKeyboardMarkup, User } from 'telegraf/types'
import { AppContext, AppWizardSession } from '../interfaces/app.js'
import { SessionUser, UserGender, Register } from '../interfaces/user.js'
import { USER_GENDERS } from '../constants/user.js'

//
// Wrappers
//

export const getFrom = (ctx: AppContext): User => {
  const from = ctx.from
  if (from === undefined || from['id'] == null) {
    throw new Error(`context from lost`)
  }

  return from
}

export const getChat = (ctx: AppContext) => {
  const chat = ctx.chat
  if (chat === undefined || chat['id'] == null) {
    throw new Error(`context chat lost`)
  }

  return chat
}

export const getSessionUser = (ctx: AppContext): SessionUser => {
  const sessionUser = ctx.session.user
  if (sessionUser === undefined) {
    throw new Error(`context session user lost`)
  }

  return sessionUser
}

export const setSessionUser = (ctx: AppContext, sessionUser: SessionUser) => {
  ctx.session.user = sessionUser
}

export const getSceneSessionRegister = (ctx: AppContext): Partial<Register> => {
  const sceneSessionRegister = ctx.scene.session.register
  if (sceneSessionRegister === undefined) {
    throw new Error(`context scene session register lost`)
  }

  return sceneSessionRegister
}

export const newSceneSessionRegister = (ctx: AppContext) => {
  ctx.scene.session.register = {}
}

//
// Type Guards
//

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

export const isSceneSessionRegister = (
  sceneSessionRegister: Partial<Register>
): sceneSessionRegister is Register => {
  return (
    sceneSessionRegister.nick !== undefined &&
    sceneSessionRegister.gender !== undefined &&
    sceneSessionRegister.avatarTgFileId !== undefined &&
    sceneSessionRegister.about !== undefined
  )
}

//
// Keyboards
//

export const markupKeyboardProfile = () => {
  return Markup.keyboard([
    Markup.button.text(`Показать профиль`),
    Markup.button.text(`В главное меню`),
  ]).resize()
}

export const markupKeyboardSaveMe = () => {
  return Markup.keyboard([
    Markup.button.text(`Окей, давай дальше`)
  ]).resize()
}

export const markupInlineKeyboardGender = () => {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Мужской`, 'male'),
    Markup.button.callback(`Женский`, 'female'),
    Markup.button.callback(`Пара`, 'couple'),
  ])
}

export const markupKeyboardCheckGroup = () => {
  return Markup.keyboard([
    Markup.button.text('Я уже подписан на группу')
  ]).resize()
}

export const markupKeyboardCheckChannel = () => {
  return Markup.keyboard([
    Markup.button.text('Я уже подписан на канал')
  ]).resize()
}
