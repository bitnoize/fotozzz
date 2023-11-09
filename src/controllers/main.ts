import { Context, Scenes, Markup } from 'telegraf'
import { AppOptions, AppContext } from '../interfaces/app.js'
import { BaseController} from './base.js'
import { logger } from '../logger.js'

export class MainController extends BaseController {
  scene: Scenes.BaseScene<AppContext>

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.BaseScene('main-scene')

    this.scene.enter(this.enterSceneHandler)
    this.scene.leave(this.leaveSceneHandler)

    this.scene.command('start', this.startCommandHandler)
    this.scene.command('invite', this.inviteCommandHandler)
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Главная сцена')
  }

  private leaveSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Выход из главной сцены')
  }

  private inviteCommandHandler = async (ctx: AppContext): Promise<void> => {
    const user = ctx.session.user

    if (user === undefined) {
      throw new Error(`Session user lost`)
    }

    const inviteLink = await this.postgresService.getInviteLink(user.id)

    if (inviteLink === undefined) {
      await ctx.reply('Что-то пошло не так...')
    } else {
      await ctx.reply(inviteLink)
    }
  }

  private startCommandHandler = async (ctx: AppContext): Promise<void> => {
    const { groupChatId } = this.options

    const member = await ctx.telegram.getChatMember(groupChatId, ctx.from.id)

    if (member.status === 'left') {
      await ctx.reply(
        'Похоже, ты не вошел в группу',
        Markup.keyboard([
          Markup.button.text('/start'),
          Markup.button.text('/invite')
        ])
        .resize()
      )
    } else {
      await ctx.reply(
        'Ура, ты в группе!',
        Markup.keyboard([
          Markup.button.text('/start'),
        ])
        .resize()
      )
    }
  }
}
