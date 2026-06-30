import {
  CheckIcon,
  CodeXmlIcon,
  CopyIcon,
  GlobeIcon,
  QrIcon,
} from '@/entrypoints/panel.content/icons'
import { usePanelStore } from '@/entrypoints/panel.content/store'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { LibrarySection } from './LibrarySection'
import { TemplatesSection } from './TemplatesSection'

export function PublishedView() {
  const slug = usePanelStore((s) => s.slug)
  const selectedDomain = usePanelStore((s) => s.selectedDomain)
  const publishedUrl = usePanelStore((s) => s.publishedUrl)
  const qrDataUrl = usePanelStore((s) => s.qrDataUrl)
  const showQr = usePanelStore((s) => s.showQr)
  const copied = usePanelStore((s) => s.copied)
  const toggleQr = usePanelStore((s) => s.toggleQr)
  const copyUrl = usePanelStore((s) => s.copyUrl)

  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-1.5"
    >
      {/* Black URL pill */}
      <div className="flex items-center gap-1.5 bg-black rounded-[14px] px-3 py-2">
        {publishedUrl ? (
          <>
            <span className="w-5 h-5 flex items-center justify-center text-[#6AC07A] shrink-0">
              <GlobeIcon />
            </span>
            <p
              className="flex-1 min-w-0 text-[14px] font-medium text-white leading-6 tracking-[-0.01em] truncate cursor-pointer"
              style={{ fontFamily: "'Geist', sans-serif" }}
              onClick={() => window.open(publishedUrl, '_blank')}
            >
              {slug}.{selectedDomain}
            </p>
            <div className="flex items-center gap-[10px] shrink-0 text-[#888888]">
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
                      className="absolute inset-0 flex text-white"
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
                className="bg-transparent border-none cursor-pointer p-0 flex w-5 h-5"
                title="QR Code"
              >
                <QrIcon />
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="w-5 h-5 flex items-center justify-center text-[#999999] shrink-0">
              <CodeXmlIcon />
            </span>
            <p
              className="flex-1 text-[14px] font-medium text-[#999999] leading-6 tracking-[-0.01em]"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              No published page detected.
            </p>
          </>
        )}
      </div>

      {/* QR code panel */}
      <AnimatePresence>
        {showQr && qrDataUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center bg-white rounded-[16px] py-6 overflow-hidden"
          >
            <img src={qrDataUrl} alt="QR Code" className="w-[125px] h-[125px] rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      <TemplatesSection isOpen={templatesOpen} onToggle={() => setTemplatesOpen((v) => !v)} />
      <LibrarySection isOpen={libraryOpen} onToggle={() => setLibraryOpen((v) => !v)} />
    </motion.div>
  )
}
