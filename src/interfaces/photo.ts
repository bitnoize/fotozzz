import { PHOTO_STATUSES } from '../constants/photo.js'

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
