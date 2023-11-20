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
  RouteMainMenuHandler
} from './interfaces/app.js'
import { RedisService } from './services/redis.js'
import { PostgresService } from './services/postgres.js'
import { RegisterController } from './controllers/register.js'
import { ProfileController } from './controllers/profile.js'
import { PhotoController } from './controllers/photo.js'
import { NewPhotoController } from './controllers/new-photo.js'
import { Membership } from './interfaces/user.js'
import {
  getEmojiGender,
  markupKeyboardCheckGroup,
  markupKeyboardCheckChannel,
  markupKeyboardMain,
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
    controllers.push(new PhotoController(this.options))
    controllers.push(new NewPhotoController(this.options))

    const stage = new Scenes.Stage<AppContext>(
      controllers.map((controller) => controller.scene)
    )

    this.bot.use(stage.middleware())

    this.bot.use(this.authorizeHandler)
    this.bot.use(this.membershipHandler)
    this.bot.use(this.navigationHandler)

    this.bot.command('start', this.startCommandHandler)
    this.bot.command('profile', this.profileCommandHandler)
    this.bot.command('photo', this.photoCommandHandler)

    this.bot.action('main-start', this.startCommandHandler)
    this.bot.action('main-profile', this.profileCommandHandler)

    this.bot.on('chat_join_request', this.chatJoinRequestHandler)

    this.bot.on('new_chat_member', this.changeChatMemberHandler)
    this.bot.on('left_chat_member', this.changeChatMemberHandler)

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
        const authorize = await this.postgresService.authorizeUser(fromId, ctx.from)

        if (authorize.status !== 'banned') {
          ctx.session.authorize = authorize

          logger.debug(`Authorize: initialize context session`)
          console.dir(authorize, { depth: 2 })

          await next()
        } else {
          logger.info(`Authorize: ignore banned user ${authorize.id}`)
        }
      } else {
        logger.info(`Authorize: ignore bot ${fromId}`)
      }
    } else {
      logger.warn(`Authorize: ignore unknown source`)
      console.dir(ctx, { depth: 4 })
    }
  }

  private membershipHandler: AppContextHandler = async (ctx, next) => {
    const { groupChatId, channelChatId } = this.options

    const membership: Membership = {
      checkGroup: null,
      checkChannel: null
    }

    if (ctx.from !== undefined && ctx.chat !== undefined) {
      const { id: fromId } = ctx.from
      const { type: chatType } = ctx.chat

      if (chatType === 'private') {
        const allowedStatuses = ['creator', 'administrator', 'member']

        const groupMember = await ctx.telegram.getChatMember(groupChatId, fromId)

        membership.checkGroup = allowedStatuses.includes(groupMember.status)

        const channelMember = await ctx.telegram.getChatMember(channelChatId, fromId)

        membership.checkChannel = allowedStatuses.includes(channelMember.status)
      }
    }

    ctx.session.membership = membership

    logger.debug(`Membership: initialize context session`)
    console.dir(membership, { depth: 2 })

    await next()
  }

  private navigationHandler: AppContextHandler = async (ctx, next) => {
    const navigation = ctx.session.navigation ??= {
      messageId: null,
      currentPage: 0,
      totalPages: 0
    }

    logger.debug(`Navigation: initialize context session`)
    console.dir(navigation, { depth: 2 })

    await next()
  }

  private startCommandHandler: AppContextHandler = async (ctx) => {
    const handler: RouteMainMenuHandler = async (
      authorize,
      membership,
      navigation
    ) => {
      const emojiGender = getEmojiGender(authorize.gender)

      const message = await ctx.replyWithMarkdownV2(
        `Бот приветствует тебя, ${emojiGender} *${authorize.nick}*\n` +
        `Описание сервиса`,
        markupKeyboardMain()
      )

      navigation.messageId = message.message_id
    }

    await this.routeMainMenu(ctx, handler)
  }

  private profileCommandHandler: AppContextHandler = async (ctx) => {
    const commandHandler: RouteMainMenuHandler = async () => {
      await ctx.scene.enter('profile')
    }

    await this.routeMainMenu(ctx, commandHandler)
  }

  private photoCommandHandler: AppContextHandler = async (ctx) => {
    const commandHandler: RouteMainMenuHandler = async () => {
      await ctx.scene.enter('photo')
    }

    await this.routeMainMenu(ctx, commandHandler)
  }

  private chatJoinRequestHandler: AppContextHandler = async (ctx) => {
    const { groupChatId, channelChatId } = this.options

    const authorize = ctx.session.authorize
    if (authorize === undefined) {
      throw new Error(`context session authorize lost`)
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

  private routeMainMenu = async (
    ctx: AppContext,
    handler: RouteMainMenuHandler
  ): Promise<void> => {
    const { groupUrl, channelUrl } = this.options

    const authorize = ctx.session.authorize
    if (authorize === undefined) {
      throw new Error(`context session authorize lost`)
    }

    const membership = ctx.session.membership
    if (membership === undefined) {
      throw new Error(`context session membership lost`)
    }

    const navigation = ctx.session.navigation
    if (navigation === undefined) {
      throw new Error(`context session navigation lost`)
    }

    if (navigation.messageId !== null) {
      await ctx.deleteMessage(navigation.messageId)

      navigation.messageId = null
    }

    navigation.currentPage = 0
    navigation.totalPages = 0

    if (authorize.status === 'register') {
      await ctx.scene.enter('register')
    } else {
      if (!membership.checkGroup) {
        const message = await ctx.replyWithMarkdownV2(
          `Подпишись на [группу](${groupUrl})`,
          markupKeyboardCheckGroup()
        )

        navigation.messageId = message.message_id
      } else if (!membership.checkChannel) {
        const message = await ctx.replyWithMarkdownV2(
          `Подпишись на [канал](${channelUrl})`,
          markupKeyboardCheckChannel()
        )

        navigation.messageId = message.message_id
      } else {
        await handler(authorize, membership, navigation)
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
