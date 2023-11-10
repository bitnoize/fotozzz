import { Context, Scenes, Markup } from 'telegraf'
import { AppOptions, AppContext } from '../interfaces/app.js'
import { BaseController } from './base.js'
import { logger } from '../logger.js'

export class MainController extends BaseController {
  scene: Scenes.BaseScene<AppContext>

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.BaseScene<AppContext>('main-scene')

    this.scene.enter(this.enterSceneHandler)

    this.scene.hears('Я уже в группе', this.checkGroupMemberHandler)
    this.scene.hears('Ссылка на группу', this.getInviteLinkHandler)

    this.scene.use(this.unknownCommandHandler)
    this.scene.use(Scenes.BaseScene.catch(this.exceptionHandler))
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    const { groupChatId } = this.options

    const chatMember = await ctx.telegram.getChatMember(groupChatId, ctx.from.id)

    if (chatMember.status === 'left') {
      await ctx.reply(
        'Похоже ты еще не в группе',
        Markup.keyboard([
          Markup.button.text('Я уже в группе'),
          Markup.button.text('Ссылка на группу')
        ])
        .resize()
      )
    } else {
      await ctx.reply(
        `Главное меню`,
        Markup.keyboard([
          Markup.button.text('Тест')
        ])
        .resize()
      )
    }
  }

  private leaveSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Выход из главного меню')
  }

  private getInviteLinkHandler = async (ctx: AppContext): Promise<void> => {
    const { groupChatId, groupLink } = this.options

    await ctx.reply(groupLink)
  }

  private checkGroupMemberHandler = async (ctx: AppContext): Promise<void> => {
    const { groupChatId } = this.options

    const member = await ctx.telegram.getChatMember(groupChatId, ctx.from.id)

    if (member.status === 'left') {
      await ctx.reply(
        'Похоже ты еще не в группе',
        Markup.keyboard([
          Markup.button.text('Я уже в группе'),
          Markup.button.text('Ссылка на группу')
        ]).resize()
      )
    } else {
      await ctx.reply(
        'Главное меню',
        Markup.keyboard([
          Markup.button.text('Тест')
        ])
        .resize()
      )
    }
  }

  private unknownCommandHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Не понял команду, используй меню!')
  }

  private exceptionHandler = async (
    error: unknown,
    ctx: AppContext
  ): Promise<void> => {
    if (error instanceof Error) {
      logger.error(`MainScene error: ${error.message}`)
    }

    await ctx.reply('Произошла ошибка, выход из сцены')

    await ctx.scene.leave()
  }
}
