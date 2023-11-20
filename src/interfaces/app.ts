import { Context, Scenes } from 'telegraf'
import { Authorize, Membership, Navigation, Register } from './user.js'
import { NewPhoto } from './photo.js'

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

export interface AppWizardSession extends Scenes.WizardSessionData {
  register?: Partial<Register>
  newPhoto?: Partial<NewPhoto>
}

export interface AppSession extends Scenes.WizardSession<AppWizardSession> {
  authorize?: Authorize
  navigation?: Navigation
  membership?: Membership
}

export interface AppContext extends Context {
  //appContextProp: string
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

export type RouteMainMenuHandler = (
  authorize: Authorize,
  membership: Membership,
  navigation: Navigation
) => Promise<void>
