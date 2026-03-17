import './style.css'
import ReactDOM from 'react-dom/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sendMessage } from '../../lib/messaging'
import type { SessionData } from '../../lib/messaging'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import QRCode from 'qrcode'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://my.design.computer'
const DEFAULT_DOMAIN = 'wip.page'

interface DomainInfo {
  domain: string
  type: 'burner' | 'vanity'
}

// ── Icons ────────────────────────────────────────────────────────────────────

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <circle cx="10" cy="10" r="7.5" stroke="#999" strokeWidth="1.2" />
    <ellipse cx="10" cy="10" rx="3.5" ry="7.5" stroke="#999" strokeWidth="1.2" />
    <path d="M3 7.5h14M3 12.5h14" stroke="#999" strokeWidth="1.2" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <path
      d="M6 8l4 4 4-4"
      stroke="#999"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <path
      d="M5.8335 5.83337L14.1668 14.1667"
      stroke="#999999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.1668 5.83337V14.1667H5.8335"
      stroke="#999999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SpinnerIcon = ({ spin = false }: { spin?: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    className={`shrink-0 ${spin ? 'animate-dc-spin' : ''}`}
  >
    <g clipPath="url(#clip0_spinner)">
      <path
        d="M10 1.66663V4.99996"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.49992L15.9167 4.08325"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 10H18.3333"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 13.5001L15.9167 15.9168"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 15V18.3333"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.0835 15.9168L6.50016 13.5001"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.6665 10H4.99984"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.0835 4.08325L6.50016 6.49992"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_spinner">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const SadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <g clipPath="url(#clip0_sad)">
      <path
        d="M9.99984 18.3333C14.6022 18.3333 18.3332 14.6023 18.3332 9.99996C18.3332 5.39759 14.6022 1.66663 9.99984 1.66663C5.39746 1.66663 1.6665 5.39759 1.6665 9.99996C1.6665 14.6023 5.39746 18.3333 9.99984 18.3333Z"
        stroke="#C20000"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.3332 13.3333C13.3332 13.3333 12.0832 11.6666 9.99984 11.6666C7.9165 11.6666 6.6665 13.3333 6.6665 13.3333"
        stroke="#C20000"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 7.5H7.50833"
        stroke="#C20000"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.5H12.5083"
        stroke="#C20000"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_sad">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const SmileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <g clipPath="url(#clip0_smile)">
      <path
        d="M9.99984 18.3333C14.6022 18.3333 18.3332 14.6023 18.3332 9.99996C18.3332 5.39759 14.6022 1.66663 9.99984 1.66663C5.39746 1.66663 1.6665 5.39759 1.6665 9.99996C1.6665 14.6023 5.39746 18.3333 9.99984 18.3333Z"
        stroke="#00C274"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.6665 11.6666C6.6665 11.6666 7.9165 13.3333 9.99984 13.3333C12.0832 13.3333 13.3332 11.6666 13.3332 11.6666"
        stroke="#00C274"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 7.5H7.50833"
        stroke="#00C274"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.5H12.5083"
        stroke="#00C274"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_smile">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <rect x="7" y="7" width="9" height="9" rx="1.5" stroke="#999" strokeWidth="1.2" />
    <path
      d="M13 7V5.5A1.5 1.5 0 0011.5 4h-7A1.5 1.5 0 003 5.5v7A1.5 1.5 0 005.5 14H7"
      stroke="#999"
      strokeWidth="1.2"
    />
  </svg>
)

const QrIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <rect x="3" y="3" width="5.5" height="5.5" rx="1" stroke="#999" strokeWidth="1.2" />
    <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" stroke="#999" strokeWidth="1.2" />
    <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" stroke="#999" strokeWidth="1.2" />
    <rect x="12" y="12" width="2" height="2" fill="#999" />
    <rect x="15.5" y="12" width="2" height="2" fill="#999" />
    <rect x="12" y="15.5" width="2" height="2" fill="#999" />
    <rect x="15.5" y="15.5" width="2" height="2" fill="#999" />
  </svg>
)

// ── Components ───────────────────────────────────────────────────────────────

function LoggedOutView({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative m-4 w-[280px] bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] p-1.5 flex flex-col gap-3 overflow-hidden font-sans">
      <div className="flex items-center p-1.5">
        <div className="w-6 h-6 rounded-[20px] bg-gradient-to-b from-white to-[#999]" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 px-1.5">
          <p className="text-sm font-medium text-muted tracking-[-0.01em] leading-[18px]">
            Welcome
          </p>
          <p className="text-lg font-medium text-black tracking-[-0.01em] leading-6">
            Connect your account and start generating.
          </p>
        </div>
        <button
          className="w-full bg-black text-white border-none rounded-[14px] py-2 px-4 text-sm font-medium tracking-[-0.01em] leading-6 text-center cursor-pointer"
          onClick={() => {
            window.open(`${WEB_URL}/login`, '_blank')
            onClose()
          }}
        >
          Connect
        </button>
      </div>
    </div>
  )
}

// ── Logged In ────────────────────────────────────────────────────────────────

type PublishState = 'idle' | 'publishing' | 'published' | 'error'
type ErrorType = 'free-limit' | 'domain-taken' | 'generic'
type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'

function LoggedInView({
  session,
  onClose,
}: {
  session: NonNullable<SessionData>
  onClose: () => void
}) {
  const [publishState, setPublishState] = useState<PublishState>('idle')
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<ErrorType>('generic')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [domainOpen, setDomainOpen] = useState(false)
  const [domains, setDomains] = useState<DomainInfo[]>([{ domain: DEFAULT_DOMAIN, type: 'burner' }])
  const [selectedDomain, setSelectedDomain] = useState(DEFAULT_DOMAIN)
  const [userTier, setUserTier] = useState('free')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function getChatId(): string | undefined {
    const path = location.pathname
    if (location.hostname === 'claude.ai') return path.match(/\/chat\/([^/]+)/)?.[1]
    if (location.hostname === 'chatgpt.com') return path.match(/\/c\/([^/]+)/)?.[1]
    if (location.hostname === 'gemini.google.com') return path.match(/\/app\/([^/]+)/)?.[1]
    return undefined
  }

  useEffect(() => {
    // Fetch domains
    sendMessage('getDomains', undefined)
      .then((result) => {
        if (result.domains.length > 0) {
          setDomains(result.domains)
          setSelectedDomain(result.domains[0].domain)
        }
        setUserTier(result.tier)
      })
      .catch(() => {})

    // Check if current chat already has a published project → show published state
    const chatId = getChatId()
    if (chatId) {
      sendMessage('checkStatus', { chatId })
        .then((status) => {
          if (status.exists && status.slug) {
            setSlug(status.slug)
            if (status.domain) setSelectedDomain(status.domain)
            const domain = status.domain || DEFAULT_DOMAIN
            setPublishedUrl(`https://${status.slug}.${domain}`)
            setPublishState('published')
          }
        })
        .catch(() => {})
    }
  }, [])

  function classifyError(msg: string): ErrorType {
    const lower = msg.toLowerCase()
    if (lower.includes('free tier limit') || lower.includes('limit reached')) return 'free-limit'
    if (lower.includes('domain') || lower.includes('taken') || lower.includes('already'))
      return 'domain-taken'
    return 'generic'
  }

  const handleSlugChange = useCallback((value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(sanitized)
    setSlugStatus('idle')
    setPublishState('idle')
    setErrorMsg(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (sanitized.length < 2) {
      setSlugStatus('idle')
      return
    }
    setSlugStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await sendMessage('checkSlug', { slug: sanitized })
        setSlugStatus(result.available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 500)
  }, [])

  async function handlePublish() {
    if (publishState === 'publishing' || slugStatus === 'taken') return
    setPublishState('publishing')
    setErrorMsg(null)
    try {
      const selectors = ['.code-block__code', 'pre code', '.cm-content', 'code', 'pre']
      let code = ''
      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el?.textContent?.trim()) {
          code = el.textContent.trim()
          break
        }
      }
      if (!code) {
        setErrorMsg('No code found on page')
        setErrorType('generic')
        setPublishState('error')
        return
      }
      const chatId = getChatId()
      const result = await sendMessage('publish', {
        code,
        language: 'html',
        chatId,
        chatUrl: location.href,
        slug: slug || undefined,
        domain: selectedDomain,
      })
      const publishedSlug = result.url.match(/https?:\/\/([^.]+)\./)?.[1] || ''
      setSlug(publishedSlug)
      setPublishedUrl(result.url)
      setPublishState('published')
      setSlugStatus('idle')
      try {
        confetti({ particleCount: 100, spread: 70, origin: { x: 0.9, y: 0.1 }, zIndex: 2147483647 })
      } catch {}
      try {
        const dataUrl = await QRCode.toDataURL(result.url, { width: 160, margin: 1 })
        setQrDataUrl(dataUrl)
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed'
      const type = classifyError(msg)
      setErrorType(type)
      setErrorMsg(
        type === 'free-limit'
          ? 'You reached your free limit.'
          : type === 'domain-taken'
            ? 'This domain is already taken.'
            : msg,
      )
      setPublishState('error')
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publishedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const isPublished = publishState === 'published'
  const isPublishing = publishState === 'publishing'
  const isError = publishState === 'error'
  const isFreeLimitError = isError && errorType === 'free-limit'

  // Border classes
  const borderClass =
    isError || slugStatus === 'taken'
      ? 'border-[1.5px] border-error'
      : isPublishing || isPublished
        ? 'border-[1.5px] border-[#ccc]'
        : slugStatus === 'available'
          ? 'border-[1.5px] border-success'
          : 'border-[1.5px] border-transparent'

  // Feedback
  let feedbackMsg: string | null = null
  let feedbackClass = 'text-muted'
  if (isError) {
    feedbackMsg = errorMsg
    feedbackClass = 'text-error'
  } else if (slugStatus === 'available') {
    feedbackMsg = 'Yes! This domain is available.'
    feedbackClass = 'text-success'
  } else if (slugStatus === 'taken') {
    feedbackMsg = 'This domain is already taken.'
    feedbackClass = 'text-error'
  }

  const publishDisabled =
    isPublishing || isPublished || slugStatus === 'taken' || slugStatus === 'checking'

  // Which icon in URL row
  const UrlIcon =
    isPublishing || slugStatus === 'checking'
      ? () => <SpinnerIcon spin />
      : slugStatus === 'available'
        ? SmileIcon
        : slugStatus === 'taken' || isError
          ? SadIcon
          : GlobeIcon

  return (
    <motion.div
      className="relative m-4 w-[280px] bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] p-1.5 flex flex-col gap-3 overflow-hidden font-sans"
      layout
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-1.5">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-6 h-6 rounded-[20px] object-cover shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded-[20px] bg-gradient-to-b from-white to-[#999] shrink-0" />
        )}
        <p className="flex-1 text-base font-medium text-black tracking-[-0.01em] leading-6 truncate">
          {session.user.name}
        </p>
        <button
          className="flex items-center gap-1 bg-transparent border-none cursor-pointer p-0 shrink-0"
          onClick={() => {
            window.open(`${WEB_URL}`, '_blank')
            onClose()
          }}
        >
          <span className="text-sm font-medium text-muted tracking-[-0.01em] leading-6 whitespace-nowrap">
            Log out
          </span>
          <LogoutIcon />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isPublished ? (
          <motion.div
            key="congrats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-3"
          >
            {/* Congrats or QR — swap in place */}
            <AnimatePresence mode="wait">
              {showQr && qrDataUrl ? (
                <motion.div
                  key="qr"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex justify-center py-2"
                >
                  <img src={qrDataUrl} alt="QR Code" className="w-[160px] h-[160px] rounded-lg" />
                </motion.div>
              ) : (
                <motion.div
                  key="text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-center flex flex-col items-center"
                >
                  <p className="text-[34px] leading-[48px]">🎉</p>
                  <p className="text-lg font-medium text-black tracking-[-0.01em] leading-6">
                    Congratulations!
                  </p>
                  <p className="text-lg font-medium text-muted tracking-[-0.01em] leading-6">
                    Your website is live
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1.5">
              {/* URL row */}
              <div className="flex items-center gap-1.5 bg-surface rounded-[14px] px-3 py-2">
                <GlobeIcon />
                <p
                  className="flex-1 text-sm font-medium text-[#459ef2] tracking-[-0.01em] leading-6 cursor-pointer truncate"
                  onClick={() => window.open(publishedUrl, '_blank')}
                >
                  {slug}.{selectedDomain}
                </p>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleCopy}
                    className="bg-transparent border-none cursor-pointer p-0 flex"
                    title={copied ? 'Copied!' : 'Copy URL'}
                  >
                    <CopyIcon />
                  </button>
                  <button
                    onClick={() => setShowQr(!showQr)}
                    className="bg-transparent border-none cursor-pointer p-0 flex"
                    title="QR Code"
                  >
                    <QrIcon />
                  </button>
                </div>
              </div>

              {/* Done button */}
              <button
                className="w-full bg-[#ccc] text-white border-none rounded-[14px] py-2 px-4 text-sm font-medium tracking-[-0.01em] leading-6 text-center cursor-pointer"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1.5"
          >
            <p className="text-sm font-medium text-muted tracking-[-0.01em] leading-[18px] px-1.5">
              Select URL
            </p>

            <div className="flex flex-col gap-1">
              {/* URL input row */}
              <div
                className={`flex items-center gap-1.5 bg-surface rounded-[14px] px-3 py-2 ${borderClass}`}
              >
                <UrlIcon />
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="mysite"
                  className="flex-1 min-w-0 bg-transparent border-none outline-none shadow-none p-0 text-sm font-medium text-black tracking-[-0.01em] leading-6 caret-black font-sans"
                />
                <Popover open={domainOpen} onOpenChange={setDomainOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 shrink-0 cursor-pointer bg-transparent border-none p-0 outline-none"
                    >
                      <span className="text-sm font-medium text-muted tracking-[-0.01em] leading-6 whitespace-nowrap">
                        {selectedDomain}
                      </span>
                      <ChevronDownIcon />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={8} className="min-w-[160px] p-1">
                    {domains.map((d) => (
                      <div
                        key={d.domain}
                        onClick={() => {
                          if (d.type === 'vanity' && userTier !== 'pro') return
                          setSelectedDomain(d.domain)
                          setDomainOpen(false)
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium font-sans leading-5 whitespace-nowrap flex items-center justify-between ${d.type === 'vanity' && userTier !== 'pro' ? 'text-[#999] cursor-default' : selectedDomain === d.domain ? 'bg-surface text-black cursor-pointer' : 'text-black hover:bg-[#f8f8f8] cursor-pointer'}`}
                      >
                        <span>{d.domain}</span>
                        {d.type === 'vanity' && userTier !== 'pro' && (
                          <span className="text-[13px] font-medium text-[#459ef2]">Pro</span>
                        )}
                      </div>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Feedback message */}
              <AnimatePresence>
                {feedbackMsg && (
                  <motion.p
                    key="feedback"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`text-xs font-medium tracking-[0.01em] leading-[18px] px-3 overflow-hidden ${feedbackClass}`}
                  >
                    {feedbackMsg}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Action button */}
            {isFreeLimitError ? (
              <button
                className="w-full bg-black text-white border-none rounded-[14px] py-2 px-4 text-sm font-medium tracking-[-0.01em] leading-6 text-center cursor-pointer"
                onClick={() => {
                  window.open(`${WEB_URL}`, '_blank')
                  onClose()
                }}
              >
                Upgrade to Pro
              </button>
            ) : (
              <button
                className={`w-full border-none rounded-[14px] py-2 px-4 text-sm font-medium tracking-[-0.01em] leading-6 text-center text-white ${publishDisabled ? 'bg-[#ccc] cursor-default' : 'bg-black cursor-pointer'}`}
                disabled={publishDisabled}
                onClick={handlePublish}
              >
                {isPublishing ? (
                  <span className="flex items-center justify-center gap-3">
                    <SpinnerIcon spin />
                    <span>Working on it</span>
                  </span>
                ) : (
                  'Publish'
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Panel ────────────────────────────────────────────────────────────────────

function Panel({ onClose }: { onClose: () => void }) {
  const [session, setSession] = useState<SessionData | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    sendMessage('getSession', undefined)
      .then((data) => {
        setSession(data)
        setLoading(false)
      })
      .catch(() => {
        setSession(null)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="relative m-4 w-[280px] bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] p-1.5 flex flex-col gap-3 overflow-hidden font-sans">
        <div className="flex items-center p-1.5">
          <div className="w-6 h-6 rounded-[20px] bg-gradient-to-b from-white to-[#999]" />
        </div>
        <div className="flex items-center justify-center py-3 px-1.5">
          <p className="text-sm font-medium text-muted tracking-[-0.01em] text-center">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (!session) return <LoggedOutView onClose={onClose} />
  return <LoggedInView session={session} onClose={onClose} />
}

// ── Content Script ───────────────────────────────────────────────────────────

export default defineContentScript({
  matches: ['*://claude.ai/*', '*://chatgpt.com/*', '*://gemini.google.com/*'],
  cssInjectionMode: 'manual',
  registration: 'runtime',

  async main() {
    const { createIsolatedElement } = await import('@webext-core/isolated-element')

    let parentEl: HTMLElement | null = null
    let root: ReactDOM.Root | null = null

    async function show() {
      if (parentEl) return

      const { parentElement, isolatedElement } = await createIsolatedElement({
        name: 'design-computer-panel',
        css: {
          url: browser.runtime.getURL('/content-scripts/panel.css'),
        },
        isolateEvents: ['keydown', 'keyup', 'keypress'],
      })

      parentElement.style.position = 'fixed'
      parentElement.style.top = '0'
      parentElement.style.right = '0'
      parentElement.style.zIndex = '2147483647'

      document.body.appendChild(parentElement)
      parentEl = parentElement

      root = ReactDOM.createRoot(isolatedElement)
      root.render(<Panel onClose={hide} />)
    }

    function hide() {
      if (root) {
        root.unmount()
        root = null
      }
      if (parentEl) {
        parentEl.remove()
        parentEl = null
      }
    }

    function toggle() {
      if (parentEl) hide()
      else show()
    }

    browser.runtime.onMessage.addListener((message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        'type' in message &&
        (message as { type: string }).type === 'togglePanel'
      ) {
        toggle()
      }
    })
  },
})
