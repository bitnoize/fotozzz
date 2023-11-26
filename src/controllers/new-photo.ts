import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  AppContext,
  AppContextHandler,
  AppContextExceptionHandler
} from '../interfaces/app.js'
import { RedisService } from '../services/redis.js'
import { PostgresService } from '../services/postgres.js'
import {
  wizardNextStep,
  sureSessionAuthorize,
  sureSessionNavigation,
  initSceneSessionNewPhoto,
  sureSceneSessionNewPhoto,
  isNewPhotoPublish,
  isNewPhoto,
  isPhotoSize,
  isPhotoDescription,
  replyMainMenu,
  replyMainError,
  replyNewPhotoPhoto,
  replyNewPhotoTopics,
  replyNewPhotoDescription,
  replyNewPhotoDescriptionWrong,
  replyNewPhotoPublish,
  postNewPhotoGroup,
  postNewPhotoChannel
} from '../helpers/telegram.js'
import { logger } from '../logger.js'

export class NewPhotoController implements Controller {
  scene: Scenes.WizardScene<AppContext>

  private redisService = RedisService.instance()
  private postgresService = PostgresService.instance()

  constructor(private readonly options: AppOptions) {
    this.scene = new Scenes.WizardScene<AppContext>(
      'new-photo',
      this.startSceneHandler,
      this.queryPhotoHandler,
      this.replyPhotoComposer(),
      this.queryTopicHandler,
      this.replyTopicComposer(),
      this.queryDescriptionHandler,
      this.replyDescriptionComposer(),
      this.queryPublishHandler,
      this.replyPublishComposer(),
      this.finishSceneHandler
    )

    this.scene.use(Scenes.WizardScene.catch(this.exceptionHandler))
  }

  private startSceneHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    initSceneSessionNewPhoto(ctx)

    const allowedStatuses = ['active']
    if (allowedStatuses.includes(authorize.status)) {
      return wizardNextStep(ctx, next)
    }

    await ctx.scene.leave()

    await replyMainMenu(ctx, authorize, navigation)
  }

  private queryPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyNewPhotoPhoto(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyPhotoComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('photo', this.replyPhotoInputHandler)
    composer.action('new-photo-back', this.returnPhotoHandler)
    composer.use(this.replyPhotoUnknownHandler)

    return composer
  }

  private replyPhotoInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    if (ctx.has(message('photo'))) {
      const photo = ctx.message.photo

      const photoSize = photo.pop()

      if (isPhotoSize(photoSize)) {
        newPhoto.tgFileId = photoSize.file_id

        return wizardNextStep(ctx, next)
      } else {
        await replyNewPhotoPhoto(ctx, authorize, navigation)
      }
    }
  }

  private replyPhotoUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyNewPhotoPhoto(ctx, authorize, navigation)
  }

  private queryTopicHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    const { groupChatId } = this.options

    const topics = await this.postgresService.getTopics(groupChatId)

    await replyNewPhotoTopics(ctx, authorize, navigation, topics)

    ctx.wizard.next()
  }

  private replyTopicComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action(/^new-photo-topic-(\d+)$/, this.replyTopicInputHandler)
    handler.action('new-photo-back', this.returnPhotoHandler)
    handler.use(this.replyTopicUnknownHandler)

    return handler
  }

  private replyTopicInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

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
        newPhoto.channelTgChatId = channelChatId

        return wizardNextStep(ctx, next)
      }
    }

    await replyNewPhotoTopics(ctx, authorize, navigation, topics)
  }

  private replyTopicUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    const { groupChatId } = this.options

    const topics = await this.postgresService.getTopics(groupChatId)

    await replyNewPhotoTopics(ctx, authorize, navigation, topics)
  }

  private queryDescriptionHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyNewPhotoDescription(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyDescriptionComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.on('text', this.replyDescriptionInputHandler)
    composer.action('new-photo-back', this.returnPhotoHandler)
    composer.use(this.replyDescriptionUnknownHandler)

    return composer
  }

  private replyDescriptionInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    if (ctx.has(message('text'))) {
      const description = ctx.message.text

      if (isPhotoDescription(description)) {
        newPhoto.description = description

        return wizardNextStep(ctx, next)
      } else {
        await replyNewPhotoDescriptionWrong(ctx, authorize, navigation)
      }
    }
  }

  private replyDescriptionUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyNewPhotoDescription(ctx, authorize, navigation)
  }

  private queryPublishHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    if (!isNewPhotoPublish(newPhoto)) {
      throw new Error(`scene session newPhoto data malformed`)
    }

    await replyNewPhotoPublish(ctx, authorize, navigation, newPhoto)

    ctx.wizard.next()
  }

  private replyPublishComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action('new-photo-publish', this.replyPublishInputHandler)
    handler.action('new-photo-back', this.returnPhotoHandler)
    handler.use(this.replyPublishUnknownHandler)

    return handler
  }

  private replyPublishInputHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    if (!isNewPhotoPublish(newPhoto)) {
      throw new Error(`scene session newPhoto data malformed`)
    }

    newPhoto.groupTgMessageId = await postNewPhotoGroup(
      ctx,
      authorize,
      navigation,
      newPhoto
    )

    newPhoto.channelTgMessageId = await postNewPhotoChannel(
      ctx,
      authorize,
      navigation,
      newPhoto
    )

    return wizardNextStep(ctx, next)
  }

  private replyPublishUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    await replyNewPhotoPublish(ctx, authorize, navigation, newPhoto)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    if (!isNewPhoto(newPhoto)) {
      throw new Error(`scene session newPhoto data malformed`)
    }

    const photo = await this.postgresService.newPhoto(
      authorize.id,
      newPhoto.topicId,
      newPhoto.groupTgChatId,
      newPhoto.groupTgMessageId,
      newPhoto.channelTgChatId,
      newPhoto.channelTgMessageId,
      newPhoto.tgFileId,
      newPhoto.description,
      ctx.from
    )

    console.dir(photo)

    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }

  private returnPhotoHandler: AppContextHandler = async (ctx) => {
    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }

  private exceptionHandler: AppContextExceptionHandler = async (error, ctx) => {
    if (error instanceof Error) {
      logger.error(`NewPhotoScene error: ${error.message}`)
      console.error(error.stack)
      console.dir(ctx, { depth: 4 })
    }

    await ctx.scene.leave()

    await replyMainError(ctx)
  }
}
