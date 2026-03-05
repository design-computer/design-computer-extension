import { defineExtensionMessaging } from '@webext-core/messaging'

export interface PublishData {
  code: string
  language?: string
  chatId?: string
}

export interface PublishResult {
  url: string
}

export interface CheckStatusData {
  chatId: string
}

export interface CheckStatusResult {
  exists: boolean
}

export const { sendMessage, onMessage } = defineExtensionMessaging<{
  publish(data: PublishData): PublishResult
  checkStatus(data: CheckStatusData): CheckStatusResult
}>()
