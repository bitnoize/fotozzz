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
