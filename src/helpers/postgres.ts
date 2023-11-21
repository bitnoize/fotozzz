import {
  RowId,
  RowCount,
  RowAuthorize,
  RowUser,
  RowTopic,
  RowPhoto,
  RowRate,
  RowComment
} from '../interfaces/postgres.js'
import { Authorize, User } from '../interfaces/user.js'
import { Topic } from '../interfaces/topic.js'
import { Photo } from '../interfaces/photo.js'
import { Rate } from '../interfaces/rate.js'
import { Comment } from '../interfaces/comment.js'
import {
  USER_NICK_UNKNOWN,
  USER_AVATAR_UNKNOWN,
  USER_GENDER_EMOJIS,
  USER_GENDER_EMOJI_UNKNOWN
} from '../constants/user.js'

export const isRowId = (
  rowId: unknown
): rowId is RowId => {
  return (
    rowId != null &&
    typeof rowId === 'object' &&
    'id' in rowId &&
    (typeof rowId.id === 'number' ||
      typeof rowId.id === 'string')
  )
}

export const isRowCount = (
  rowCount: unknown
): rowCount is RowCount => {
  return (
    rowCount != null &&
    typeof rowCount === 'object' &&
    'count' in rowCount &&
    typeof rowCount.count === 'number'
  )
}

export const isRowAuthorize = (
  rowAuthorize: unknown
): rowAuthorize is RowAuthorize => {
  return (
    rowAuthorize != null &&
    typeof rowAuthorize === 'object' &&
    'id' in rowAuthorize &&
    typeof rowAuthorize.id === 'number' &&
    'tg_from_id' in rowAuthorize &&
    typeof rowAuthorize.tg_from_id === 'number' &&
    'nick' in rowAuthorize &&
    (rowAuthorize.nick === null ||
      typeof rowAuthorize.nick === 'string') &&
    'gender' in rowAuthorize &&
    (rowAuthorize.gender === null ||
      typeof rowAuthorize.gender === 'string') &&
    'status' in rowAuthorize &&
    typeof rowAuthorize.status === 'string' &&
    'role' in rowAuthorize &&
    typeof rowAuthorize.role === 'string' &&
    'register_time' in rowAuthorize &&
    typeof rowAuthorize.register_time === 'object' &&
    rowAuthorize.register_time instanceof Date &&
    'last_activity_time' in rowAuthorize &&
    typeof rowAuthorize.last_activity_time === 'object' &&
    rowAuthorize.last_activity_time instanceof Date
  )
}

export const buildAuthorize = (rowAuthorize: RowAuthorize): Authorize => {
  const authorize: Authorize = {
    id: rowAuthorize.id,
    tgFromId: rowAuthorize.tg_from_id,
    nick: rowAuthorize.nick ?? USER_NICK_UNKNOWN,
    gender: rowAuthorize.gender,
    emojiGender: getEmojiGender(rowAuthorize.gender),
    status: rowAuthorize.status,
    role: rowAuthorize.role,
    registerTime: rowAuthorize.register_time,
    lastActivityTime: rowAuthorize.last_activity_time
  }

  return authorize
}

export const isRowUser = (
  rowUser: unknown
): rowUser is RowUser => {
  return (
    rowUser != null &&
    typeof rowUser === 'object' &&
    'id' in rowUser &&
    typeof rowUser.id === 'number' &&
    'tg_from_id' in rowUser &&
    typeof rowUser.tg_from_id === 'number' &&
    'nick' in rowUser &&
    (rowUser.nick === null ||
      typeof rowUser.nick === 'string') &&
    'gender' in rowUser &&
    (rowUser.gender === null ||
      typeof rowUser.gender === 'string') &&
    'status' in rowUser &&
    typeof rowUser.status === 'string' &&
    'role' in rowUser &&
    typeof rowUser.role === 'string' &&
    'avatar_tg_file_id' in rowUser &&
    (rowUser.avatar_tg_file_id === null ||
      typeof rowUser.avatar_tg_file_id === 'string') &&
    'about' in rowUser &&
    (rowUser.about === null ||
      typeof rowUser.about === 'string') &&
    'register_time' in rowUser &&
    typeof rowUser.register_time === 'object' &&
    rowUser.register_time instanceof Date &&
    'last_activity_time' in rowUser &&
    typeof rowUser.last_activity_time === 'object' &&
    rowUser.last_activity_time instanceof Date
  )
}

export const buildUser = (
  rowUser: RowUser,
  rowPhotosCount: RowCount,
  rowCommentsCount: RowCount
): User => {
  const user: User = {
    id: rowUser.id,
    tgFromId: rowUser.tg_from_id,
    nick: rowUser.nick ?? USER_NICK_UNKNOWN,
    gender: rowUser.gender,
    emojiGender: getEmojiGender(rowAuthorize.gender),
    status: rowUser.status,
    role: rowUser.role,
    avatarTgFileId: rowUser.avatar_tg_file_id ?? USER_AVATAR_UNKNOWN,
    about: rowUser.about ?? '',
    registerTime: rowUser.register_time,
    lastActivityTime: rowUser.last_activity_time,
    photosTotal: rowPhotosCount.count,
    commentsTotal: rowCommentsCount.count,
  }

  return user
}

export const isRowTopic = (
  rowTopic: unknown
): rowTopic is RowTopic => {
  return (
    rowTopic != null &&
    typeof rowTopic === 'object' &&
    'id' in rowTopic &&
    typeof rowTopic.id === 'number' &&
    'tg_chat_id' in rowTopic &&
    typeof rowTopic.tg_chat_id === 'number' &&
    'tg_thread_id' in rowTopic &&
    typeof rowTopic.tg_thread_id === 'number' &&
    'name' in rowTopic &&
    typeof rowTopic.name === 'string' &&
    'status' in rowTopic &&
    typeof rowTopic.status === 'string' &&
    'description' in rowTopic &&
    typeof rowTopic.description === 'string' &&
    'create_time' in rowTopic &&
    typeof rowTopic.create_time === 'object' &&
    rowTopic.create_time instanceof Date
  )
}

export const buildTopic = (rowTopic: RowTopic): Topic => {
  const topic: Topic = {
    id: rowTopic.id,
    tgChatId: rowTopic.tg_chat_id,
    tgThreadId: rowTopic.tg_thread_id,
    name: rowTopic.name,
    status: rowTopic.status,
    description: rowTopic.description,
    createTime: rowTopic.create_time
  }

  return topic
}

export const isRowsTopics = (
  rowsTopics: unknown
): rowsTopics is RowTopic[] => {
  return (
    rowsTopics != null &&
    Array.isArray(rowsTopics) &&
    rowsTopics.some((rowTopic) => isRowTopic(rowTopic))
  )
}

export const buildTopics = (rowsTopics: RowTopic[]): Topic[] => {
  return rowsTopics.map((rowTopic) => buildTopic(rowTopic))
}

export const isRowPhoto = (
  rowPhoto: unknown
): rowPhoto is RowPhoto => {
  return (
    rowPhoto != null &&
    typeof rowPhoto === 'object' &&
    'id' in rowPhoto &&
    typeof rowPhoto.id === 'number' &&
    'user_id' in rowPhoto &&
    typeof rowPhoto.user_id === 'number' &&
    'topic_id' in rowPhoto &&
    typeof rowPhoto.topic_id === 'number' &&
    'group_tg_chat_id' in rowPhoto &&
    typeof rowPhoto.group_tg_chat_id === 'number' &&
    'group_tg_message_id' in rowPhoto &&
    typeof rowPhoto.group_tg_message_id === 'number' &&
    'channel_tg_chat_id' in rowPhoto &&
    typeof rowPhoto.channel_tg_chat_id === 'number' &&
    'channel_tg_message_id' in rowPhoto &&
    typeof rowPhoto.channel_tg_message_id === 'number' &&
    'tg_file_id' in rowPhoto &&
    typeof rowPhoto.tg_file_id === 'string' &&
    'description' in rowPhoto &&
    typeof rowPhoto.description === 'string' &&
    'status' in rowPhoto &&
    typeof rowPhoto.status === 'string' &&
    'create_time' in rowPhoto &&
    typeof rowPhoto.create_time === 'object' &&
    rowPhoto.create_time instanceof Date
  )
}

export const buildPhoto = (rowPhoto: RowPhoto): Photo => {
  const photo: Photo = {
    id: rowPhoto.id,
    userId: rowPhoto.user_id,
    topicId: rowPhoto.topic_id,
    groupTgChatId: rowPhoto.group_tg_chat_id,
    groupTgMessageId: rowPhoto.group_tg_message_id,
    channelTgChatId: rowPhoto.channel_tg_chat_id,
    channelTgMessageId: rowPhoto.channel_tg_message_id,
    tgFileId: rowPhoto.tg_file_id,
    description: rowPhoto.description,
    status: rowPhoto.status,
    createTime: rowPhoto.create_time
  }

  return photo
}

export const isRowsPhotos = (
  rowsPhotos: unknown
): rowsPhotos is RowPhoto[] => {
  return (
    rowsPhotos != null &&
    Array.isArray(rowsPhotos) &&
    rowsPhotos.some((rowPhoto) => isRowPhoto(rowPhoto))
  )
}

export const buildPhotos = (rowsPhotos: RowPhoto[]): Photo[] => {
  return rowsPhotos.map((rowPhoto) => buildPhoto(rowPhoto))
}

export const isRowComment = (
  rowComment: unknown
): rowComment is RowComment => {
  return (
    rowComment != null &&
    typeof rowComment === 'object' &&
    'id' in rowComment &&
    typeof rowComment.id === 'number' &&
    'user_id' in rowComment &&
    typeof rowComment.user_id === 'number' &&
    'topic_id' in rowComment &&
    typeof rowComment.topic_id === 'number' &&
    'photo_id' in rowComment &&
    typeof rowComment.photo_id === 'number' &&
    'channel_tg_chat_id' in rowComment &&
    typeof rowComment.channel_tg_chat_id === 'number' &&
    'channel_tg_message_id' in rowComment &&
    typeof rowComment.channel_tg_message_id === 'number' &&
    'status' in rowComment &&
    typeof rowComment.status === 'string' &&
    'text' in rowComment &&
    typeof rowComment.text === 'string' &&
    'create_time' in rowComment &&
    typeof rowComment.create_time === 'object' &&
    rowComment.create_time instanceof Date
  )
}

export const buildComment = (rowComment: RowComment): Comment => {
  const comment: Comment = {
    id: rowComment.id,
    userId: rowComment.user_id,
    topicId: rowComment.topic_id,
    photoId: rowComment.photo_id,
    channelTgChatId: rowComment.channel_tg_chat_id,
    channelTgMessageId: rowComment.channel_tg_message_id,
    status: rowComment.status,
    text: rowComment.text,
    createTime: rowComment.create_time
  }

  return comment
}

export const isRowsComments = (
  rowsComments: unknown
): rowsComments is RowComment[] => {
  return (
    rowsComments != null &&
    Array.isArray(rowsComments) &&
    rowsComments.some((rowComment) => isRowComment(rowComment))
  )
}

export const buildComments = (rowsComments: RowComment[]): Comment[] => {
  return rowsComments.map((rowComment) => buildComment(rowComment))
}

export const getEmojiGender = (gender: UserGender | null): string => {
  let genderEmoji: string | undefined

  if (gender !== null) {
    genderEmoji = USER_GENDER_EMOJIS[gender]

    if (genderEmoji === undefined) {
      throw new Error(`unknown emoji gender '${gender}'`)
    }
  } else {
    genderEmoji = USER_GENDER_EMOJI_UNKNOWN
  }

  return genderEmoji
}
