import { UserGender } from '../interfaces/user.js'

export interface Navigation {
  messageId: number | null
  updatable: boolean
  currentPage: number
  totalPages: number
}

export interface Membership {
  checkGroup: boolean | null
  checkChannel: boolean | null
}

export interface Register {
  nick: string
  gender: UserGender
  avatarTgFileId: string
  about: string
}

export interface ChangeAvatar {
  avatarTgFileId: string
}

export interface ChangeAbout {
  about: string
}

export interface NewPhoto {
  tgFileId: string
  topicId: number
  topicName: string
  description: string
  groupTgChatId: number
  groupTgThreadId: number
  groupTgMessageId: number | null
  channelTgChatId: number
  channelTgMessageId: number | null
}

export interface DeletePhoto {
  photoId: number
}

export interface ShowUser {
  userId: number
}

export interface ChatJoinRequest {
  chatId: number
  fromId: number
}

export interface RatePhotoRequest {
  groupTgChatId: number
  groupTgThreadId: number
  groupTgMessageId: number
}

export interface CommentPhotoRequest {
  channelTgChatId: number
  channelTgMessageId: number
  text: string | null
}

export interface PhotoSize {
  file_id: string
}
