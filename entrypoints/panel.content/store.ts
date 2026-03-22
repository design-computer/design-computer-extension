import QRCode from 'qrcode'
import { create } from 'zustand'
import type { SessionData } from '@/lib/messaging'
import { sendMessage } from '@/lib/messaging'
import type {
  CodeData,
  DomainInfo,
  ErrorType,
  PublishState,
  SlugStatus,
  SuccessData,
} from './types'
import { DEFAULT_DOMAIN } from './types'
import { generateRandomSlug, getChatId } from './utils'

const QR_OPTIONS: QRCode.QRCodeToDataURLOptions = {
  width: 125,
  margin: 1,
  color: { dark: '#000000', light: '#F6F6F6' },
}

interface PanelState {
  // Auth
  session: NonNullable<SessionData> | null

  // Publish state
  publishState: PublishState
  slug: string
  slugStatus: SlugStatus
  errorMsg: string | null
  errorType: ErrorType
  codeData: CodeData | null

  // Published state
  publishedUrl: string
  qrDataUrl: string | null
  showQr: boolean
  copied: boolean

  // Domain picker
  domains: DomainInfo[]
  selectedDomain: string
  domainOpen: boolean
  userTier: string

  // Loading
  statusChecked: boolean

  // Actions
  setSession: (session: NonNullable<SessionData>) => void
  setSlug: (slug: string) => void
  setDomainOpen: (open: boolean) => void
  selectDomain: (domain: string) => void
  toggleQr: () => void
  copyUrl: () => void
  checkSlug: (slug: string) => void
  publish: (fireConfetti?: () => void) => Promise<void>
  init: (opts: { initialCode?: CodeData | null; initialSuccess?: SuccessData | null }) => void
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function classifyError(msg: string): ErrorType {
  const lower = msg.toLowerCase()
  if (lower.includes('free tier limit') || lower.includes('limit reached')) return 'free-limit'
  if (lower.includes('domain') || lower.includes('taken') || lower.includes('already'))
    return 'domain-taken'
  return 'generic'
}

async function generateQr(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, QR_OPTIONS)
  } catch {
    return null
  }
}

export const usePanelStore = create<PanelState>((set, get) => ({
  session: null,
  publishState: 'idle',
  slug: '',
  slugStatus: 'idle',
  errorMsg: null,
  errorType: 'generic',
  codeData: null,
  publishedUrl: '',
  qrDataUrl: null,
  showQr: false,
  copied: false,
  domains: [{ domain: DEFAULT_DOMAIN, type: 'burner' }],
  selectedDomain: DEFAULT_DOMAIN,
  domainOpen: false,
  userTier: 'free',
  statusChecked: true,

  setSession: (session) => set({ session }),
  setSlug: (slug) => set({ slug }),
  setDomainOpen: (open) => set({ domainOpen: open }),
  selectDomain: (domain) => set({ selectedDomain: domain, domainOpen: false }),
  toggleQr: () => set((s) => ({ showQr: !s.showQr })),

  copyUrl: async () => {
    try {
      await navigator.clipboard.writeText(get().publishedUrl)
      set({ copied: true })
      setTimeout(() => set({ copied: false }), 3000)
    } catch {}
  },

  checkSlug: (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    set({ slug: sanitized, slugStatus: 'idle', publishState: 'idle', errorMsg: null })
    if (debounceTimer) clearTimeout(debounceTimer)
    if (sanitized.length < 2) return
    set({ slugStatus: 'checking' })
    debounceTimer = setTimeout(async () => {
      try {
        const result = await sendMessage('checkSlug', { slug: sanitized })
        set({ slugStatus: result.available ? 'available' : 'taken' })
      } catch {
        set({ slugStatus: 'idle' })
      }
    }, 500)
  },

  publish: async (fireConfetti) => {
    const { publishState, slugStatus, codeData, slug, selectedDomain } = get()
    if (publishState === 'publishing' || slugStatus === 'taken') return
    set({ publishState: 'publishing', errorMsg: null })

    try {
      let code = codeData?.code || ''
      const language = codeData?.language || 'html'

      if (!code) {
        const selectors = ['.code-block__code', 'pre code', '.cm-content', 'code', 'pre']
        for (const sel of selectors) {
          const el = document.querySelector(sel)
          if (el?.textContent?.trim()) {
            code = el.textContent.trim()
            break
          }
        }
      }

      if (!code) {
        set({ errorMsg: 'No code found on page', errorType: 'generic', publishState: 'error' })
        return
      }

      const chatId = codeData?.chatId || getChatId()
      const chatUrl = codeData?.chatUrl || location.href

      const result = await sendMessage('publish', {
        code,
        language,
        chatId,
        chatUrl,
        slug: slug || undefined,
        domain: selectedDomain,
      })

      const publishedSlug = result.url.match(/https?:\/\/([^.]+)\./)?.[1] || ''
      const qrDataUrl = await generateQr(result.url)

      set({
        slug: publishedSlug,
        publishedUrl: result.url,
        publishState: 'published',
        slugStatus: 'idle',
        qrDataUrl,
      })

      fireConfetti?.()
      document.dispatchEvent(new CustomEvent('__dc_published'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed'
      set({
        errorType: classifyError(msg),
        errorMsg: msg,
        slugStatus: 'idle',
        publishState: 'error',
      })
    }
  },

  init: async ({ initialCode, initialSuccess }) => {
    const needsStatusCheck = !initialSuccess && !initialCode

    set({
      publishState: initialSuccess ? 'published' : 'idle',
      slug: initialSuccess?.slug || (initialCode ? generateRandomSlug() : ''),
      codeData: initialCode ?? null,
      publishedUrl: initialSuccess?.url || '',
      statusChecked: !needsStatusCheck,
    })

    // Fetch domains
    sendMessage('getDomains', undefined)
      .then((result) => {
        if (result.domains.length > 0) {
          set({ domains: result.domains, selectedDomain: result.domains[0].domain })
        }
        set({ userTier: result.tier })
      })
      .catch(() => {})

    // Generate QR for initial success
    if (initialSuccess?.url) {
      const qrDataUrl = await generateQr(initialSuccess.url)
      set({ qrDataUrl })
    }

    // Check initial slug availability
    const slug = initialSuccess?.slug || (initialCode ? get().slug : '')
    if (slug.length >= 2) {
      set({ slugStatus: 'checking' })
      sendMessage('checkSlug', { slug })
        .then((r) => set({ slugStatus: r.available ? 'available' : 'taken' }))
        .catch(() => set({ slugStatus: 'idle' }))
    }

    // Check existing project for this chat
    if (needsStatusCheck) {
      const chatId = getChatId()
      if (chatId) {
        sendMessage('checkStatus', { chatId })
          .then(async (status) => {
            if (status.exists && status.slug) {
              const domain = status.domain || DEFAULT_DOMAIN
              const url = `https://${status.slug}.${domain}`
              const qrDataUrl = await generateQr(url)
              set({
                slug: status.slug,
                selectedDomain: domain,
                publishedUrl: url,
                publishState: 'published',
                qrDataUrl,
              })
            }
          })
          .catch(() => {})
          .finally(() => set({ statusChecked: true }))
      }
    }
  },
}))
