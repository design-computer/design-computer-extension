import { CheckIcon, CopyIcon, GlobeIcon, QrIcon } from '@/entrypoints/panel.content/icons'
import { usePanelStore } from '@/entrypoints/panel.content/store'
import { AnimatePresence, motion } from 'framer-motion'

export function PublishedView() {
  const slug = usePanelStore((s) => s.slug)
  const selectedDomain = usePanelStore((s) => s.selectedDomain)
  const publishedUrl = usePanelStore((s) => s.publishedUrl)
  const qrDataUrl = usePanelStore((s) => s.qrDataUrl)
  const showQr = usePanelStore((s) => s.showQr)
  const copied = usePanelStore((s) => s.copied)
  const toggleQr = usePanelStore((s) => s.toggleQr)
  const copyUrl = usePanelStore((s) => s.copyUrl)
  const onClose = usePanelStore((s) => s.onClose)

  return (
    <motion.div
      key="congrats"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-1"
    >
      {/* Congrats or QR — swap in place */}
      <motion.div layout transition={{ layout: { duration: 0.25, ease: 'easeInOut' } }}>
        <AnimatePresence mode="wait">
          {showQr && qrDataUrl ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex justify-center bg-[#F6F6F6] rounded-[14px] py-[26px] px-16 mt-3"
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
              className="text-center flex flex-col items-center py-3"
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
      </motion.div>

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
              onClick={copyUrl}
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
              onClick={toggleQr}
              className="bg-transparent border-none cursor-pointer p-0 flex"
              title="QR Code"
            >
              <QrIcon />
            </button>
          </div>
        </div>

        {/* Done button */}
        <button
          onClick={() => onClose?.()}
          className="w-full bg-[#ccc] text-white border-none rounded-[14px] py-2 px-4 text-sm font-medium tracking-[-0.01em] leading-6 text-center cursor-pointer hover:bg-[#bbb] transition-colors duration-200 ease-in-out"
        >
          Done
        </button>
      </div>
    </motion.div>
  )
}
