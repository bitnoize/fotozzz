import { Result, Callback } from 'ioredis'

declare module 'ioredis' {
  interface RedisCommander<Context> {
    checkPhotoRateLimit(
      photoRateLimitKey: string,
      callback?: Callback<string>
    ): Result<string, Context>
  }

  interface RedisCommander<Context> {
    updatePhotoRateLimit(
      photoRateLimitKey: string,
      callback?: Callback<string>
    ): Result<string, Context>
  }
}

