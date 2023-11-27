import { RATE_VALUES } from '../constants/rate.js'

export type RateValue = (typeof RATE_VALUES)[number]

export interface Rate {
  id: number
  userId: number
  topicId: number
  photoId: number
  value: RateValue
  createTime: Date
}

export interface RateAgg {
  count: number
  value: string
}
