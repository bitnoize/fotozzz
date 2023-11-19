import { TOPIC_STATUSES } from '../constants/topic.js'

export type TopicStatus = (typeof TOPIC_STATUSES)[number]

export interface Topic {
  id: number
  tgId: string
  name: string
  status: TopicStatus
  description: string
  createTime: Date
}
