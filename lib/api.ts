import { localExtStorage } from '@webext-core/storage'
import type { SessionData } from './messaging'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://getdesignapp.ugurkellecioglu.com'

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
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<PublishResponse>
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
