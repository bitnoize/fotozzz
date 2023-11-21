import { TOPIC_STATUSES } from '../constants/topic.js'

export type TopicStatus = (typeof TOPIC_STATUSES)[number]

export interface Topic {
  id: number
  tgChatId: number
  tgThreadId: number
  name: string
  status: TopicStatus
  description: string
  createTime: Date
}
