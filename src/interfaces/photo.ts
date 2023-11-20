import { PHOTO_STATUSES } from '../constants/photo.js'

export type PhotoStatus = (typeof PHOTO_STATUSES)[number]

export interface Photo {
  id: number
  userId: number
  topicId: number
  groupTgId: string
  channelTgId: string
  tgFileId: string
  description: string
  status: PhotoStatus
  createTime: Date
}

export interface NewPhoto {
  tgFileId: string
  topicId: number
  description: string
}
