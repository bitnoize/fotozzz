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
  nick: string
  gender: string
  avatar: string
  about: string
}

export interface AppSession extends Scenes.WizardSession<AppWizardSession> {
  user: User
}

export interface AppContext extends Context {
  //appContextProp: string
  session: AppSession
  scene: Scenes.SceneContextScene<AppContext, AppWizardSession>;
  wizard: Scenes.WizardContextWizard<AppContext>
}

export interface Controller {}

