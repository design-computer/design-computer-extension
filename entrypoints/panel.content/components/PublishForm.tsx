import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDownIcon,
  GlobeIcon,
  SadIcon,
  SmileIcon,
  SpinnerIcon,
} from '@/entrypoints/panel.content/icons'
import { usePanelStore } from '@/entrypoints/panel.content/store'
import { WEB_URL } from '@/entrypoints/panel.content/types'

export function PublishForm({
  onClose,
  fireConfetti,
}: {
  onClose: () => void
  fireConfetti?: () => void
}) {
  const slug = usePanelStore((s) => s.slug)
  const slugStatus = usePanelStore((s) => s.slugStatus)
  const publishState = usePanelStore((s) => s.publishState)
  const errorMsg = usePanelStore((s) => s.errorMsg)
  const errorType = usePanelStore((s) => s.errorType)
  const domains = usePanelStore((s) => s.domains)
  const selectedDomain = usePanelStore((s) => s.selectedDomain)
  const domainOpen = usePanelStore((s) => s.domainOpen)
  const userTier = usePanelStore((s) => s.userTier)
  const checkSlug = usePanelStore((s) => s.checkSlug)
  const setDomainOpen = usePanelStore((s) => s.setDomainOpen)
  const selectDomain = usePanelStore((s) => s.selectDomain)
  const publish = usePanelStore((s) => s.publish)

  const isPublishing = publishState === 'publishing'
  const isPublished = publishState === 'published'
  const isError = publishState === 'error'
  const isFreeLimitError = isError && errorType === 'free-limit'

  const borderClass =
    isError || slugStatus === 'taken'
      ? 'border-[1.5px] border-error'
      : isPublishing || isPublished
        ? 'border-[1.5px] border-[#ccc]'
        : slugStatus === 'available'
          ? 'border-[1.5px] border-success'
          : 'border-[1.5px] border-transparent'

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
            onChange={(e) => checkSlug(e.target.value)}
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
                    selectDomain(d.domain)
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
          onClick={() => publish(fireConfetti)}
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
  )
}
