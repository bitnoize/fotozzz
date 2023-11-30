import { Scenes, session, Telegraf } from 'telegraf'
import { Redis } from '@telegraf/session/redis'
import { HttpsProxyAgent } from 'hpagent'
import {
  AppOptions,
  Controller,
  AppContext,
  AppSession,
  AppContextHandler,
  PrepareMainHandler
} from './interfaces/app.js'
import { RedisService } from './services/redis.js'
import { PostgresService } from './services/postgres.js'
import { RegisterController } from './controllers/register.js'
import { ProfileController } from './controllers/profile.js'
import { ChangeAvatarController } from './controllers/change-avatar.js'
import { ChangeAboutController } from './controllers/change-about.js'
import { PhotoController } from './controllers/photo.js'
import { NewPhotoController } from './controllers/new-photo.js'
import { DeletePhotoController } from './controllers/delete-photo.js'
import { SearchController } from './controllers/search.js'
import {
  blankNavigation,
  resetNavigation,
  blankMembership,
  initSessionAuthorize,
  sureSessionAuthorize,
  initSessionNavigation,
  sureSessionNavigation,
  initSessionMembership,
  sureSessionMembership,
  parseChatJoinRequest,
  parseRatePhotoRequest,
  parseCommentPhotoRequest,
  replyMainCheckGroup,
  replyMainCheckChannel,
  replyMainMenu,
  updatePhotoGroup
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
    controllers.push(new ChangeAvatarController(this.options))
    controllers.push(new ChangeAboutController(this.options))
    controllers.push(new PhotoController(this.options))
    controllers.push(new NewPhotoController(this.options))
    controllers.push(new DeletePhotoController(this.options))
    controllers.push(new SearchController(this.options))

    const stage = new Scenes.Stage<AppContext>(
      controllers.map((controller) => controller.scene)
    )

    this.bot.use(stage.middleware())

    this.bot.use(this.authorizeHandler)
    this.bot.use(this.navigationHandler)
    this.bot.use(this.membershipHandler)

    this.bot.command('start', this.startMenuHandler)
    this.bot.command('profile', this.profileMenuHandler)
    this.bot.command('photo', this.photoMenuHandler)
    this.bot.command('search', this.searchMenuHandler)

    this.bot.action('main-start', this.startMenuHandler)
    this.bot.action('main-profile', this.profileMenuHandler)
    this.bot.action('main-photo', this.photoMenuHandler)
    this.bot.action('main-search', this.searchMenuHandler)
    this.bot.action(/^rate-(\w+)$/, this.ratePhotoHandler)

    this.bot.on('chat_join_request', this.chatJoinRequestHandler)

    this.bot.on('new_chat_member', this.changeChatMemberHandler)
    this.bot.on('left_chat_member', this.changeChatMemberHandler)

    this.bot.use(this.wildcardHandler)
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

      const user = await this.postgresService.authorizeUser(fromId, ctx.from)

      if (user.status !== 'banned') {
        initSessionAuthorize(ctx, user)

        await next()
      } else {
        logger.debug(`Authorize ignore banned user ${user.id}`)
      }
    } else {
      logger.warn(`Authorize ignore unknown message`)
      console.dir(ctx, { depth: 4 })
    }
  }

  private navigationHandler: AppContextHandler = async (ctx, next) => {
    if (ctx.session.navigation === undefined) {
      const navigation = blankNavigation()

      initSessionNavigation(ctx, navigation)
    }

    await next()
  }

  private membershipHandler: AppContextHandler = async (ctx, next) => {
    const { groupChatId, channelChatId } = this.options

    const membership = blankMembership()

    const { id: fromId } = ctx.from!
    const { type: chatType } = ctx.chat!

    if (chatType === 'private') {
      const allowedStatuses = ['creator', 'administrator', 'member']

      const groupMember = await ctx.telegram.getChatMember(groupChatId, fromId)
      membership.checkGroup = allowedStatuses.includes(groupMember.status)

      const channelMember = await ctx.telegram.getChatMember(channelChatId, fromId)
      membership.checkChannel = allowedStatuses.includes(channelMember.status)
    }

    initSessionMembership(ctx, membership)

    await next()
  }

  private startMenuHandler: AppContextHandler = async (ctx) => {
    await this.prepareMain(ctx, async (authorize, navigation) => {
      await replyMainMenu(ctx, authorize, navigation)
    })
  }

  private profileMenuHandler: AppContextHandler = async (ctx) => {
    await this.prepareMain(ctx, async () => {
      await ctx.scene.enter('profile')
    })
  }

  private photoMenuHandler: AppContextHandler = async (ctx) => {
    await this.prepareMain(ctx, async () => {
      await ctx.scene.enter('photo')
    })
  }

  private searchMenuHandler: AppContextHandler = async (ctx) => {
    await this.prepareMain(ctx, async () => {
      await ctx.scene.enter('search')
    })
  }

  private prepareMain = async (
    ctx: AppContext,
    handler: PrepareMainHandler
  ): Promise<void> => {
    const { groupUrl, channelUrl } = this.options

    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const membership = sureSessionMembership(ctx)

    if (authorize.status === 'register') {
      await ctx.scene.enter('register')
    } else {
      if (!membership.checkGroup) {
        await replyMainCheckGroup(ctx, authorize, navigation, groupUrl)
      } else if (!membership.checkChannel) {
        await replyMainCheckChannel(ctx, authorize, navigation, channelUrl)
      } else {
        await handler(authorize, navigation)
      }
    }
  }

  private chatJoinRequestHandler: AppContextHandler = async (ctx) => {
    const { groupChatId, channelChatId } = this.options

    const chatJoinRequest = parseChatJoinRequest(ctx)

    if (chatJoinRequest !== undefined) {
      const { chatId, fromId } = chatJoinRequest

      if (chatId === groupChatId || chatId === channelChatId) {
        const check = await ctx.telegram.approveChatJoinRequest(chatId, fromId)

        if (!check) {
          logger.warn(`ChatJoinRequest fail to approve join request`)
          console.dir(chatJoinRequest)
        }
      } else {
        logger.warn(`ChatJoinRequest ignore unknown group`)
        console.dir(ctx, { depth: 4 })
      }
    } else {
      logger.warn(`ChatJoinRequest ignore unknown message`)
      console.dir(ctx, { depth: 4 })
    }
  }

  private changeChatMemberHandler: AppContextHandler = async (ctx) => {
    logger.debug(`ChangeChatMemberHandler received`)
  }

  private ratePhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)

    const rateValue = ctx.match[1]

    const ratePhotoRequest = parseRatePhotoRequest(ctx)

    if (ratePhotoRequest !== undefined) {
      const {
        groupTgChatId,
        groupTgThreadId,
        groupTgMessageId
      } = ratePhotoRequest

      const photo = await this.postgresService.getPhotoGroup(
        groupTgChatId,
        groupTgThreadId,
        groupTgMessageId
      )

      if (photo !== undefined) {
        const check = await this.postgresService.checkRateUserPhoto(
          authorize.id,
          photo.id
        )

        if (check) {
          const user = await this.postgresService.getUserFull(photo.userId)

          const rate = await this.postgresService.newRate(
            authorize.id,
            photo.topicId,
            photo.id,
            rateValue,
            ctx.from
          )

          const ratesAgg = await this.postgresService.getRatesAgg(photo.id)

          updatePhotoGroup(ctx, user, photo, ratesAgg)
        } else {
          await ctx.answerCbQuery(`Ты уже оценил это фото`)
        }
      } else {
        logger.warn(`RatePhotoRequest group photo not found`)
        console.dir(ratePhotoRequest)
      }
    } else {
      logger.warn(`RatePhotoRequest ignore unknown message`)
      console.dir(ctx, { depth: 4 })
    }
  }

  private wildcardHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)

    const { type: chatType } = ctx.chat!

    if (chatType === 'supergroup') {
      const commentPhotoRequest = parseCommentPhotoRequest(ctx)

      if (commentPhotoRequest !== undefined) {
        const {
          channelTgChatId,
          channelTgMessageId,
          text
        } = commentPhotoRequest

        const photo = await this.postgresService.getPhotoChannel(
          channelTgChatId,
          channelTgMessageId
        )

        if (photo !== undefined) {
          const comment = await this.postgresService.newComment(
            authorize.id,
            photo.topicId,
            photo.id,
            channelTgChatId,
            channelTgMessageId,
            text,
            ctx.from
          )
        } else {
          logger.warn(`CommentPhotoRequest channel photo not found`)
          console.dir(commentPhotoRequest)
        }
      } else {
        logger.warn(`Wildcard ignore unknown supergroup message`)
        console.dir(ctx, { depth: 4 })
      }
    } else {
      logger.warn(`Wildcard ignore unknown message`)
      console.dir(ctx, { depth: 4 })
    }
  }

  private exceptionHandler = (error: unknown, ctx: AppContext) => {
    if (error instanceof Error) {
      logger.error(`App fatal: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }
  }
}
