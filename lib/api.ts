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

export interface AssetsPage {
  assets: AssetItem[]
  // Opaque keyset cursor for the next page, or null when there are no more.
  nextCursor: string | null
}

export async function getAssets(params?: {
  cursor?: string | null
  limit?: number
}): Promise<AssetsPage> {
  const qs = new URLSearchParams()
  if (params?.limit != null) qs.set('limit', String(params.limit))
  if (params?.cursor) qs.set('cursor', params.cursor)
  const query = qs.toString()
  const res = await fetch(`${WEB_URL}/api/assets${query ? `?${query}` : ''}`, {
    credentials: 'include',
  })
  if (!res.ok) return { assets: [], nextCursor: null }
  const data = (await res.json()) as AssetsPage
  return { assets: data.assets || [], nextCursor: data.nextCursor ?? null }
}

export async function uploadAsset(
  filename: string,
  mimeType: string,
  dataBase64: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ id: string; key: string; url: string }> {
  // Reconstruct the file from base64 (messaging is JSON-serialized)
  const binary = atob(dataBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  // We need real upload progress, but the MV3 service worker has no
  // XMLHttpRequest (no upload.onprogress). Instead we hand-build the multipart
  // body and stream it through fetch, counting bytes as the network pulls each
  // chunk. The server still sees a normal `multipart/form-data` request, so the
  // upload route is unchanged. `duplex: 'half'` is required for a streamed body.
  const boundary = `----dcUpload${crypto.randomUUID().replace(/-/g, '')}`
  const enc = new TextEncoder()
  // The filename is quoted; escape quotes/newlines so a crafted name can't break
  // out of the header (defense in depth — names are already validated upstream).
  const safeName = filename.replace(/["\r\n]/g, '_')
  const head = enc.encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`,
  )
  const tail = enc.encode(`\r\n--${boundary}--\r\n`)
  const total = head.length + bytes.length + tail.length

  const CHUNK = 64 * 1024
  let loaded = 0
  let offset = 0
  let phase: 'head' | 'body' | 'tail' | 'done' = 'head'
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (phase === 'head') {
        controller.enqueue(head)
        loaded += head.length
        phase = 'body'
      } else if (phase === 'body') {
        if (offset < bytes.length) {
          const end = Math.min(offset + CHUNK, bytes.length)
          controller.enqueue(bytes.subarray(offset, end))
          loaded += end - offset
          offset = end
        } else {
          phase = 'tail'
        }
      } else if (phase === 'tail') {
        controller.enqueue(tail)
        loaded += tail.length
        phase = 'done'
      } else {
        controller.close()
        return
      }
      onProgress?.(loaded, total)
    },
  })

  let res: Response
  try {
    res = await fetch(`${WEB_URL}/api/assets/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
      // @ts-expect-error duplex is required for streamed request bodies but is
      // missing from the DOM RequestInit type in this TS version.
      duplex: 'half',
    })
  } catch {
    // Streamed request bodies need HTTP/2+ (and a fetch impl that supports
    // them). If the connection can't take a stream (e.g. an HTTP/1.1 dev
    // server), fall back to a plain multipart upload — no progress, but it
    // works. A real server response (4xx/5xx) is handled below, not here.
    const fd = new FormData()
    fd.append('file', new Blob([bytes], { type: mimeType }), filename)
    res = await fetch(`${WEB_URL}/api/assets/upload`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })
  }

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
  // Small variant for card/grid rendering; falls back to coverUrl when the
  // backend hasn't generated a thumbnail (e.g. covers from before thumbnails).
  coverThumbnailUrl: string | null
  category: string | null
  creatorName: string | null
  creatorAvatar: string | null
  isPublic: boolean
  isOwner: boolean
  bookmarkCount: number
  isBookmarked: boolean
}

// Cover URLs from the API are app-relative; make them absolute for the
// content-script context. The thumbnail falls back to the full cover so older
// covers (no thumbnail generated) still render.
function absolutizeCover(t: TemplateItem): TemplateItem {
  return {
    ...t,
    coverUrl: t.coverUrl ? `${WEB_URL}${t.coverUrl}` : null,
    coverThumbnailUrl: t.coverThumbnailUrl
      ? `${WEB_URL}${t.coverThumbnailUrl}`
      : t.coverUrl
        ? `${WEB_URL}${t.coverUrl}`
        : null,
  }
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
    merged.push(absolutizeCover(t))
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
  return absolutizeCover(template)
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
  return absolutizeCover(template)
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
