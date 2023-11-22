import { USER_GENDERS, USER_STATUSES, USER_ROLES } from '../constants/user.js'

export type UserGender = (typeof USER_GENDERS)[number]
export type UserStatus = (typeof USER_STATUSES)[number]
export type UserRole = (typeof USER_ROLES)[number]

export interface User {
  id: number
  tgFromId: number
  nick: string
  gender: UserGender | null
  emojiGender: string
  status: UserStatus
  role: UserRole
  registerTime: Date
  lastActivityTime: Date
}

export interface UserFull {
  id: number
  tgFromId: number
  nick: string
  gender: UserGender | null
  emojiGender: string
  status: UserStatus
  role: UserRole
  avatarTgFileId: string
  about: string
  registerTime: Date
  lastActivityTime: Date
  photosTotal: number
  commentsTotal: number
}
