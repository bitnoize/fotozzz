import { PostgresSerial, PostgresUser } from './interfaces/postgres.js'
import { UserGender } from './interfaces/user.js'
import {
  USER_GENDERS,
  USER_STATUSES,
  USER_ROLES
} from './constants.js'

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

export const isPostgresSerial = (
  postgresSerial: unknown
): postgresSerial is PostgresSerial => {
  return (
    postgresSerial != null &&
    typeof postgresSerial === 'object' &&
    'id' in postgresSerial &&
    typeof postgresSerial['id'] === 'number' &&
    postgresSerial['id'] > 0
  )
}

export const isPostgresUser = (
  postgresUser: unknown
): postgresUser is PostgresUser => {
  return (
    postgresUser != null &&
    typeof postgresUser === 'object' &&
    'id' in postgresUser &&
    typeof postgresUser['id'] === 'number' &&
    postgresUser['id'] > 0 &&
    'tg_id' in postgresUser &&
    typeof postgresUser['tg_id'] === 'string' &&
    'nick' in postgresUser &&
    (postgresUser['nick'] === null ||
      typeof postgresUser['nick'] === 'string') &&
    'gender' in postgresUser &&
    (postgresUser['gender'] === null ||
      (typeof postgresUser['gender'] === 'string' &&
        USER_GENDERS.includes(postgresUser['gender']))) &&
    'status' in postgresUser &&
    typeof postgresUser['status'] === 'string' &&
    USER_STATUSES.includes(postgresUser['status']) &&
    'role' in postgresUser &&
    typeof postgresUser['role'] === 'string' &&
    USER_ROLES.includes(postgresUser['role']) &&
    'register_date' in postgresUser &&
    typeof postgresUser['register_date'] === 'object' &&
    postgresUser['register_date'] instanceof Date &&
    'last_activity' in postgresUser &&
    typeof postgresUser['last_activity'] === 'object' &&
    postgresUser['last_activity'] instanceof Date
  )
}
