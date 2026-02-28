import { defineExtensionMessaging } from '@webext-core/messaging'

export interface PublishData {
  code: string
  language?: string
}

export interface PublishResult {
  url: string
}

export const { sendMessage, onMessage } = defineExtensionMessaging<{
  publish(data: PublishData): PublishResult
}>()
