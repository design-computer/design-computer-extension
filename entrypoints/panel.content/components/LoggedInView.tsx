import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionData } from '../../../lib/messaging'
import { sendMessage } from '../../../lib/messaging'
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  GlobeIcon,
  LogoutIcon,
  QrIcon,
  SadIcon,
  SmileIcon,
  SpinnerIcon,
} from '../icons'
import type {
  CodeData,
  DomainInfo,
  ErrorType,
  PublishState,
  SlugStatus,
  SuccessData,
} from '../types'
import { DEFAULT_DOMAIN, WEB_URL } from '../types'
import { generateRandomSlug, getChatId } from '../utils'

export function LoggedInView({
  session,
  onClose,
  onLogout,
  initialCode,
  initialSuccess,
  fireConfetti,
}: {
  session: NonNullable<SessionData>
  onClose: () => void
  onLogout: () => void
  initialCode?: CodeData | null
  initialSuccess?: SuccessData | null
  fireConfetti?: () => void
}) {
  const needsStatusCheck = !initialSuccess && !initialCode
  const [statusChecked, setStatusChecked] = useState(!needsStatusCheck)
  const [publishState, setPublishState] = useState<PublishState>(
    initialSuccess ? 'published' : 'idle',
  )
  const [slug, setSlug] = useState(
    initialSuccess?.slug || (initialCode ? generateRandomSlug() : ''),
  )
  const [codeData, setCodeData] = useState<CodeData | null>(initialCode ?? null)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<ErrorType>('generic')
  const [publishedUrl, setPublishedUrl] = useState(initialSuccess?.url || '')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [domainOpen, setDomainOpen] = useState(false)
  const [domains, setDomains] = useState<DomainInfo[]>([{ domain: DEFAULT_DOMAIN, type: 'burner' }])
  const [selectedDomain, setSelectedDomain] = useState(DEFAULT_DOMAIN)
  const [userTier, setUserTier] = useState('free')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    // Generate QR code for initial success state (update button flow)
    if (initialSuccess?.url) {
      QRCode.toDataURL(initialSuccess.url, {
        width: 125,
        margin: 1,
        color: { dark: '#000000', light: '#F6F6F6' },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch(() => {})
    }

    // Check availability for initial slug (from publish button)
    if (slug.length >= 2) {
      setSlugStatus('checking')
      sendMessage('checkSlug', { slug })
        .then((r) => setSlugStatus(r.available ? 'available' : 'taken'))
        .catch(() => setSlugStatus('idle'))
    }

    // Check if current chat already has a published project → show published state
    // Skip if opened from publish button (user wants to publish/update, not see old state)
    const chatId = getChatId()
    if (chatId && !initialCode) {
      sendMessage('checkStatus', { chatId })
        .then((status) => {
          if (status.exists && status.slug) {
            setSlug(status.slug)
            if (status.domain) setSelectedDomain(status.domain)
            const domain = status.domain || DEFAULT_DOMAIN
            const url = `https://${status.slug}.${domain}`
            setPublishedUrl(url)
            setPublishState('published')
            QRCode.toDataURL(url, {
              width: 125,
              margin: 1,
              color: { dark: '#000000', light: '#F6F6F6' },
            })
              .then((dataUrl) => setQrDataUrl(dataUrl))
              .catch(() => {})
          }
        })
        .catch(() => {})
        .finally(() => setStatusChecked(true))
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
      // Use stored code from publish button click, or scrape from page
      let code = codeData?.code || ''
      let language = codeData?.language || 'html'

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
        setErrorMsg('No code found on page')
        setErrorType('generic')
        setPublishState('error')
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
      setSlug(publishedSlug)
      setPublishedUrl(result.url)
      setPublishState('published')
      setSlugStatus('idle')
      fireConfetti?.()
      document.dispatchEvent(new CustomEvent('__dc_published'))
      try {
        const dataUrl = await QRCode.toDataURL(result.url, {
          width: 125,
          margin: 1,
          color: { dark: '#000000', light: '#F6F6F6' },
        })
        setQrDataUrl(dataUrl)
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed'
      const type = classifyError(msg)
      setErrorType(type)
      setErrorMsg(msg)
      setSlugStatus('idle')
      setPublishState('error')
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publishedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {}
  }

  if (!statusChecked) return null

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
    <>
      {/* Header */}
      <div className="flex items-center gap-2 p-1.5">
        <a
          href={WEB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 min-w-0 no-underline cursor-pointer"
        >
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
        </a>
        <button
          className="flex items-center gap-1 bg-transparent border-none cursor-pointer p-0 shrink-0"
          onClick={async () => {
            try {
              await sendMessage('logout', undefined)
            } catch {}
            onLogout()
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
            className="flex flex-col gap-1"
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
                  className="flex justify-center bg-[#F6F6F6] rounded-[14px] py-2 px-[47px] mt-3"
                >
                  <img src={qrDataUrl} alt="QR Code" className="w-[125px] h-[125px] rounded-lg" />
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
                    className="bg-transparent border-none cursor-pointer p-0 flex relative w-5 h-5"
                    title={copied ? 'Copied!' : 'Copy URL'}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.span
                          key="check"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0 flex"
                        >
                          <CheckIcon />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0 flex"
                        >
                          <CopyIcon />
                        </motion.span>
                      )}
                    </AnimatePresence>
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
                disabled
                className="w-full bg-[#ccc] text-white border-none rounded-[14px] py-2 px-4 text-sm font-medium tracking-[-0.01em] leading-6 text-center cursor-default"
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
    </>
  )
}
