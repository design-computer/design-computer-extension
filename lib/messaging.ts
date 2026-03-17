import { defineExtensionMessaging } from '@webext-core/messaging'

export interface PublishData {
  code: string
  language?: string
  chatId?: string
  chatUrl?: string
  slug?: string
  domain?: string
}

export interface PublishResult {
  url: string
}

export interface CheckStatusData {
  chatId: string
}

export interface CheckStatusResult {
  exists: boolean
  slug?: string
  domain?: string
}

export type SessionData = {
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
} | null

export interface CheckSlugData {
  slug: string
}

export interface CheckSlugResult {
  available: boolean
}

export interface ProjectItem {
  id: string
  slug: string
  domain: string
}

export const { sendMessage, onMessage } = defineExtensionMessaging<{
  publish(data: PublishData): PublishResult
  checkStatus(data: CheckStatusData): CheckStatusResult
  checkSlug(data: CheckSlugData): CheckSlugResult
  getSession(data: void): SessionData
  getProjects(data: void): ProjectItem[]
  getDomains(data: void): { domain: string; type: 'burner' | 'vanity' }[]
  grantPermissions(data: { origins: string[] }): boolean
  getPanelData(data: void): {
    session: SessionData
    status: CheckStatusResult | null
    chatId: string | null
  }
}>()
