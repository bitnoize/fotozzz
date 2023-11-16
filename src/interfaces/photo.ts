import { PHOTO_STATUSES } from '../constants/photo.js'

export type PhotoStatus = (typeof PHOTO_STATUSES)[number]

export interface Photo {
  id: number
  userId: number
  topicId: number
  tgId: string
  tgFileId: string
  status: PhotoStatus
  createTime: Date
}
