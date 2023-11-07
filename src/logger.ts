import { format, transports, createLogger } from 'winston'

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.json(),
  transports: [new transports.Console()]
})
