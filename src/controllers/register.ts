import { Contect, Scenes, Telegraf } from 'telegraf'

export class RegisterController extends BaseController {
  private scene: Scenes.WizardScene

  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.WizardScene(
      'register',
      this.stepOne,
      this.stepTwo
    )
  }

  private stepOne = (ctx: Context): Promise<void> => {

    ctx.wizard.next()
  }

}





const stepOne = Telegraf.on('text', async (ctx) => {

})

const stepTwo = Telegraf.on('text', async (ctx) => {

  ctx.wizard.next()
})

const registerScene = new Scenes.WizardScene('register', stepOne, stepTwo)
