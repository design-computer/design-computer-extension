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

export interface CodeData {
  code: string
  language: string
  chatId?: string
  chatUrl?: string
}

export interface SuccessData {
  slug: string
  url: string
  session?: SessionData
}

export interface AssetItem {
  id: string
  key: string
  filename: string
  mimeType: string
  size: number
  createdAt: string
  url: string
}

export interface UploadAssetData {
  filename: string
  mimeType: string
  // base64-encoded file bytes (chrome.runtime messaging is JSON-serialized,
  // so File/Blob/ArrayBuffer cannot be passed directly)
  dataBase64: string
}

export interface UploadAssetResult {
  id: string
  key: string
  url: string
}

export const { sendMessage, onMessage } = defineExtensionMessaging<{
  publish(data: PublishData): PublishResult
  checkStatus(data: CheckStatusData): CheckStatusResult
  checkSlug(data: CheckSlugData): CheckSlugResult
  getSession(data: void): SessionData
  getProjects(data: void): ProjectItem[]
  getDomains(data: void): { domains: { domain: string; type: 'burner' | 'vanity' }[]; tier: string }
  getAssets(data: void): AssetItem[]
  uploadAsset(data: UploadAssetData): UploadAssetResult
  grantPermissions(data: { origins: string[] }): boolean
  logout(data: void): void
  openPanelWithCode(data: CodeData): void
  openPanelWithSuccess(data: SuccessData): void
  registerContentScripts(data: void): void
  togglePanel(data: { session?: SessionData }): void
}>()
