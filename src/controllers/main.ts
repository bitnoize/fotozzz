import { Context, Scenes, Markup } from 'telegraf'
import { AppOptions, AppContext } from '../interfaces/app.js'
import { BaseController } from './base.js'
import { logger } from '../logger.js'

export class MainController extends BaseController {
  scene: Scenes.BaseScene<AppContext>

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.BaseScene('main-scene')

    this.scene.enter(this.enterSceneHandler)
    this.scene.leave(this.leaveSceneHandler)

    this.scene.hears('Я уже в группе', this.checkGroupMemberHandler)
    this.scene.hears('Ссылка на группу', this.getInviteLinkHandler)
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Главное меню')
  }

  private leaveSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Выход из главного меню')
  }

  private getInviteLinkHandler = async (ctx: AppContext): Promise<void> => {
    const { groupChatId } = this.options

    const chat = await ctx.telegram.getChat(groupChatId)
    console.log(chat)

    await ctx.reply('BLABLA')
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
        'Ура, ты в группе!',
        Markup.keyboard([
          Markup.button.text('/profile')
        ])
        .resize()
      )
    }
  }
}
