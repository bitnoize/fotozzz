import { Scenes, session, Telegraf } from 'telegraf'
import { Redis } from '@telegraf/session/redis'
import { HttpsProxyAgent } from 'hpagent'
import { AppOptions, Controller, AppContext, AppSession } from './interfaces/app.js'
import { authorize } from './middlewares/authorize.js'
import { MainController } from './controllers/main.js'
import { RegisterController } from './controllers/register.js'
import { logger } from './logger.js'

export class App {
  private bot: Telegraf<AppContext>

  constructor(private readonly options: AppOptions) {
    const { botToken, useProxy, proxyUrl, redisUrl } = this.options

    const proxyAgentOptions = {
      proxy: proxyUrl
    }

    const telegrafOptions = {
      telegram: {}
    }

    if (useProxy) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Proxy usage not allowed in production mode`)
      }

      const agent = new HttpsProxyAgent(proxyAgentOptions)
      telegrafOptions.telegram.agent = agent
      telegrafOptions.telegram.attachmentAgent = agent
    }

    const store = Redis<AppSession>({
      url: redisUrl
    })

    this.bot = new Telegraf<AppContext>(botToken, telegrafOptions)

    this.bot.use(session({ store }))

    const controllers = []

    controllers.push(new MainController(this.options))
    controllers.push(new RegisterController(this.options))

    const stage = new Scenes.Stage<AppContext>(
      controllers.map((controller) => controller.scene)
    )

    this.bot.use(stage.middleware())

    this.bot.use(authorize)

    this.bot.command('start', this.startHandler)

    this.bot.catch((error: unknown) => {
      logger.error(error)
    })

    logger.info(`App initialized`)
  }

  async start(): Promise<void> {
    await this.bot.launch()

    process.once('SIGINT', () => this.bot.stop('SIGINT'))
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'))
  }

  private startHandler = async (ctx: AppContext): Promise<void> => {
    const user = ctx.session.user

    if (user === undefined) {
      throw new Error(`Fail to get user from session`)
    }

    if (user.status === 'blank') {
      await ctx.scene.enter('register-scene')
    } else {
      await ctx.scene.enter('main-scene')
    }
  }
}
