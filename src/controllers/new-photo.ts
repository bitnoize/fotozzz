import { Scenes, Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import {
  AppOptions,
  Controller,
  NewPhoto,
  Navigation,
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
  isNewPhoto,
  isPhotoSize,
  replyMainMenu,
  replyMainError,
  replyNewPhotoPhoto,
  replyNewPhotoTopics,
  replyNewPhotoConfirm
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
      //this.queryDescriptionHandler,
      //this.replyDescriptionComposer(),
      this.queryConfirmHandler,
      this.replyConfirmComposer(),
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
      ctx.wizard.next()

      return wizardNextStep(ctx, next)
    } else {
      await ctx.scene.leave()

      await replyMainMenu(ctx, authorize, navigation)
    }
  }

  private queryPhotoHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyNewPhotoPhoto(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyPhotoComposer = (): Composer<AppContext> => {
    const composer = new Composer<AppContext>()

    composer.action('new-photo-photo-back', this.replyReturnPhotoHandler)
    composer.on('photo', this.replyPhotoPhotoHandler)
    composer.use(this.replyPhotoUnknownHandler)

    return composer
  }

  private replyPhotoPhotoHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    if (ctx.has(message('photo'))) {
      const photo = ctx.message.photo

      const photoSize = photo.pop()

      if (isPhotoSize(photoSize)) {
        newPhoto.tgFileId = photoSize.file_id

        ctx.wizard.next()

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

    handler.action('new-photo-topic-back', this.replyReturnPhotoHandler)
    handler.action(/^new-photo-topic-(\d+)$/, this.replyTopicSelectHandler)
    handler.use(this.replyTopicUnknownHandler)

    return handler
  }

  private replyTopicSelectHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    const { groupChatId } = this.options

    const topics = await this.postgresService.getTopics(groupChatId)

    const topicId = parseInt(ctx.match[1])

    if (
      topicId != null &&
      typeof topicId === 'number' &&
      topics.map((topic) => topic.id).indexOf(topicId) != -1
    ) {
      newPhoto.topicId = topicId

      ctx.wizard.next()

      return wizardNextStep(ctx, next)
    } else {
      await replyNewPhotoTopics(ctx, authorize, navigation, topics)
    }
  }

  private replyTopicUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    const { groupChatId } = this.options

    const topics = await this.postgresService.getTopics(groupChatId)

    await replyNewPhotoTopics(ctx, authorize, navigation, topics)
  }

  private queryConfirmHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyNewPhotoConfirm(ctx, authorize, navigation)

    ctx.wizard.next()
  }

  private replyConfirmComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action('new-photo-confirm-back', this.replyReturnPhotoHandler)
    handler.action('new-photo-confirm-next', this.replyConfirmNextHandler)
    handler.use(this.replyConfirmUnknownHandler)

    return handler
  }

  private replyConfirmNextHandler: AppContextHandler = async (ctx, next) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    ctx.wizard.next()

    return wizardNextStep(ctx, next)
  }

  private replyConfirmUnknownHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)

    await replyNewPhotoConfirm(ctx, authorize, navigation)
  }

  private finishSceneHandler: AppContextHandler = async (ctx) => {
    const authorize = sureSessionAuthorize(ctx)
    const navigation = sureSessionNavigation(ctx)
    const newPhoto = sureSceneSessionNewPhoto(ctx)

    if (!isNewPhoto(newPhoto)) {
      throw new Error(`scene session newPhoto data malformed`)
    }

    //await this.postgresService.newPhoto(
    //  authorize.id,
    //  newPhoto.tgFileId
    //)

    await ctx.scene.leave()

    await ctx.scene.enter('photo')
  }

  private replyReturnPhotoHandler: AppContextHandler = async (ctx, next) => {
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
