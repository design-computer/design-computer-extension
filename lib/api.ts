import { localExtStorage } from '@webext-core/storage'
import type { CreateTemplateData, SessionData, UpdateTemplateData } from './messaging'
import { WEB_URL } from './config'

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

export interface TemplateItem {
  id: string
  slug: string
  name: string
  description: string
  content: string
  coverUrl: string | null
  category: string | null
  creatorName: string | null
  creatorAvatar: string | null
  isPublic: boolean
  isOwner: boolean
  bookmarkCount: number
  isBookmarked: boolean
}

export async function getTemplates(): Promise<TemplateItem[]> {
  // Fetch the user's own templates + the public community ones, merge (mine first), dedupe.
  const [mineRes, publicRes] = await Promise.all([
    fetch(`${WEB_URL}/api/templates`, { credentials: 'include' }),
    fetch(`${WEB_URL}/api/templates?scope=public`, { credentials: 'include' }),
  ])

  const mine = mineRes.ok ? ((await mineRes.json()) as { templates: TemplateItem[] }).templates : []
  const community = publicRes.ok
    ? ((await publicRes.json()) as { templates: TemplateItem[] }).templates
    : []

  const seen = new Set<string>()
  const merged: TemplateItem[] = []
  for (const t of [...mine, ...community]) {
    if (seen.has(t.id)) continue
    seen.add(t.id)
    // Cover URLs are app-relative; make them absolute for the content-script context.
    merged.push({
      ...t,
      coverUrl: t.coverUrl ? `${WEB_URL}${t.coverUrl}` : null,
    })
  }
  return merged
}

// Create a template. POSTs multipart/form-data to match the web API, which
// runs the cover image through Cloudflare Images → WebP into R2.
export async function createTemplate(data: CreateTemplateData): Promise<TemplateItem> {
  const fd = new FormData()
  fd.append('name', data.name)
  fd.append('description', data.description)
  fd.append('content', data.content)
  fd.append('isPublic', String(data.isPublic))
  if (data.category) fd.append('category', data.category)

  if (data.cover) {
    // Reconstruct the file from base64 (messaging is JSON-serialized).
    const binary = atob(data.cover.dataBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    fd.append('cover', new Blob([bytes], { type: data.cover.mimeType }), data.cover.filename)
  }

  const res = await fetch(`${WEB_URL}/api/templates`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  const { template } = (await res.json()) as { template: TemplateItem }
  // Cover URL is app-relative; make it absolute for the content-script context.
  return { ...template, coverUrl: template.coverUrl ? `${WEB_URL}${template.coverUrl}` : null }
}

// Update an existing template (owner only). Same multipart shape as create,
// plus `removeCover` to drop the cover when no new one is supplied.
export async function updateTemplate(data: UpdateTemplateData): Promise<TemplateItem> {
  const fd = new FormData()
  fd.append('name', data.name)
  fd.append('description', data.description)
  fd.append('content', data.content)
  fd.append('isPublic', String(data.isPublic))
  if (data.category) fd.append('category', data.category)
  if (data.removeCover) fd.append('removeCover', 'true')

  if (data.cover) {
    const binary = atob(data.cover.dataBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    fd.append('cover', new Blob([bytes], { type: data.cover.mimeType }), data.cover.filename)
  }

  const res = await fetch(`${WEB_URL}/api/templates/${data.slug}`, {
    method: 'PUT',
    credentials: 'include',
    body: fd,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  const { template } = (await res.json()) as { template: TemplateItem }
  return { ...template, coverUrl: template.coverUrl ? `${WEB_URL}${template.coverUrl}` : null }
}

// Bookmark / unbookmark a template. Returns the server's canonical bookmark count.
export async function toggleBookmark(
  slug: string,
  bookmark: boolean,
): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  const res = await fetch(`${WEB_URL}/api/templates/${slug}/bookmark`, {
    method: bookmark ? 'POST' : 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`toggleBookmark failed: ${res.status}`)
  return (await res.json()) as { bookmarked: boolean; bookmarkCount: number }
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
