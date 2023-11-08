import { Context, Scenes, Telegraf } from 'telegraf'
import { AppOptions } from './interfaces/app.js'
import { BaseController} from './base.js'
import { logger } from './logger.js'

export class RegisterController extends BaseController {
  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene(
      'register-wizard',
      this.stepOneHandler,
      this.stepTwoHandler,
      this.stepThreeHandler,
      this.stepFourHandler,
      this.stepFiveHandler
    )
  }

  private stepOneHandler = async (ctx: Context): Promise<void> => {
    await ctx.reply('Выбери ник')

    await ctx.wizard.next()
  }

  private stepTwoHandler = async (ctx: Context): Promise<void> => {
    const text = ctx.message.text

    if (text != null && text.match(/^[a-z0-9_]{4,20}$/)) {
      const check = await this.postgresService.checkUserNick(text)

      if (check !== undefined) {
        if (check) {
          ctx.scene.state.registerNick = text;
          
          await ctx.reply('Укажи пол')
          await ctx.wizard.next()
        } else {
          await ctx.reply('Этот ник уже используется')
        }
      } else {
        await ctx.reply('Что-то пошло не так..')
      }
    } else {
      await ctx.reply('Неверный ввод')
    }
  }

  private stepThreeHandler = async (ctx: Context): Promise<void> => {
    const text = ctx.message.text

    if (text != null) {
      ctx.scene.state.registerGender = text;
        
      await ctx.reply('Загрузи аватар') 
      await ctx.wizard.next()
    } else {
      await ctx.reply('Неверный ввод')
    }
  }

  private stepFourHandler = async (ctx: Context): Promise<void> => {
    await ctx.reply('Расскажи о себе')

    await ctx.wizard.next()
  }

  private stepFiveHandler = async (ctx: Context): Promise<void> => {
    const text = ctx.message.text

    if (text != null && text.length >= 3 && text.length <= 300) {
      ctx.scene.state.registerAbout = text;
        
      await ctx.reply('Спасибо!')

      const state = ctx.scene.state
      const user = ctx.session.user

      this.postgresService.activateUser(
        user.id,
        state.registerNick,
        state.registerAbout
      )
    
      await ctx.scene.enter('main-scene')
    } else {
      await ctx.reply('Неверный ввод')
    }
  }
}
