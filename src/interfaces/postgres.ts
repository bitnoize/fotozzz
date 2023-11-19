import { UserGender, UserStatus, UserRole } from './user.js'
import { TopicStatus } from './topic.js'
import { PhotoStatus } from './photo.js'
import { RateValue } from './rate.js'
import { CommentStatus } from './comment.js'

export interface PostgresServiceOptions {
  postgresUrl: string
}

export interface RowId {
  id: number
}

export interface RowCount {
  count: number
}

export interface RowSessionUser {
  id: number
  tg_id: string
  nick: string | null
  gender: UserGender | null
  status: UserStatus
  role: UserRole
  register_time: Date
  last_activity_time: Date
  isGroupMember: boolean
  isChannelMember: boolean
}

export interface RowUser {
  id: number
  tg_id: string
  nick: string | null
  gender: UserGender | null
  status: UserStatus
  role: UserRole
  avatar_tg_file_id: string | null
  about: string | null
  register_time: Date
  last_activity_time: Date
}

export interface RowTopic {
  id: number
  tg_id: string
  name: string
  status: TopicStatus
  description: string
  create_time: Date
}

export interface RowPhoto {
  id: number
  user_id: number
  topic_id: number
  tg_id: string
  tg_file_id: string
  status: PhotoStatus
  create_time: Date
}

export interface RowRate {
  id: number
  user_id: number
  topic_id: number
  photo_id: number
  tg_id: string
  value: RateValue
  create_time: Date
}

export interface RowComment {
  id: number
  user_id: number
  topic_id: number
  photo_id: number
  tg_id: string
  status: CommentStatus
  text: string
  create_time: Date
}
