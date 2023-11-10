import { Context, Scenes } from 'telegraf'
import { User } from './user.js'

export interface AppOptions {
  botToken: string
  useProxy: boolean
  proxyUrl: string
  redisUrl: string
  groupChatId: number
}

export interface AppWizardSession extends Scenes.WizardSessionData {
  userNick?: string
  userGender?: string
  userAvatar?: string
  userAbout?: string
}

export interface AppSession extends Scenes.WizardSession<AppWizardSession> {
  user?: User
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
) => Promise<void>

export interface Controller {}
