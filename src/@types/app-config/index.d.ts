import '@app-config/main'

export interface Config {
  redisUrl: string
  postgresUrl: string
  botToken: string
  useProxy: boolean
  proxyUrl: string
  groupChatId: number
  groupUrl: string
  channelChatId: number
  channelUrl: string
}

declare module '@app-config/main' {
  /* eslint-disable @typescript-eslint/no-empty-interface */
  export interface ExportedConfig extends Config {}
}
