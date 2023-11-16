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
    groupChatId,
    groupUrl,
    channelChatId,
    channelUrl
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
    redisUrl, // FIXME
    groupChatId,
    groupUrl,
    channelChatId,
    channelUrl
  })

  await app.start()
}

bootstrap().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.stack)
  }

  process.exit(1)
})
