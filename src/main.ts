import { config, loadConfig } from '@app-config/main'
import { RedisService } from './services/redis.js'
import { PostgresService } from './services/postgres.js'
import { App } from './app.js'

export const bootstrap = async (): Promise<void> => {
  await loadConfig()

  const {
    redisUrl,
    postgresUrl,
    botToken,
    useProxy,
    proxyUrl,
    groupChatId
  } = config

  RedisService.register({
    redisUrl
  })

  PostgresService.register({
    postgresUrl
  })

  const app = new App({
    botToken,
    useProxy,
    proxyUrl,
    redisUrl,
    groupChatId
  })

  await app.start()
}

bootstrap().catch((error) => {
  console.error(error.stack)

  process.exit(1)
})
