import { COMMENT_STATUSES } from '../constants/comment.js'

export type CommentStatus = (typeof COMMENT_STATUSES)[number]

export interface Comment {
  id: number
  userId: number
  topicId: number
  photoId: number
  channelTgChatId: number
  channelTgMessageId: number
  status: CommentStatus
  text: string | null
  createTime: Date
}
