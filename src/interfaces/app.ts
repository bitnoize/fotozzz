import { Context, Scenes } from 'telegraf'
import { Authorize } from './user.js'

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

export interface Controller {
  scene: Scenes.BaseScene<AppContext> | Scenes.WizardScene<AppContext>
}

export interface Register {
  nick: string
  gender: UserGender
  avatarTgFileId: string
  about: string
}

export interface NewPhoto {
  tgFileId: string
  topicId: number
  description: string
}

export interface AppWizardSession extends Scenes.WizardSessionData {
  register?: Partial<Register>
  newPhoto?: Partial<NewPhoto>
}

export interface Navigation {
  messageId: number | null
  currentPage: number
  totalPages: number
}

export interface Membership {
  checkGroup: boolean | null
  checkChannel: boolean | null
}

export interface AppSession extends Scenes.WizardSession<AppWizardSession> {
  authorize?: Authorize
  navigation?: NavigationMenu | NavigationSlider
  membership?: Membership
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

export type PrepareMenuHandler = (
  authorize: Authorize,
  membership: Membership,
  navigation: Navigation
) => Promise<void>
