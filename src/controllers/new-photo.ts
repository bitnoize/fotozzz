import { Scenes, Composer, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { BaseController } from './base.js'
import {
  AppOptions,
  AppContext,
  AppContextHandler,
  AppWizardScene
} from '../interfaces/app.js'
import { NewPhoto } from '../interfaces/telegram.js'
import {
  isNewPhoto,
  isPhotoSize,
  isPhotoDescription,
  replyMainMenu,
  replyNewPhotoPhoto,
  replyNewPhotoTopics,
  replyNewPhotoDescription,
  replyNewPhotoDescriptionWrong,
  replyNewPhotoPublish,
  postNewPhotoGroup,
  postNewPhotoChannel
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class NewPhotoController extends BaseController {
  readonly scene: AppWizardScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene<AppContext>(
      'new-photo',
      this.startSceneHandler,
      this.quaerePhotoHandler,
      this.answerPhotoComposer(),
      this.quaereTopicHandler,
      this.answerTopicComposer(),
      this.quaereDescriptionHandler,
      this.answerDescriptionComposer(),
      this.quaerePublishHandler,
      this.answerPublishComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize!
    const navigation = ctx.session.navigation!

    navigation.updatable = false

    const allowedStatuses = ['active']
    if (allowedStatuses.includes(authorize.status)) {
      const expire = await this.redisService.checkPhotoRateLimit(authorize.id)

      if (expire === 0) {
        ctx.scene.session.newPhoto = {} as Partial<NewPhoto>

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      } else {
        const intSeconds = Math.floor((expire - Date.now()) / 1000)
        if (intSeconds <= 0) {
          throw new Error(`photo limiter expire time in past`)
        }

        const intMinutes = Math.floor(intSeconds / 60)
        const intHours = Math.floor(intMinutes / 60)
        const diffMinutes = intMinutes - intHours * 60

        const intString = intHours.toString() + ' ч ' +
          diffMinutes.toString().padStart(2, '0') + ' мин'

        ctx.reply(
          `Лимит новых фото в день исчерпан\n` +
          `Загрузка следующего будет доступна через ${intString}`,
          {
            parse_mode: 'MarkdownV2'
          }
        )
      }
    }

    delete ctx.scene.session.newPhoto

    await ctx.scene.leave()

    await replyMainMenu(ctx)
  }

  private quaerePhotoHandler: AppContextHandler = async (ctx) => {
    await replyNewPhotoPhoto(ctx)

    ctx.wizard.next()
  }

  private answerPhotoComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('photo', this.answerPhotoInputHandler)
    composer.action('new-photo-back', this.returnPhotoHandler)
    composer.use(this.answerPhotoUnknownHandler)

    return composer
  }

  private answerPhotoInputHandler: AppContextHandler = async (ctx, next) => {
    const newPhoto = ctx.scene.session.newPhoto!

    if (ctx.has(message('photo'))) {
      const photo = ctx.message.photo

      const photoSize = photo.pop()

      if (isPhotoSize(photoSize)) {
        newPhoto.tgFileId = photoSize.file_id

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      } else {
        await replyNewPhotoPhoto(ctx)
      }
    }
  }

  private answerPhotoUnknownHandler: AppContextHandler = async (ctx) => {
    await replyNewPhotoPhoto(ctx)
  }

  private quaereTopicHandler: AppContextHandler = async (ctx) => {
    const { groupChatId } = this.options

    const topics = await this.postgresService.getTopics(groupChatId)

    await replyNewPhotoTopics(ctx, topics)

    ctx.wizard.next()
  }

  private answerTopicComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action(/^new-photo-topic-(\d+)$/, this.answerTopicInputHandler)
    handler.action('new-photo-back', this.returnPhotoHandler)
    handler.use(this.answerTopicUnknownHandler)

    return handler
  }

  private answerTopicInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize!
    const newPhoto = ctx.scene.session.newPhoto!

    const { groupChatId, channelChatId } = this.options

    const topics = await this.postgresService.getTopics(groupChatId)

    const topicId = parseInt(ctx.match[1])

    if (topicId != null && typeof topicId === 'number') {
      const topic = topics.find((topic) => topic.id === topicId)

      if (topic !== undefined) {
        newPhoto.topicId = topic.id
        newPhoto.topicName = topic.name
        newPhoto.groupTgChatId = topic.tgChatId
        newPhoto.groupTgThreadId = topic.tgThreadId
        newPhoto.groupTgMessageId = null
        newPhoto.channelTgChatId = channelChatId
        newPhoto.channelTgMessageId = null

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      }
    }

    await replyNewPhotoTopics(ctx, topics)
  }

  private answerTopicUnknownHandler: AppContextHandler = async (ctx) => {
    const { groupChatId } = this.options

    const topics = await this.postgresService.getTopics(groupChatId)

    await replyNewPhotoTopics(ctx, topics)
  }

  private quaereDescriptionHandler: AppContextHandler = async (ctx) => {
    await replyNewPhotoDescription(ctx)

    ctx.wizard.next()
  }

  private answerDescriptionComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('text', this.answerDescriptionInputHandler)
    composer.action('new-photo-back', this.returnPhotoHandler)
    composer.use(this.answerDescriptionUnknownHandler)

    return composer
  }

  private answerDescriptionInputHandler: AppContextHandler = async (ctx, next) => {
    const newPhoto = ctx.scene.session.newPhoto!

    if (ctx.has(message('text'))) {
      const description = ctx.message.text

      if (isPhotoDescription(description)) {
        newPhoto.description = description

        ctx.wizard.next()

        if (typeof ctx.wizard.step === 'function') {
          return ctx.wizard.step(ctx, next)
        }
      } else {
        await replyNewPhotoDescriptionWrong(ctx)
      }
    }
  }

  private answerDescriptionUnknownHandler: AppContextHandler = async (ctx) => {
    await replyNewPhotoDescription(ctx)
  }

  private quaerePublishHandler: AppContextHandler = async (ctx) => {
    const newPhoto = ctx.scene.session.newPhoto!

    if (!isNewPhoto(newPhoto)) {
      throw new Error(`scene session newPhoto data malformed`)
    }

    await replyNewPhotoPublish(ctx, newPhoto)

    ctx.wizard.next()
  }

  private answerPublishComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action('new-photo-publish', this.answerPublishInputHandler)
    handler.action('new-photo-back', this.returnPhotoHandler)
    handler.use(this.answerPublishUnknownHandler)

    return handler
  }

  private answerPublishInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = ctx.session.authorize!
    const newPhoto = ctx.scene.session.newPhoto!

    if (!isNewPhoto(newPhoto)) {
      throw new Error(`scene session newPhoto data malformed`)
    }

    const expire = await this.redisService.updatePhotoRateLimit(authorize.id)
    if (expire !== 0) {
      throw new Error(`photos limit allready exceed`)
    }

    newPhoto.groupTgMessageId = await postNewPhotoGroup(ctx, authorize, newPhoto)
    newPhoto.channelTgMessageId = await postNewPhotoChannel(ctx, authorize, newPhoto)

    ctx.wizard.next()

    if (typeof ctx.wizard.step === 'function') {
      return ctx.wizard.step(ctx, next)
    }
  }

  private answerPublishUnknownHandler: AppContextHandler = async (ctx) => {
    const newPhoto = ctx.scene.session.newPhoto!

    await replyNewPhotoPublish(ctx, newPhoto)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = ctx.session.authorize!
    const newPhoto = ctx.scene.session.newPhoto!

    if (!(
      isNewPhoto(newPhoto) &&
      newPhoto.groupTgMessageId != null &&
      newPhoto.channelTgMessageId != null
    )) {
      throw new Error(`scene session newPhoto data malformed`)
    }

    const photo = await this.postgresService.newPhoto(
      authorize.id,
      newPhoto.topicId,
      newPhoto.groupTgChatId,
      newPhoto.groupTgThreadId,
      newPhoto.groupTgMessageId,
      newPhoto.channelTgChatId,
      newPhoto.channelTgMessageId,
      newPhoto.tgFileId,
      newPhoto.description,
      ctx.from
    )

    delete ctx.scene.session.newPhoto

    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }

  private returnPhotoHandler: AppContextHandler = async (ctx) => {
    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }
}
