import type { SessionData } from '../../lib/messaging'

export const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://my.design.computer'
export const DEFAULT_DOMAIN = 'wip.page'

export interface DomainInfo {
  domain: string
  type: 'burner' | 'vanity'
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

export type PublishState = 'idle' | 'publishing' | 'published' | 'error'
export type ErrorType = 'free-limit' | 'domain-taken' | 'generic'
export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'
