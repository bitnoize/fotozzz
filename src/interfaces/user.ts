import { USER_GENDERS, USER_STATUSES, USER_ROLES } from '../constants.js'

export type UserGender = (typeof USER_GENDERS)[number]
export type UserStatus = (typeof USER_STATUSES)[number]
export type UserRole = (typeof USER_ROLES)[number]

export interface User {
  id: number
  tgId: number
  nick: string | null
  gender: UserGender | null
  status: UserStatus
  role: UserRole
  registerDate: Date
  lastActivity: Date
}
