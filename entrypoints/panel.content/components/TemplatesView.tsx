import { sendMessage } from '@/lib/messaging'
import type { TemplateItem } from '@/lib/messaging'
import { usePanelStore } from '@/entrypoints/panel.content/store'
import { insertPrompt } from '@/entrypoints/panel.content/insert-prompt'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

function TemplateCard({
  template,
  onPick,
}: {
  template: TemplateItem
  onPick: (t: TemplateItem) => void
}) {
  return (
    <button
      onClick={() => onPick(template)}
      className="flex flex-col rounded-[14px] overflow-hidden border border-[#eee] bg-white text-left cursor-pointer hover:border-[#ccc] transition-colors"
    >
      <div className="aspect-[16/9] bg-[#efefef] w-full">
        {template.coverUrl ? (
          <img src={template.coverUrl} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#ccc] text-[12px]">
            design.md
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col gap-0.5">
        <p className="text-[13px] font-medium text-black truncate">{template.name}</p>
        {template.description && (
          <p className="text-[11px] text-[#999] line-clamp-1">{template.description}</p>
        )}
      </div>
    </button>
  )
}

export function TemplatesView() {
  const setActiveView = usePanelStore((s) => s.setActiveView)
  const onClose = usePanelStore((s) => s.onClose)
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inserted, setInserted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sendMessage('getTemplates', undefined)
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePick = (template: TemplateItem) => {
    const ok = insertPrompt(template.content)
    if (!ok) {
      setError('Could not find the chat input on this page.')
      return
    }
    setError(null)
    setInserted(true)
    // Close the panel so the user sees the filled chat input.
    setTimeout(() => onClose?.(), 400)
  }

  return (
    <motion.div
      className="flex flex-col gap-[16px] w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Back button row */}
      <div className="flex items-center justify-center p-[6px] w-full">
        <div className="flex items-center w-full">
          <button
            onClick={() => setActiveView('main')}
            className="bg-[#f4f4f4] flex items-center justify-center p-[6px] rounded-[20px] border-none cursor-pointer"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#222"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-[12px] w-full">
        <div className="flex items-center justify-between pl-[6px] w-full">
          <span className="text-[14px] font-medium text-[#999] tracking-[-0.14px] leading-[18px]">
            Templates
          </span>
          {inserted && (
            <span className="text-[13px] font-medium text-green-600 pr-[6px]">Inserted ✓</span>
          )}
        </div>

        {error && <p className="text-[13px] font-medium text-red-500 pl-[6px]">{error}</p>}

        {loading ? (
          <p className="text-[13px] text-[#999] py-6 text-center">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-[13px] text-[#999] py-6 text-center">
            No templates yet. Create one in your dashboard.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-[8px] w-full">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} onPick={handlePick} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
