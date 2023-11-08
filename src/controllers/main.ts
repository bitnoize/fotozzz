import { ContextMessageUpdate, Scenes } from 'telegraf'
import { AppOptions } from './interfaces/app.js'
import { BaseController} from './base.js'
import { logger } from './logger.js'

export class MainController extends BaseController {
  constructor(options: AppOptions) {
    super(options)

    this.scene = new Scenes.BaseScene('main-scene')
  }
}
