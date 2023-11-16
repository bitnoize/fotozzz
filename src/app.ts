import { Scenes, session, Telegraf, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { Redis } from '@telegraf/session/redis'
import { HttpsProxyAgent } from 'hpagent'
import {
  AppOptions,
  Controller,
  AppContext,
  AppSession,
  AppContextHandler,
  CheckSessionUserHandler
} from './interfaces/app.js'
import { RedisService } from './services/redis.js'
import { PostgresService } from './services/postgres.js'
import { RegisterController } from './controllers/register.js'
import { ProfileController } from './controllers/profile.js'
import {
  getSessionUser,
  setSessionUser,
  markupKeyboardCheckGroup,
  markupKeyboardCheckChannel
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
    controllers.push(new ProfileController(this.options))

    const stage = new Scenes.Stage<AppContext>(
      controllers.map((controller) => controller.scene)
    )

    this.bot.use(stage.middleware())

    this.bot.use(this.authorizeHandler)
    this.bot.use(this.membershipHandler)

    this.bot.command('start', this.startCommandHandler)
    this.bot.command('profile', this.profileCommandHandler)
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

    this.bot.on(
      [
        'new_chat_member',
        'left_chat_member'
      ],
      this.changeChatMemberHandler
    )

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
    if (ctx.from !== undefined) {
      const { 'id': fromId, 'is_bot': fromIsBot } = ctx.from

      if (!fromIsBot) {
        const sessionUser = await this.postgresService.authorizeUser(
          fromId,
          ctx.from
        )

        if (sessionUser.status !== 'banned') {
          setSessionUser(ctx, sessionUser)

          await next()
        } else {
          logger.info(`Bot authorize: ignore banned user ${sessionUser.id}`)
        }
      } else {
        logger.info(`Bot authorize: ignore bot ${fromId}`)
      }
    } else {
      logger.info(`Bot authorize: skip undefined from`)
      console.dir(ctx)
    }
  }

  private membershipHandler: AppContextHandler = async (ctx, next) => {
    const { groupChatId, channelChatId } = this.options

    const sessionUser = getSessionUser(ctx)

    if (ctx.chat !== undefined) {
      const { 'type': chatType } = ctx.chat

      if (chatType === 'private') {
        const allowStatuses = [
          'creator',
          'administrator',
          'member'
        ]

        const groupMember = await ctx.telegram.getChatMember(
          groupChatId,
          sessionUser.tgId
        )

        if (allowStatuses.includes(groupMember.status)) {
          sessionUser.isGroupMember = true
          logger.info(`Bot membership: success for group`)
        }

        const channelMember = await ctx.telegram.getChatMember(
          channelChatId,
          sessionUser.tgId
        )

        if (allowStatuses.includes(channelMember.status)) {
          sessionUser.isChannelMember = true
          logger.info(`Bot membership: success for channel`)
        }

        await next()
      } else {
        logger.info(`Bot membership: skip not private chat`)
        await next()
      }
    } else {
      logger.info(`Bot membership: skip undefined chat`)
      await next()
    }
  }

  private startCommandHandler: AppContextHandler = async (ctx) => {
    await this.checkSessionUser(ctx, async (sessionUser) => {
      await ctx.reply(`Бот приветствует тебя, ${sessionUser.nick}!`)
    })
  }

  private profileCommandHandler: AppContextHandler = async (ctx) => {
    await this.checkSessionUser(ctx, async (sessionUser) => {
      await ctx.scene.enter('profile-scene')
    })
  }

  private chatJoinRequestHandler: AppContextHandler = async (ctx) => {
    const { groupChatId, channelChatId } = this.options

    const sessionUser = getSessionUser(ctx)

    console.log(`chatJoinRequestHandler`)
    console.dir(ctx.chatJoinRequest)

    if (ctx.chatJoinRequest !== undefined) {
      const { 'id': chatId } =  ctx.chatJoinRequest.chat
      const { 'id': fromId } =  ctx.chatJoinRequest.from

      if (chatId === groupChatId || chatId === channelChatId) {
        const isSuccess = await ctx.telegram.approveChatJoinRequest(
          chatId,
          sessionUser.tgId
        )

        if (!isSuccess) {
          logger.warn(`Bot declined approveChatJoinRequest`)
          console.dir(ctx.chatJoinRequest)
        }
      } else {
        logger.info(`Bot ignore chatJoinRequest unknown group`)
        console.dir(ctx.chatJoinRequest)
      }
    } else {
      logger.info(`Bot ignore chatJoinRequest undefined`)
      console.dir(ctx.chatJoinRequest)
    }
  }

  private checkSessionUser = async (
    ctx: AppContext,
    handler: CheckSessionUserHandler
  ): Promise<void> => {
    const { groupUrl, channelUrl } = this.options

    const sessionUser = getSessionUser(ctx)

    if (sessionUser.status === 'register') {
      await ctx.scene.enter('register-scene')
    } else {
      if (!sessionUser.isGroupMember) {
        await ctx.reply(
          `Ты еще не подписан на группу: ${groupUrl}`,
          markupKeyboardCheckGroup()
        )
      } else if (!sessionUser.isChannelMember) {
        await ctx.reply(
          `Ты еще не подписан на канал: ${channelUrl}`,
          markupKeyboardCheckChannel()
        )
      } else {
        await handler(sessionUser)
      }
    }
  }

  private changeChatMemberHandler: AppContextHandler = async (ctx) => {
    logger.info(`Bot changeChatMemberHandler`)
    console.dir(ctx.message)
  }

  private unknownHandler: AppContextHandler = async (ctx) => {
    if (ctx.chat !== undefined) {
      const { 'type': chatType } = ctx.chat

      if (chatType === 'private') {
        await ctx.reply('Неизвестная команда')
      }
    }

    logger.info(`Bot unknown message`)
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
