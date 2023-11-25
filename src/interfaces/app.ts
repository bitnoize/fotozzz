import { Context, Scenes } from 'telegraf'
import { UserGender, User } from './user.js'

export interface AppOptions {
  botToken: string
  useProxy: boolean
  proxyUrl: string
  redisUrl: string
  groupChatId: number
  groupUrl: string
  channelChatId: number
  channelUrl: string
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

export interface NewPhotoPublish {
  tgFileId: string
  topicId: number
  topicName: string
  description: string
  groupTgChatId: number
  groupTgThreadId: number
  channelTgChatId: number
}

export interface NewPhoto extends NewPhotoPublish {
  groupTgMessageId: number
  channelTgMessageId: number
}

export interface AppWizardSession extends Scenes.WizardSessionData {
  register?: Partial<Register>
  changeAvatar?: Partial<ChangeAvatar>
  changeAbout?: Partial<ChangeAbout>
  newPhoto?: Partial<NewPhoto>
  deletePhoto?: number
}

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

export interface AppSession extends Scenes.WizardSession<AppWizardSession> {
  authorize?: User
  membership?: Membership
  navigation?: Navigation
}

export interface AppContext extends Context {
  session: AppSession
  scene: Scenes.SceneContextScene<AppContext, AppWizardSession>
  wizard: Scenes.WizardContextWizard<AppContext>
}

export type AppContextHandler = (
  ctx: AppContext,
  next: () => Promise<void>
) => Promise<unknown | void>

export type AppContextExceptionHandler = (
  error: unknown,
  ctx: AppContext,
) => Promise<unknown | void>

export type PrepareMainHandler = (
  authorize: User,
  navigation: Navigation
) => Promise<void>

export interface Controller {
  scene: Scenes.BaseScene<AppContext> | Scenes.WizardScene<AppContext>
}
