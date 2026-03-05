import { localExtStorage } from '@webext-core/storage'

const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? 'https://api.curiosive.com'

export interface PublishResponse {
  slug: string
  url: string
}

export interface StatusResponse {
  exists: boolean
}

export async function checkStatus(chatId: string): Promise<StatusResponse> {
  const token = await localExtStorage.getItem<string>('authToken')

  const res = await fetch(`${WORKER_URL}/status?chatId=${encodeURIComponent(chatId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) return { exists: false }

  return res.json() as Promise<StatusResponse>
}

export async function publish(html: string, chatId?: string): Promise<PublishResponse> {
  const token = await localExtStorage.getItem<string>('authToken')

  const res = await fetch(`${WORKER_URL}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ html, ...(chatId ? { chatId } : {}) }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<PublishResponse>
}
