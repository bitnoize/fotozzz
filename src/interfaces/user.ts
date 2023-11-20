import { USER_GENDERS, USER_STATUSES, USER_ROLES } from '../constants/user.js'

export type UserGender = (typeof USER_GENDERS)[number]
export type UserStatus = (typeof USER_STATUSES)[number]
export type UserRole = (typeof USER_ROLES)[number]

export interface Authorize {
  id: number
  tgId: string
  nick: string | null
  gender: UserGender | null
  status: UserStatus
  role: UserRole
  registerTime: Date
  lastActivityTime: Date
}

export interface Membership {
  checkGroup: boolean | null
  checkChannel: boolean | null
}

export interface Navigation {
  messageId: number | null
  currentPage: number
  totalPages: number
}

export interface User {
  id: number
  tgId: string
  nick: string | null
  gender: UserGender | null
  status: UserStatus
  role: UserRole
  avatarTgFileId: string | null
  about: string | null
  registerTime: Date
  lastActivityTime: Date
  photosTotal: number
  commentsTotal: number
}

export interface Register {
  nick: string
  gender: UserGender
  avatarTgFileId: string
  about: string
}
