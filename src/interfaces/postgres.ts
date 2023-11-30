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

export interface RowUser {
  id: number
  tg_from_id: number
  nick: string | null
  gender: UserGender | null
  status: UserStatus
  role: UserRole
  register_time: Date
  last_activity_time: Date
  isGroupMember: boolean
  isChannelMember: boolean
}

export interface RowUserFull {
  id: number
  tg_from_id: number
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
  tg_chat_id: number
  tg_thread_id: number
  name: string
  status: TopicStatus
  description: string
  create_time: Date
}

export interface RowPhoto {
  id: number
  user_id: number
  topic_id: number
  group_tg_chat_id: number
  group_tg_thread_id: number
  group_tg_message_id: number
  channel_tg_chat_id: number
  channel_tg_message_id: number
  tg_file_id: string
  description: string
  status: PhotoStatus
  create_time: Date
}

export interface RowRate {
  id: number
  user_id: number
  topic_id: number
  photo_id: number
  value: RateValue
  create_time: Date
}

export interface RowRateAgg {
  count: number
  value: string
}

export interface RowComment {
  id: number
  user_id: number
  topic_id: number
  photo_id: number
  channel_tg_chat_id: number
  channel_tg_message_id: number
  status: CommentStatus
  text: string | null
  create_time: Date
}
