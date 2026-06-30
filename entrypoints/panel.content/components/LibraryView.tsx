import { sendMessage } from '@/lib/messaging'
import type { AssetItem } from '@/lib/messaging'
import { usePanelStore } from '@/entrypoints/panel.content/store'
import { WEB_URL } from '@/entrypoints/panel.content/types'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB — keep in sync with /api/assets/upload

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // strip the "data:<mime>;base64," prefix
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function CopyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function AssetTile({ asset }: { asset: AssetItem }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${WEB_URL}${asset.url}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="aspect-square flex-[1_0_0] min-w-0 relative rounded-[14px] overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0 bg-[#efefef] rounded-[14px]" />
      <img
        src={`${WEB_URL}${asset.url}`}
        alt={asset.filename}
        className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
      />
      {hovered && <div className="absolute inset-0 bg-black/20 rounded-[14px]" />}
      {hovered && (
        <button
          onClick={handleCopy}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black p-[10px] rounded-[20px] flex items-center justify-center cursor-pointer border-none"
        >
          {copied ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <CopyIcon />
          )}
        </button>
      )}
    </div>
  )
}

function EmptyGrid() {
  return (
    <div className="flex flex-col gap-[6px] w-full">
      <div className="flex gap-[6px] w-full">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-square flex-[1_0_0] min-w-0 rounded-[14px] bg-[#efefef]" />
        ))}
      </div>
      <div className="flex gap-[6px] w-full">
        <div className="aspect-square flex-[1_0_0] min-w-0 rounded-[14px] bg-[#efefef] opacity-40" />
        <div className="aspect-square flex-[1_0_0] min-w-0 opacity-0" />
        <div className="aspect-square flex-[1_0_0] min-w-0 opacity-0" />
      </div>
    </div>
  )
}

export function LibraryView() {
  const setActiveView = usePanelStore((s) => s.setActiveView)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    sendMessage('getAssets', {})
      .then((page) => setAssets(page.assets))
      .catch(() => {})
  }, [])

  const handleUpload = async (files: File[]) => {
    if (!files.length) return

    // Client-side validation before reading/uploading
    const invalidType = files.find((f) => !f.type.startsWith('image/'))
    if (invalidType) {
      setError('Only image files are allowed')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    const tooLarge = files.find((f) => f.size > MAX_SIZE)
    if (tooLarge) {
      setError(`"${tooLarge.name}" is too large — max 5MB`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setError(null)
    setUploading(true)
    try {
      // All network calls go through the background worker. Messaging is
      // JSON-serialized, so each file is read to base64 before sending.
      await Promise.all(
        files.map(async (file) => {
          const dataBase64 = await fileToBase64(file)
          return sendMessage('uploadAsset', {
            filename: file.name,
            mimeType: file.type,
            dataBase64,
          })
        }),
      )
      const updated = await sendMessage('getAssets', {})
      setAssets(updated.assets)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const rows = chunk(assets, 3)

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

      {/* Header: My Library + Upload */}
      <div className="flex flex-col gap-[12px] w-full">
        <div className="flex items-center justify-between pl-[6px] w-full">
          <div className="flex gap-[4px] items-center">
            <span className="text-[14px] font-medium text-[#999] tracking-[-0.14px] leading-[18px] whitespace-nowrap">
              My Library
            </span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ccc"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="bg-[#f4f4f4] flex gap-[4px] h-[32px] items-center justify-center pl-[6px] pr-[10px] py-[6px] rounded-[20px] border-none cursor-pointer disabled:opacity-50"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(Array.from(e.target.files ?? []))}
            />
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="text-[14px] font-medium text-[#999] tracking-[-0.14px] leading-[24px] whitespace-nowrap">
              {uploading ? 'Uploading…' : 'Upload'}
            </span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[13px] font-medium text-red-500 tracking-[-0.14px] leading-[18px] pl-[6px]">
            {error}
          </p>
        )}

        {/* Grid */}
        {assets.length === 0 ? (
          <EmptyGrid />
        ) : (
          <div className="flex flex-col gap-[6px] w-full">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-[6px] w-full">
                {row.map((asset) => (
                  <AssetTile key={asset.id} asset={asset} />
                ))}
                {Array.from({ length: 3 - row.length }).map((_, j) => (
                  <div key={j} className="flex-[1_0_0] min-w-0 aspect-square opacity-0" />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
