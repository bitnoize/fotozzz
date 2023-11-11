import { Scenes, session, Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { Redis } from '@telegraf/session/redis'
import { HttpsProxyAgent } from 'hpagent'
import { AppOptions, Controller, AppContext, AppSession } from './interfaces/app.js'
import { RedisService } from './services/redis.js'
import { PostgresService } from './services/postgres.js'
import { MainController } from './controllers/main.js'
import { RegisterController } from './controllers/register.js'
import { logger } from './logger.js'

export class App {
  protected redisService = RedisService.instance()
  protected postgresService = PostgresService.instance()

  private agent: HttpsProxyAgent | undefined
  private bot: Telegraf<AppContext>

  constructor(private readonly options: AppOptions) {
    const { botToken, useProxy, proxyUrl, redisUrl } = this.options

    if (useProxy) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Proxy usage not allowed in production mode`)
      }

      this.agent = new HttpsProxyAgent({
        proxy: proxyUrl
      })
    }

    const store = Redis<AppSession>({
      url: redisUrl
    })

    this.bot = new Telegraf<AppContext>(botToken, {
      telegram: {
        agent: this.agent,
        attachmentAgent: this.agent
      }
    })

    this.bot.use(session({ store }))

    const controllers = []

    controllers.push(new MainController(this.options))
    controllers.push(new RegisterController(this.options))

    const stage = new Scenes.Stage<AppContext>(
      controllers.map((controller) => controller.scene)
    )

    this.bot.use(stage.middleware())

    this.bot.use(this.authorizeHandler)

    this.bot.command('start', this.startCommandHandler)
    this.bot.on('chat_join_request', this.chatJoinRequestHandler)

    this.bot.use(this.unknownCommandHandler)
    this.bot.catch(this.exceptionHandler)

    logger.info(`App initialized`)
  }

  async start(): Promise<void> {
    await this.bot.launch()

    process.once('SIGINT', () => this.bot.stop('SIGINT'))
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'))
  }

  private startCommandHandler = async (ctx: AppContext): Promise<void> => {
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

  private authorizeHandler = async (
    ctx: AppContext,
    next: () => Promise<void>
  ): Promise<void> => {
    const user = await this.postgresService.authorizeUser(ctx.from.id)

    if (user === undefined) {
      await ctx.reply('Ошибка в базе, попробуй еще раз')
    } else {
      if (user.status === 'banned') {
        await ctx.reply('Ты забанен!')
      } else {
        ctx.session.user = user

        await next()
      }
    }
  }

  private chatJoinRequestHandler = async (ctx: AppContext): Promise<void> => {
    const user = ctx.session.user
    if (user === undefined) {
      throw new Error(`Fail to get session user`)
    }

    const { groupChatId, groupLink } = this.options

    //if (ctx.has(message('chat_join_request'))) {
      if (ctx.chatJoinRequest.chat.id === groupChatId) {
        if (user.status === 'active') {
          const resultApprove = await ctx.telegram.approveChatJoinRequest(
            groupChatId,
            ctx.from.id
          )

          if (resultApprove) {
            await ctx.reply(`Запрос на членство в группе подтвержден`)
          } else {
            await ctx.reply(`Запрос на членство в группе отклонен`)
          }
        } else {
          await ctx.reply(`Аккаунт не активирован!`)
        }
      } else {
        await ctx.reply(`Неверная группа!`)
      }
    //}
  }

  private unknownCommandHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Начни работу с ботом командой /start')
  }

  private exceptionHandler = (error: unknown) => {
    if (error instanceof Error) {
      logger.error(`Bot error: ${error.message}`)
    }
  }
}
