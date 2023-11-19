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
//import { PhotoController } from './controllers/photo.js'
//import { SearchController } from './controllers/photo.js'
import {
  getEmojiGender,
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
    //controllers.push(new PhotoController(this.options))
    //controllers.push(new SearchController(this.options))

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

    this.bot.action('check-membership', this.startCommandHandler)

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
    if (ctx.from !== undefined && ctx.chat !== undefined) {
      const { id: fromId, is_bot: fromIsBot } = ctx.from

      if (!fromIsBot) {
        const sessionUser = await this.postgresService.authorizeUser(
          fromId,
          ctx.from
        )

        if (sessionUser.status !== 'banned') {
          ctx.session.user = sessionUser

          if (ctx.session.navigation === undefined) {
            ctx.session.navigation = {
              messageId: null,
              currentPage: 0,
              totalPages: 0
            }
          }

          await next()
        } else {
          logger.info(`Bot authorize: ignore banned user ${sessionUser.id}`)
        }
      } else {
        logger.info(`Bot authorize: ignore bot ${fromId}`)
      }
    } else {
      logger.warn(`Bot authorize: skip unknown source`)
      console.dir(ctx, { depth: 4 })
    }
  }

  private membershipHandler: AppContextHandler = async (ctx, next) => {
    const { groupChatId, channelChatId } = this.options

    if (
      ctx.from !== undefined &&
      ctx.chat !== undefined &&
      ctx.session.user !== undefined
    ) {
      const { id: fromId } = ctx.from
      const { id: chatId, type: chatType } = ctx.chat

      const sessionUser = ctx.session.user

      if (chatType === 'private') {
        const allowedStatuses = [
          'creator',
          'administrator',
          'member'
        ]

        const groupMember = await ctx.telegram.getChatMember(
          groupChatId,
          fromId
        )

        if (allowedStatuses.includes(groupMember.status)) {
          sessionUser.isGroupMember = true
        }

        const channelMember = await ctx.telegram.getChatMember(
          channelChatId,
          fromId
        )

        if (allowedStatuses.includes(channelMember.status)) {
          sessionUser.isChannelMember = true
        }

        await next()
      } else {
        logger.info(`Bot membership: skip ${chatType} chatType`)

        await next()
      }
    } else {
      logger.info(`Bot membership: skip unknown source`)

      await next()
    }
  }

  private startCommandHandler: AppContextHandler = async (ctx) => {
    await this.checkSessionUser(ctx, async (sessionUser, navigation) => {
      const emojiGender = getEmojiGender(sessionUser.gender)

      const message = await ctx.replyWithMarkdownV2(
        `Бот приветствует тебя, ${emojiGender} *${sessionUser.nick}*\n` +
        `Описание сервиса`
      )

      navigation.messageId = message.message_id
    })
  }

  private profileCommandHandler: AppContextHandler = async (ctx) => {
    await this.checkSessionUser(ctx, async (sessionUser) => {
      await ctx.scene.enter('profile')
    })
  }

  private photoCommandHandler: AppContextHandler = async (ctx) => {
    await this.checkSessionUser(ctx, async (sessionUser) => {
      await ctx.scene.enter('profile')
    })
  }

  private chatJoinRequestHandler: AppContextHandler = async (ctx) => {
    const { groupChatId, channelChatId } = this.options

    const sessionUser = ctx.session.user

    if (sessionUser === undefined) {
      throw new Error(`context session user lost`)
    }

    if (ctx.chatJoinRequest !== undefined) {
      const { id: chatId } =  ctx.chatJoinRequest.chat
      const { id: fromId } =  ctx.chatJoinRequest.from

      if (chatId === groupChatId || chatId === channelChatId) {
        const isSuccess = await ctx.telegram.approveChatJoinRequest(
          chatId,
          fromId
        )

        if (isSuccess) {
          logger.info(`ChatJoinRequest: success user: ${fromId}`)
        } else {
          logger.warn(`ChatJoinRequest: failed user: ${fromId}`)
        }
      } else {
        logger.warn(`ChatJoinRequest: ignore unknown group: ${chatId}`)
        console.dir(ctx.chatJoinRequest, { depth: 4 })
      }
    } else {
      logger.warn(`ChatJoinRequest: skip unknown`)
      console.dir(ctx, { depth: 4 })
    }
  }

  private checkSessionUser = async (
    ctx: AppContext,
    handler: CheckSessionUserHandler
  ): Promise<void> => {
    const { groupUrl, channelUrl } = this.options

    const sessionUser = ctx.session.user
    const navigation = ctx.session.navigation

    if (sessionUser === undefined) {
      throw new Error(`context session user lost`)
    }

    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    if (navigation.messageId !== null) {
      await ctx.deleteMessage(navigation.messageId)

      navigation.messageId = null
    }

    if (sessionUser.status === 'register') {
      await ctx.scene.enter('register')
    } else {
      if (!sessionUser.isGroupMember) {
        const message = await ctx.replyWithMarkdownV2(
          `Подпишись на [группу](${groupUrl})`,
          markupKeyboardCheckGroup()
        )

        navigation.messageId = message.message_id
      } else if (!sessionUser.isChannelMember) {
        const message = await ctx.replyWithMarkdownV2(
          `Подпишись на [канал](${channelUrl})`,
          markupKeyboardCheckChannel()
        )

        navigation.messageId = message.message_id
      } else {
        await handler(sessionUser)
      }
    }
  }

  private changeChatMemberHandler: AppContextHandler = async (ctx) => {
    logger.info(`Bot changeChatMemberHandler`)
    console.dir(ctx, { depth: 4 })
  }

  private unknownHandler: AppContextHandler = async (ctx) => {
    if (ctx.from !== undefined && ctx.chat !== undefined) {
      const { type: chatType } = ctx.chat

      if (chatType === 'private') {
        await ctx.replyWithMarkdownV2(
          `Неизвестная команда`
        )
      }

      logger.warn(`Bot unknown ${chatType} message`)
      console.dir(ctx, { depth: 4 })
    } else {
      logger.warn(`Bot unknown message`)
      console.dir(ctx, { depth: 4 })
    }
  }

  private exceptionHandler = (error: unknown, ctx: AppContext) => {
    if (error instanceof Error) {
      logger.error(`App error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }
  }
}
