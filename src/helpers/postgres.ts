import {
  RowId,
  RowCount,
  RowUser,
  RowUserFull,
  RowTopic,
  RowPhoto,
  RowRate,
  RowRateAgg,
  RowComment
} from '../interfaces/postgres.js'
import { UserGender, User, UserFull } from '../interfaces/user.js'
import { Topic } from '../interfaces/topic.js'
import { Photo } from '../interfaces/photo.js'
import { Rate, RateAgg } from '../interfaces/rate.js'
import { Comment } from '../interfaces/comment.js'
import {
  USER_NICK_UNKNOWN,
  USER_AVATAR_UNKNOWN,
  USER_GENDER_EMOJIS,
  USER_GENDER_EMOJI_UNKNOWN
} from '../constants/user.js'

export const isRowId = (rowId: unknown): rowId is RowId => {
  return (
    rowId != null &&
    typeof rowId === 'object' &&
    'id' in rowId &&
    (typeof rowId.id === 'number' || typeof rowId.id === 'string')
  )
}

export const isRowCount = (rowCount: unknown): rowCount is RowCount => {
  return (
    rowCount != null &&
    typeof rowCount === 'object' &&
    'count' in rowCount &&
    typeof rowCount.count === 'number'
  )
}

export const isRowUser = (rowUser: unknown): rowUser is RowUser => {
  return (
    rowUser != null &&
    typeof rowUser === 'object' &&
    'id' in rowUser &&
    typeof rowUser.id === 'number' &&
    'tg_from_id' in rowUser &&
    typeof rowUser.tg_from_id === 'number' &&
    'nick' in rowUser &&
    (rowUser.nick === null || typeof rowUser.nick === 'string') &&
    'gender' in rowUser &&
    (rowUser.gender === null || typeof rowUser.gender === 'string') &&
    'status' in rowUser &&
    typeof rowUser.status === 'string' &&
    'role' in rowUser &&
    typeof rowUser.role === 'string' &&
    'register_time' in rowUser &&
    typeof rowUser.register_time === 'object' &&
    rowUser.register_time instanceof Date &&
    'last_activity_time' in rowUser &&
    typeof rowUser.last_activity_time === 'object' &&
    rowUser.last_activity_time instanceof Date
  )
}

export const buildUser = (rowUser: RowUser): User => {
  const user: User = {
    id: rowUser.id,
    tgFromId: rowUser.tg_from_id,
    nick: rowUser.nick ?? USER_NICK_UNKNOWN,
    gender: rowUser.gender,
    emojiGender: getEmojiGender(rowUser.gender),
    status: rowUser.status,
    role: rowUser.role,
    registerTime: rowUser.register_time,
    lastActivityTime: rowUser.last_activity_time
  }

  return user
}

export const isRowUserFull = (rowUserFull: unknown): rowUserFull is RowUserFull => {
  return (
    rowUserFull != null &&
    typeof rowUserFull === 'object' &&
    'id' in rowUserFull &&
    typeof rowUserFull.id === 'number' &&
    'tg_from_id' in rowUserFull &&
    typeof rowUserFull.tg_from_id === 'number' &&
    'nick' in rowUserFull &&
    (rowUserFull.nick === null || typeof rowUserFull.nick === 'string') &&
    'gender' in rowUserFull &&
    (rowUserFull.gender === null || typeof rowUserFull.gender === 'string') &&
    'status' in rowUserFull &&
    typeof rowUserFull.status === 'string' &&
    'role' in rowUserFull &&
    typeof rowUserFull.role === 'string' &&
    'avatar_tg_file_id' in rowUserFull &&
    (rowUserFull.avatar_tg_file_id === null ||
      typeof rowUserFull.avatar_tg_file_id === 'string') &&
    'about' in rowUserFull &&
    (rowUserFull.about === null || typeof rowUserFull.about === 'string') &&
    'register_time' in rowUserFull &&
    typeof rowUserFull.register_time === 'object' &&
    rowUserFull.register_time instanceof Date &&
    'last_activity_time' in rowUserFull &&
    typeof rowUserFull.last_activity_time === 'object' &&
    rowUserFull.last_activity_time instanceof Date
  )
}

export const buildUserFull = (
  rowUserFull: RowUserFull,
  rowPhotosCount: RowCount,
  rowCommentsCount: RowCount
): UserFull => {
  const userFull: UserFull = {
    id: rowUserFull.id,
    tgFromId: rowUserFull.tg_from_id,
    nick: rowUserFull.nick ?? USER_NICK_UNKNOWN,
    gender: rowUserFull.gender,
    emojiGender: getEmojiGender(rowUserFull.gender),
    status: rowUserFull.status,
    role: rowUserFull.role,
    avatarTgFileId: rowUserFull.avatar_tg_file_id ?? USER_AVATAR_UNKNOWN,
    about: rowUserFull.about ?? '',
    registerTime: rowUserFull.register_time,
    lastActivityTime: rowUserFull.last_activity_time,
    photosTotal: rowPhotosCount.count,
    commentsTotal: rowCommentsCount.count
  }

  return userFull
}

export const isRowTopic = (rowTopic: unknown): rowTopic is RowTopic => {
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

export const isRowsTopics = (rowsTopics: unknown): rowsTopics is RowTopic[] => {
  return (
    rowsTopics != null &&
    Array.isArray(rowsTopics) &&
    rowsTopics.every((rowTopic) => isRowTopic(rowTopic))
  )
}

export const buildTopics = (rowsTopics: RowTopic[]): Topic[] => {
  return rowsTopics.map((rowTopic) => buildTopic(rowTopic))
}

export const isRowPhoto = (rowPhoto: unknown): rowPhoto is RowPhoto => {
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
    'group_tg_thread_id' in rowPhoto &&
    typeof rowPhoto.group_tg_thread_id === 'number' &&
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
    groupTgThreadId: rowPhoto.group_tg_thread_id,
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

export const isRowsPhotos = (rowsPhotos: unknown): rowsPhotos is RowPhoto[] => {
  return (
    rowsPhotos != null &&
    Array.isArray(rowsPhotos) &&
    rowsPhotos.every((rowPhoto) => isRowPhoto(rowPhoto))
  )
}

export const buildPhotos = (rowsPhotos: RowPhoto[]): Photo[] => {
  return rowsPhotos.map((rowPhoto) => buildPhoto(rowPhoto))
}

export const isRowRate = (rowRate: unknown): rowRate is RowRate => {
  return (
    rowRate != null &&
    typeof rowRate === 'object' &&
    'id' in rowRate &&
    typeof rowRate.id === 'number' &&
    'user_id' in rowRate &&
    typeof rowRate.user_id === 'number' &&
    'topic_id' in rowRate &&
    typeof rowRate.topic_id === 'number' &&
    'photo_id' in rowRate &&
    typeof rowRate.photo_id === 'number' &&
    'value' in rowRate &&
    typeof rowRate.value === 'string' &&
    'create_time' in rowRate &&
    typeof rowRate.create_time === 'object' &&
    rowRate.create_time instanceof Date
  )
}

export const buildRate = (rowRate: RowRate): Rate => {
  const rate: Rate = {
    id: rowRate.id,
    userId: rowRate.user_id,
    topicId: rowRate.topic_id,
    photoId: rowRate.photo_id,
    value: rowRate.value,
    createTime: rowRate.create_time
  }

  return rate
}

export const isRowRateAgg = (rowRateAgg: unknown): rowRateAgg is RowRateAgg => {
  return (
    rowRateAgg != null &&
    typeof rowRateAgg === 'object' &&
    'count' in rowRateAgg &&
    typeof rowRateAgg.count === 'number' &&
    'value' in rowRateAgg &&
    typeof rowRateAgg.value === 'string'
  )
}

export const buildRateAgg = (rowRateAgg: RowRateAgg): RateAgg => {
  const rateAgg: RateAgg = {
    count: rowRateAgg.count,
    value: rowRateAgg.value,
  }

  return rateAgg
}

export const isRowsRatesAgg = (
  rowsRatesAgg: unknown
): rowsRatesAgg is RowRateAgg[] => {
  return (
    rowsRatesAgg != null &&
    Array.isArray(rowsRatesAgg) &&
    rowsRatesAgg.every((rowRateAgg) => isRowRateAgg(rowRateAgg))
  )
}

export const buildRatesAgg = (rowsRatesAgg: RowRateAgg[]): RateAgg[] => {
  return rowsRatesAgg.map((rowRateAgg) => buildRateAgg(rowRateAgg))
}

export const isRowComment = (rowComment: unknown): rowComment is RowComment => {
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
    (rowComment.text == null || typeof rowComment.text === 'string') &&
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
    rowsComments.every((rowComment) => isRowComment(rowComment))
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
