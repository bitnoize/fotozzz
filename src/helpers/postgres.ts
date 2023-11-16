import {
  RowId,
  RowSessionUser,
  RowUser,
  RowPhoto
} from '../interfaces/postgres.js'
import { SessionUser, User } from '../interfaces/user.js'
import { Photo } from '../interfaces/photo.js'

//
// Type Guards
//

export const isRowId = (
  rowId: unknown
): rowId is RowId => {
  return (
    rowId != null &&
    typeof rowId === 'object' &&
    'id' in rowId &&
    (typeof rowId['id'] === 'number' ||
      typeof rowId['id'] === 'string')
  )
}

export const isRowSessionUser = (
  rowSessionUser: unknown
): rowSessionUser is RowSessionUser => {
  return (
    rowSessionUser != null &&
    typeof rowSessionUser === 'object' &&
    'id' in rowSessionUser &&
    typeof rowSessionUser['id'] === 'number' &&
    'tg_id' in rowSessionUser &&
    typeof rowSessionUser['tg_id'] === 'string' &&
    'nick' in rowSessionUser &&
    (rowSessionUser['nick'] === null ||
      typeof rowSessionUser['nick'] === 'string') &&
    'gender' in rowSessionUser &&
    (rowSessionUser['gender'] === null ||
      typeof rowSessionUser['gender'] === 'string') &&
    'status' in rowSessionUser &&
    typeof rowSessionUser['status'] === 'string' &&
    'role' in rowSessionUser &&
    typeof rowSessionUser['role'] === 'string' &&
    'register_time' in rowSessionUser &&
    typeof rowSessionUser['register_time'] === 'object' &&
    rowSessionUser['register_time'] instanceof Date &&
    'last_activity_time' in rowSessionUser &&
    typeof rowSessionUser['last_activity_time'] === 'object' &&
    rowSessionUser['last_activity_time'] instanceof Date
  )
}

export const isRowUser = (
  rowUser: unknown
): rowUser is RowUser => {
  return (
    rowUser != null &&
    typeof rowUser === 'object' &&
    'id' in rowUser &&
    typeof rowUser['id'] === 'number' &&
    rowUser['id'] > 0 &&
    'tg_id' in rowUser &&
    typeof rowUser['tg_id'] === 'string' &&
    'nick' in rowUser &&
    (rowUser['nick'] === null ||
      typeof rowUser['nick'] === 'string') &&
    'gender' in rowUser &&
    (rowUser['gender'] === null ||
      typeof rowUser['gender'] === 'string') &&
    'status' in rowUser &&
    typeof rowUser['status'] === 'string' &&
    'role' in rowUser &&
    typeof rowUser['role'] === 'string' &&
    'avatar_tg_file_id' in rowUser &&
    (rowUser['avatar_tg_file_id'] === null ||
      typeof rowUser['avatar_tg_file_id'] === 'string') &&
    'about' in rowUser &&
    (rowUser['about'] === null ||
      typeof rowUser['about'] === 'string') &&
    'register_time' in rowUser &&
    typeof rowUser['register_time'] === 'object' &&
    rowUser['register_time'] instanceof Date &&
    'last_activity_time' in rowUser &&
    typeof rowUser['last_activity_time'] === 'object' &&
    rowUser['last_activity_time'] instanceof Date
  )
}

export const isRowPhoto = (
  rowPhoto: unknown
): rowPhoto is RowPhoto => {
  return (
    rowPhoto != null &&
    typeof rowPhoto === 'object' &&
    'id' in rowPhoto &&
    typeof rowPhoto['id'] === 'number' &&
    'user_id' in rowPhoto &&
    typeof rowPhoto['user_id'] === 'number' &&
    'topic_id' in rowPhoto &&
    typeof rowPhoto['topic_id'] === 'number' &&
    'tg_id' in rowPhoto &&
    typeof rowPhoto['tg_id'] === 'string' &&
    'tg_file_id' in rowPhoto &&
    typeof rowPhoto['tg_file_id'] === 'string' &&
    'status' in rowPhoto &&
    typeof rowPhoto['status'] === 'string' &&
    'create_time' in rowPhoto &&
    typeof rowPhoto['create_time'] === 'object' &&
    rowPhoto['create_time'] instanceof Date
  )
}

//
// Builders
//

export const buildSessionUser = (rowSessionUser: RowSessionUser): SessionUser => {
  const sessionUser: SessionUser = {
    id: rowSessionUser['id'],
    tgId: rowSessionUser['tg_id'],
    nick: rowSessionUser['nick'],
    gender: rowSessionUser['gender'],
    status: rowSessionUser['status'],
    role: rowSessionUser['role'],
    registerTime: rowSessionUser['register_time'],
    lastActivityTime: rowSessionUser['last_activity_time'],
    isGroupMember: false,
    isChannelMember: false
  }

  return sessionUser
}

export const buildUser = (rowUser: RowUser): User => {
  const user: User = {
    id: rowUser['id'],
    tgId: rowUser['tg_id'],
    nick: rowUser['nick'],
    gender: rowUser['gender'],
    status: rowUser['status'],
    role: rowUser['role'],
    avatarTgFileId: rowUser['avatar_tg_file_id'],
    about: rowUser['about'],
    registerTime: rowUser['register_time'],
    lastActivityTime: rowUser['last_activity_time']
  }

  return user
}

export const buildPhoto = (rowPhoto: RowPhoto): Photo => {
  const photo: Photo = {
    id: rowPhoto['id'],
    userId: rowPhoto['user_id'],
    topicId: rowPhoto['topic_id'],
    tgId: rowPhoto['tg_id'],
    tgFileId: rowPhoto['tg_file_id'],
    status: rowPhoto['status'],
    createTime: rowPhoto['create_time']
  }

  return photo
}
