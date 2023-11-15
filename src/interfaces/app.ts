import { Context, Scenes } from 'telegraf'
import { SessionUser, Register } from './user.js'

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
}

export interface AppSession extends Scenes.WizardSession<AppWizardSession> {
  user?: SessionUser
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
