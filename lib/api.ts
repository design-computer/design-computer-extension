import { localExtStorage } from '@webext-core/storage'
import type { SessionData } from './messaging'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://my.design.computer'

export interface PublishResponse {
  slug: string
  url: string
}

export interface StatusResponse {
  exists: boolean
}

export async function checkStatus(chatId: string): Promise<StatusResponse> {
  const res = await fetch(`${WEB_URL}/api/status?chatId=${encodeURIComponent(chatId)}`, {
    credentials: 'include',
  })

  if (!res.ok) return { exists: false }

  return res.json() as Promise<StatusResponse>
}

export async function publish(
  html: string,
  chatId?: string,
  chatUrl?: string,
  slug?: string,
  domain?: string,
): Promise<PublishResponse> {
  const res = await fetch(`${WEB_URL}/api/publish`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html,
      ...(chatId ? { chatId } : {}),
      ...(chatUrl ? { chatUrl } : {}),
      ...(slug ? { slug } : {}),
      ...(domain ? { domain } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<PublishResponse>
}

export async function getDomains(): Promise<{
  domains: { domain: string; type: 'burner' | 'vanity' }[]
  tier: string
}> {
  const res = await fetch(`${WEB_URL}/api/domains`, {
    credentials: 'include',
  })
  if (!res.ok) return { domains: [], tier: 'free' }
  return (await res.json()) as {
    domains: { domain: string; type: 'burner' | 'vanity' }[]
    tier: string
  }
}

export async function getProjects(): Promise<{ id: string; slug: string; domain: string }[]> {
  const res = await fetch(`${WEB_URL}/api/projects`, {
    credentials: 'include',
  })
  if (!res.ok) return []
  const data = (await res.json()) as { projects: { id: string; slug: string; domain: string }[] }
  return data.projects || []
}

export async function checkSlug(slug: string): Promise<{ available: boolean }> {
  const res = await fetch(`${WEB_URL}/api/check-slug?slug=${encodeURIComponent(slug)}`, {
    credentials: 'include',
  })
  if (!res.ok) return { available: false }
  return res.json() as Promise<{ available: boolean }>
}

export async function getSession(): Promise<SessionData> {
  const res = await fetch(`${WEB_URL}/api/auth/get-session`, {
    credentials: 'include',
  })

  if (!res.ok) return null

  const data = (await res.json()) as { session?: unknown; user?: NonNullable<SessionData>['user'] }
  if (!data.user) return null

  await localExtStorage.setItem('userId', data.user.id)

  return { user: data.user }
}
