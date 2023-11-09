import { UserGender, UserStatus, UserRole } from './user.js'

export interface PostgresServiceOptions {
  postgresUrl: string
}

export interface PostgresSerial {
  'id': number
}

export interface PostgresUser {
  'id': number
  'tg_id': number
  'nick': string | null
  'gender': UserGender | null
  'status': UserStatus
  'role': UserRole
  'register_date': Date
  'last_activity': Date
}
