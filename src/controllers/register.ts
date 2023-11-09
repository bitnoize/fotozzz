import { Scenes, Composer, Markup } from 'telegraf'
import { AppOptions, AppContext } from '../interfaces/app.js'
import { UserGender } from '../interfaces/user.js'
import { BaseController} from './base.js'
import { logger } from '../logger.js'

export class RegisterController extends BaseController {
  scene: Scenes.WizardScene<AppContext>

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene(
      'register-scene',
      this.queryNickHandler,
      this.replyNickComposer(),
      this.queryGenderHandler,
      this.replyGenderComposer(),
      this.queryAvatarHandler,
      this.replyAvatarComposer(),
      this.queryAboutHandler,
      this.replyAboutComposer(),
      this.completeHandler
    )

    //this.scene.enter(this.enterSceneHandler)
    //this.scene.leave(this.leaveSceneHandler)
  }

  private enterSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Ответь на несколько вопросов, чтобы пройти регистрацию')
  }

  private leaveSceneHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Регистрация окончена, спасибо!')
  }

  private queryNickHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Выбери ник')
    ctx.wizard.next()
  }

  private replyNickComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyNickTextHandler)
    handler.use(this.replyNickUnknownHandler)

    return handler
  }

  private replyNickTextHandler = async (
    ctx: AppContext
  ): Promise<Scenes.WizardContextWizard<AppContext> | undefined> => {
    const text = ctx.message.text

    if (text != null && text.match(/^[a-z0-9_]{4,20}$/i)) {
      const nick = text.toLowerCase()

      const check = await this.postgresService.checkUserNick(nick)

      if (check !== undefined) {
        if (check) {
          ctx.scene.state.nick = nick

          return ctx.wizard.next()
        } else {
          await ctx.reply('Этот ник уже используется, выбери другой')
        }
      } else {
        await ctx.reply('Что-то пошло не так, попробуй еще раз')
      }
    } else {
      await ctx.reply('Неверный ввод, используй латинские буквы и цифры, 4-20 символов')
    }
  }

  private replyNickUnknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Используй обычное текстовое сообщение!')
  }

  private queryGenderHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply(
      'Укажи пол',
      Markup.inlineKeyboard([
        Markup.button.callback('Мужской', 'male'),
        Markup.button.callback('Женский', 'female'),
        Markup.button.callback('Пара', 'couple')
      ])
    )
    ctx.wizard.next()
  }

  private replyGenderComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.action('male', this.replyGenderMaleHandler)
    handler.action('female', this.replyGenderFemaleHandler)
    handler.action('couple', this.replyGenderCoupleHandler)
    handler.use(this.replyGenderUnknownHandler)

    return handler
  }

  private replyGenderMaleHandler = async (
    ctx: AppContext
  ): Promise<Scenes.WizardContextWizard<AppContext> | undefined> => {
    ctx.scene.state.gender = 'male';
    return ctx.wizard.next()
  }

  private replyGenderFemaleHandler = async (
    ctx: AppContext
  ): Promise<Scenes.WizardContextWizard<AppContext> | undefined> => {
    ctx.scene.state.gender = 'female';
    return ctx.wizard.next()
  }

  private replyGenderCoupleHandler = async (
    ctx: AppContext
  ): Promise<Scenes.WizardContextWizard<AppContext> | undefined> => {
    ctx.scene.state.gender = 'couple';
    return ctx.wizard.next()
  }

  private replyGenderUnknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Используй кнопки в предыдущем сообщении!')
  }

  private queryAvatarHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Загрузи аватар')
    ctx.wizard.next()
  }

  private replyAvatarComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('photo', this.replyAvatarPhotoHandler)
    handler.use(this.replyAvatarUnknownHandler)

    return handler
  }

  private replyAvatarPhotoHandler = async (
    ctx: AppContext
  ): Promise<Scenes.WizardContextWizard<AppContext> | undefined> => {
    const photo = ctx.message.photo

    if (photo != null && Array.isArray(photo)) {
      const photoBest = photo.pop()

      if (photoBest != null && photoBest['file_id'] != null) {
        ctx.scene.state.avatar = photoBest['file_id']

        return ctx.wizard.next()
      } else {
        await ctx.reply(`Плохая картинка!`)
      }
    } else {
      await ctx.reply(`Плохая картинка!`)
    }
  }

  private replyAvatarUnknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Запости картинку!')
  }

  private queryAboutHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Расскажи о себе')
    ctx.wizard.next()
  }

  private replyAboutComposer = (): Composer<AppContext> => {
    const handler = new Composer<AppContext>()

    handler.on('text', this.replyAboutTextHandler)
    handler.use(this.replyAboutUnknownHandler)

    return handler
  }

  private replyAboutTextHandler = async (
    ctx: AppContext
  ): Promise<Scenes.WizardContextWizard<AppContext> | undefined> => {
    const text = ctx.message.text

    if (text != null && text.length >= 3 && text.length <= 300) {
      ctx.scene.state.about = text
        
      return ctx.wizard.next()
    } else {
      await ctx.reply(`Неверный ввод, используй 3-300 символов`)
    }
  }

  private replyAboutUnknownHandler = async (ctx: AppContext): Promise<void> => {
    await ctx.reply('Используй обычное текстовое сообщение!')
  }

  private completeHandler = async (ctx: AppContext): Promise<void> => {
    const { groupChatId } = this.options

    const state = ctx.scene.state
    const user = ctx.session.user

    if (state === undefined) {
      throw new Error(`Scene state lost`)
    }

    if (user === undefined) {
      throw new Error(`Session user lost`)
    }

    if (
      state.nick == null ||
        state.gender == null ||
        state.avatar == null ||
        state.about == null
    ) {
      await ctx.reply('Данные потерялись, начинаем сцену заново')

      await ctx.scene.leave()
      await ctx.scene.enter('register-scene')
    } else {
      const chatInvite = await ctx.telegram.createChatInviteLink(
        groupChatId,
        {
          'member_limit': 1
        }
      )

      await this.postgresService.activateUser(
        user.id,
        state.nick,
        state.gender as UserGender,
        state.avatar,
        state.about,
        chatInvite['invite_link']
      )

      await ctx.scene.leave()
      await ctx.scene.enter('main-scene')
    }
  }
}
