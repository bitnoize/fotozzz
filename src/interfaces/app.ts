import { Context, Scenes } from 'telegraf'
import { User } from './user.ts'

export interface AppOptions {
  botToken: string
  useProxy: boolean
  proxyUrl: string
  redisUrl: string
}

export interface Controller {
  scene: Scenes.BaseScene | Scenes.WizardScene
}

export interface RegisterWizardSession extends Scenes.WizardSessionData {
  registerNick: string
  registerAbout: string
}

export interface AppSession extends Scenes.WizardSession<RegisterWizardSession> {
  user: User
}

export interface AppContext extends Context {
  //appContextProp: string
  session: AppSession
  scene: Scenes.SceneContextScene<AppContext, RegisterWizardSession>;
  wizard: Scenes.WizardContextWizard<AppContext>
}
