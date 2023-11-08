import { UserGender, UserStatus, UserRole } from './users.js'

export interface PostgresOptions {
  postgresUrl: string
}

export interface PostgresSerial {
  'id': number
}

export interface PostgresUser {
  'id': number
  'ig_id': number
  'nick': string | null
  'gender': UserGender | null
  'status': UserStatus
  'role': UserRole
  'register_date': Date
  'last_activity': Date
}
