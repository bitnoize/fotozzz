import { Scenes, session, Telegraf, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { Redis } from '@telegraf/session/redis'
import { HttpsProxyAgent } from 'hpagent'
import {
  AppOptions,
  Controller,
  AppContext,
  AppSession,
  AppContextHandler
} from './interfaces/app.js'
import { RedisService } from './services/redis.js'
import { PostgresService } from './services/postgres.js'
import { RegisterController } from './controllers/register.js'
import {
  getFrom,
  getChat,
  getSessionUser,
  setSessionUser
} from './helpers/telegram.js'
import { logger } from './logger.js'

export class App {
  protected redisService = RedisService.instance()
  protected postgresService = PostgresService.instance()

  private agent?: HttpsProxyAgent
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

    const controllers: Array<Controller> = []

    controllers.push(new RegisterController(this.options))

    const stage = new Scenes.Stage<AppContext>(
      controllers.map((controller) => controller.scene)
    )

    this.bot.use(stage.middleware())

    this.bot.use(this.authorizeHandler)
    this.bot.use(this.membershipHandler)

    this.bot.command('start', this.startCommandHandler)
    //this.bot.command('profile', this.profileCommandHandler)
    //this.bot.command('photo', this.photoCommandHandler)
    //this.bot.command('search', this.searchCommandHandler)

    this.bot.hears(
      [
        'Я уже подписан на группу',
        'Я уже подписан на канал',
        'Окей, давай дальше',
      ],
      this.startCommandHandler
    )

    this.bot.on('chat_join_request', this.chatJoinRequestHandler)
    this.bot.on('new_chat_member', this.newChatMemberHandler)
    this.bot.on('left_chat_member', this.leftChatMemberHandler)

    this.bot.use(this.unknownHandler)
    this.bot.catch(this.exceptionHandler)

    logger.info(`App initialized`)
  }

  async start(): Promise<void> {
    await this.bot.launch()

    process.once('SIGINT', () => this.bot.stop('SIGINT'))
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'))
  }

  private authorizeHandler: AppContextHandler = async (ctx, next) => {
    const { 'id': fromId, 'is_bot': fromIsBot } = getFrom(ctx)

    if (!fromIsBot) {
      const sessionUser = await this.postgresService.authorizeUser(
        fromId,
        ctx.from
      )

      if (sessionUser.status !== 'banned') {
        setSessionUser(ctx, sessionUser)

        await next()
      } else {
        logger.info(`Ignore banned user ${sessionUser.id}`)
      }
    } else {
      logger.info(`Ignore bot`)
      console.dir(ctx.message)
    }
  }

  private membershipHandler: AppContextHandler = async (ctx, next) => {
    const { groupChatId, channelChatId } = this.options

    const { 'type': chatType } = getChat(ctx)
    const sessionUser = getSessionUser(ctx)

    if (chatType === 'private') {
      console.log(`API getChatMember DO!`)

      const groupMember = await ctx.telegram.getChatMember(
        groupChatId,
        sessionUser.tgId
      )

      if (groupMember.status === 'member') {
        sessionUser.isGroupMember = true
      }

      const channelMember = await ctx.telegram.getChatMember(
        channelChatId,
        sessionUser.tgId
      )

      if (channelMember.status === 'member') {
        sessionUser.isChannelMember = true
      }

      await next()
    } else {
      console.log(`API getChatMember SKIP!`)
      await next()
    }
  }

  private startCommandHandler: AppContextHandler = async (ctx) => {
    const { groupUrl, channelUrl } = this.options

    const sessionUser = getSessionUser(ctx)
    console.dir(sessionUser)

    if (sessionUser.status === 'register') {
      await ctx.scene.enter('register-scene')
    } else {
      if (!sessionUser.isGroupMember) {
        await ctx.reply(
          `Ты еще не подписан на группу! ${groupUrl}`,
          Markup.keyboard([
            Markup.button.text('Я уже подписан на группу')
          ]).resize()
        )
      } else if (!sessionUser.isChannelMember) {
        await ctx.reply(
          `Ты еще не подписан на канал! ${channelUrl}`,
          Markup.keyboard([
            Markup.button.text('Я уже подписан на канал')
          ]).resize()
        )
      } else {
        await ctx.reply(`Бот приветствует тебя, ${sessionUser.nick}!`)
      }
    }
  }

  private chatJoinRequestHandler: AppContextHandler = async (ctx) => {
    const { groupChatId, channelChatId } = this.options

    const sessionUser = getSessionUser(ctx)

    console.log(`chatJoinRequestHandler`)
    console.dir(ctx.chatJoinRequest)

    if (ctx.chatJoinRequest !== undefined) {
      const { 'id': chatId } =  ctx.chatJoinRequest.chat

      if (chatId === groupChatId || chatId === channelChatId) {
        const isSuccess = await ctx.telegram.approveChatJoinRequest(
          chatId,
          sessionUser.tgId
        )

        if (isSuccess) {
          //await ctx.reply(`Запрос на членство подтвержден`)
        } else {
          //await ctx.reply(`Запрос на членство отклонен`)
        }
      } else {
        logger.warning(`Ignore chatJoinRequest`)
        console.dir(ctx.message)
      }
    }
  }

  private prepareCheck = async (ctx: AppContext): Promise<boolean> => {
    return true
  }

  private newChatMemberHandler: AppContextHandler = async (ctx) => {
    logger.error(`Bot new chat member`)
    console.dir(ctx.message)
  }

  private leftChatMemberHandler: AppContextHandler = async (ctx) => {
    logger.info(`Bot left chat member`)
    console.dir(ctx.message)
  }

  private unknownHandler: AppContextHandler = async (ctx) => {
    const { 'type': chatType } = getChat(ctx)

    if (chatType === 'private') {
      await ctx.reply('Неизвестная команда')
    }

    logger.info(`Bot unknown command`)
    console.dir(ctx.message)
  }

  private exceptionHandler = (error: unknown, ctx: AppContext) => {
    if (error instanceof Error) {
      logger.error(`App error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx.message)
    }
  }
}
