import { Context, Markup, Scenes, session, Telegraf } from 'telegraf'
import { HttpsProxyAgent } from 'hpagent'
import { AppOptions } from './interfaces/app.js'
import { RedisService } from './services/redis.js'
import { PostgresService } from './services/postgres.js'
import { logger } from './logger.js'


export class App {
  private bot: Telegraf
  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    const { botToken, useProxy, proxyUrl } = this.options

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

    this.bot = new Telegraf(botToken, telegrafOptions)

    this.bot.command('start', this.commandStart)

    logger.info(`App initialized`)
  }

  commandStart = async (ctx: Context): Promise<void> => {
    await ctx.scene.enter('register')
  }

  async start(): Promise<void> {
    //await this.postgresService.checkConnection()

    await this.bot.launch()

    process.once('SIGINT', () => this.bot.stop('SIGINT'))
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'))
  }
}
