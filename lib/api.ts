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

export interface AssetItem {
  id: string
  key: string
  filename: string
  mimeType: string
  size: number
  createdAt: string
  url: string
}

export async function getAssets(): Promise<AssetItem[]> {
  const res = await fetch(`${WEB_URL}/api/assets`, {
    credentials: 'include',
  })
  if (!res.ok) return []
  const data = (await res.json()) as { assets: AssetItem[] }
  return data.assets || []
}

export async function uploadAsset(
  filename: string,
  mimeType: string,
  dataBase64: string,
): Promise<{ id: string; key: string; url: string }> {
  // Reconstruct the file from base64 (messaging is JSON-serialized)
  const binary = atob(dataBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mimeType })

  const fd = new FormData()
  fd.append('file', blob, filename)

  const res = await fetch(`${WEB_URL}/api/assets/upload`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<{ id: string; key: string; url: string }>
}

export async function logout(): Promise<void> {
  await fetch(`${WEB_URL}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

export async function getSession(): Promise<SessionData> {
  const res = await fetch(`${WEB_URL}/api/auth/get-session`, {
    credentials: 'include',
  })

  if (!res.ok) return null

  const data = (await res.json().catch(() => null)) as {
    session?: unknown
    user?: NonNullable<SessionData>['user']
  } | null
  if (!data?.user) return null

  await localExtStorage.setItem('userId', data.user.id)

  return { user: data.user }
}
