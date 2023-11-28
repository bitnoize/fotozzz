import { Redis } from 'ioredis'
import { RedisServiceOptions } from '../interfaces/redis.js'
import { logger } from '../logger.js'

export class RedisService {
  private redis: Redis

  constructor(private readonly options: RedisServiceOptions) {
    const { redisUrl } = this.options

    this.redis = new Redis(redisUrl)

    this.redis.defineCommand('checkPhotoRateLimit', {
      numberOfKeys: 1,
      lua: this.checkPhotoRateLimitLua
    })

    this.redis.defineCommand('updatePhotoRateLimit', {
      numberOfKeys: 1,
      lua: this.updatePhotoRateLimitLua
    })

    logger.info(`RedisService initialized`)
  }

  private static _instance: RedisService | undefined

  static register(options: RedisServiceOptions) {
    if (this._instance !== undefined) {
      throw new Error(`RedisService object allready registered`)
    }

    this._instance = new RedisService(options)
  }

  static instance(): RedisService {
    if (this._instance === undefined) {
      throw new Error(`RedisService object does not registered`)
    }

    return this._instance
  }

  async checkPhotoRateLimit(userId: number): Promise<number> {
    const photoRateLimitKey = `photo_rate_limit:${userId}`

    const leftTime = await this.redis.checkPhotoRateLimit(photoRateLimitKey)
    return parseInt(leftTime)
  }

  async updatePhotoRateLimit(userId: number): Promise<number> {
    const photoRateLimitKey = `photo_rate_limit:${userId}`

    const leftTime = await this.redis.updatePhotoRateLimit(photoRateLimitKey)
    return parseInt(leftTime)
  }

  private readonly checkPhotoRateLimitLua = `
local counter = tonumber(redis.call('GET', KEYS[1])) or 0

if counter >= 3 then
  return redis.call('PEXPIRETIME', KEYS[1])
else
  return 0
end
`

  private readonly updatePhotoRateLimitLua = `
local counter = tonumber(redis.call('INCR', KEYS[1]))

if counter == 1 then
  redis.call('PEXPIRE', KEYS[1], 24 * 60 * 60 * 1000)
  return 0
elseif counter > 3 then
  return redis.call('PEXPIRETIME', KEYS[1])
else
  return 0
end
`
}
