import { Context, Scenes } from 'telegraf'
import {
  Membership,
  Navigation,
  Register,
  ChangeAvatar,
  ChangeAbout,
  NewPhoto,
  DeletePhoto,
  Search,
} from './telegram.js'
import { User } from './user.js'

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

export interface AppWizardSession extends Scenes.WizardSessionData {
  register?: Partial<Register>
  changeAvatar?: Partial<ChangeAvatar>
  changeAbout?: Partial<ChangeAbout>
  newPhoto?: Partial<NewPhoto>
  deletePhoto?: DeletePhoto
  search?: Search
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
  ctx: AppContext
) => Promise<unknown | void>

export type AppBaseScene = Scenes.BaseScene<AppContext>
export type AppWizardScene = Scenes.WizardScene<AppContext>

export interface Controller {
  scene: AppBaseScene | AppWizardScene
}
