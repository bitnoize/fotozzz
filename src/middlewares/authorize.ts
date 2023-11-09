import { AppContext } from '../interfaces/app.js'
import { PostgresService } from '../services/postgres.js'

export const authorize = async (ctx: AppContext, next: Function): Promise<void> => {
  const postgresService = PostgresService.instance()

  const user = await postgresService.authorizeUser(ctx.from.id)

  if (user === undefined) {
    await ctx.reply('Что-то пошло не так..')
  } else {
    if (user.status === 'banned') {
      await ctx.reply('Вы забанены!')
    } else {
      ctx.session.user = user

      await next()
    }
  }
}
