import { ContextMessageUpdate } from 'telegraf'
import { PostgresService } from '../services/postgres.js'

export const authorize = async (ctx: ContextMessageUpdate, next: Function) => {
  const postgresService = PostgresService.instance()

  const user = await postgresService.authorizeUser(ctx.from.id)

  if (user === undefined) {
    await ctx.reply('Что-то пошло не так..')
  } else {
    if (user.status === 'banned') {
      await ctx.reply('Вы забанены!')
    } else {
      ctx.session.user = user

      return next()
    }
  }
}
