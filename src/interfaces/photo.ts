import { PHOTO_STATUSES } from '../constants/photo.js'
import { UserGender, UserStatus, UserRole } from './user.js'
import { TopicStatus } from './topic.js'

export type PhotoStatus = (typeof PHOTO_STATUSES)[number]

export interface Photo {
  id: number
  userId: number
  topicId: number
  groupTgChatId: number
  groupTgThreadId: number
  groupTgMessageId: number
  channelTgChatId: number
  channelTgMessageId: number
  tgFileId: string
  description: string
  status: PhotoStatus
  createTime: Date
}

export interface PhotoFull {
  id: number
  userId: number
  userNick: string
  userGender: UserGender
  userStatus: UserStatus
  userRole: UserRole
  userAvatarTgFileId: string
  topicId: number
  topicName: string
  topicStatus: TopicStatus
  groupTgChatId: number
  groupTgThreadId: number
  groupTgMessageId: number
  channelTgChatId: number
  channelTgMessageId: number
  tgFileId: string
  description: string
  status: PhotoStatus
  createTime: Date
}
