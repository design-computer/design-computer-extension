import { ExpandToggleIcon } from '@/entrypoints/panel.content/icons'
import { WEB_URL } from '@/entrypoints/panel.content/types'
import type { AssetItem } from '@/lib/messaging'
import { onMessage, sendMessage } from '@/lib/messaging'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, Copy, Info, Loader2, Play, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const MAX_SIZE = 5 * 1024 * 1024
// Assets render windowed: show this many up front, reveal another page as the
// grid scrolls near its bottom. The full list is prefetched once, so paging is
// instant (no extra network round-trips).
const ASSET_PAGE = 6
// TODO: replace with the real library walkthrough once it's published.
const TUTORIAL_URL = `${WEB_URL}/help/library`
// Public assets must be resolved via the extension origin — a bare "/foo.png"
// would resolve against the host page (chatgpt/claude/gemini), not the extension.
const EMPTY_STATE_IMG = browser.runtime.getURL('/library-empty.png')

type Screen = 'list' | 'upload'
type PickStatus = 'ready' | 'uploading' | 'done' | 'error'

// Directional slide+fade for swapping between the list and upload screens.
// `custom` carries the direction so the exiting screen slides the correct way
// (forward = list→upload: list exits up / upload enters from below).
const screenVariants = {
  enter: (dir: 'forward' | 'back') => ({ opacity: 0, y: dir === 'forward' ? 24 : -24 }),
  center: { opacity: 1, y: 0 },
  exit: (dir: 'forward' | 'back') => ({ opacity: 0, y: dir === 'forward' ? -24 : 24 }),
}

interface PickedFile {
  id: string
  file: File
  previewUrl: string
  status: PickStatus
  // 0–100 upload progress, set while status === 'uploading'.
  progress: number
}

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
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Upload spinner (Frame.svg): 8 spokes, spun via `animate-spin`. Stroke uses
// currentColor so the color follows the surrounding text (`text-*`).
function UploadSpinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin ${className}`}
      style={{ minWidth: size, minHeight: size }}
    >
      <path
        d="M10 1.66699V5.00033"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.49967L15.9167 4.08301"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 10H18.3333"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 13.5L15.9167 15.9167"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 15V18.3333"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.08398 15.9167L6.50065 13.5"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.66699 10H5.00033"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.08398 4.08301L6.50065 6.49967"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AssetTile({ asset }: { asset: AssetItem }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${WEB_URL}${asset.url}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group aspect-square flex-[1_0_0] min-w-0 relative rounded-[12px] overflow-hidden cursor-pointer">
      <div className="absolute inset-0 bg-[#efefef] rounded-[12px]" />
      <img
        src={`${WEB_URL}${asset.url}`}
        alt={asset.filename}
        className="absolute inset-0 w-full h-full object-cover rounded-[12px]"
      />
      <div className="absolute inset-0 bg-black/20 rounded-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out" />
      <button
        onClick={handleCopy}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-90 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 ease-out bg-black p-[8px] rounded-full flex items-center justify-center cursor-pointer border-none"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? 'check' : 'copy'}
            initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            {copied ? (
              <Check
                width={18}
                height={18}
                strokeWidth={2.5}
                color="white"
                style={{ minWidth: 18, minHeight: 18 }}
              />
            ) : (
              <Copy
                width={18}
                height={18}
                strokeWidth={2}
                color="white"
                style={{ minWidth: 18, minHeight: 18 }}
              />
            )}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  )
}

// Empty state: stacked example thumbnails + prompt + tutorial link (image 9).
function EmptyState() {
  return (
    <div className="bg-[#F6F6F6] rounded-[12px] p-6 flex flex-col items-center gap-2">
      <img src={EMPTY_STATE_IMG} alt="" className="w-full h-[51px] object-contain" />
      <p className="text-[13px] text-[#999] text-center leading-[18px] tracking-[-0.01em] max-w-[220px]">
        Upload your own assets, then paste the link in chat.
      </p>
      <button
        onClick={() => window.open(TUTORIAL_URL, '_blank')}
        className="flex items-center gap-1.5 bg-[#459EF2]/10 rounded-lg py-1 px-2 border-none cursor-pointer text-[14px] font-medium text-[#459EF2] tracking-[-0.01em]"
      >
        <Play width={15} height={15} strokeWidth={2} color="#459EF2" />
        Watch tutorial
      </button>
    </div>
  )
}

// File row in the upload screen: thumbnail + name + remove/status (images 7, 8).
function PickedRow({
  pick,
  onRemove,
  busy,
}: {
  pick: PickedFile
  onRemove: () => void
  busy: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-[14px] bg-[#F6F6F6] border-[1.5px] border-[#CCCCCC] px-3 py-2   ">
      <img
        src={pick.previewUrl}
        alt={pick.file.name}
        className="w-6 h-6 rounded-[6px] object-cover shrink-0"
      />
      <span className="flex-1 text-[14px] font-medium text-black tracking-[-0.01em] truncate">
        {pick.file.name}
      </span>
      {pick.status === 'done' ? (
        <Check width={20} height={20} strokeWidth={2.5} color="#999" />
      ) : pick.status === 'uploading' ? (
        <span className="text-[14px] font-medium text-[#999] tracking-[-0.01em] tabular-nums shrink-0">
          {pick.progress}%
        </span>
      ) : pick.status === 'error' ? (
        <span className="text-[12px] font-medium text-[#FF4D4F] tracking-[-0.01em]">Failed</span>
      ) : (
        <button
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${pick.file.name}`}
          className="bg-transparent border-none cursor-pointer p-0 flex items-center justify-center disabled:opacity-40"
        >
          <X width={20} height={20} strokeWidth={2} color="#999" />
        </button>
      )}
    </div>
  )
}

export function LibrarySection({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [screen, setScreen] = useState<Screen>('list')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [picks, setPicks] = useState<PickedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const fetchedRef = useRef(false)
  const loadingMoreRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !fetchedRef.current) {
      fetchedRef.current = true
      sendMessage('getAssets', { limit: ASSET_PAGE })
        .then((page) => {
          setAssets(page.assets)
          setCursor(page.nextCursor)
        })
        .catch(() => {})
        .finally(() => setFetched(true))
    }
  }, [isOpen])

  // Fetch the next page from the server (keyset cursor). Guarded against
  // overlapping calls so a fast scroll doesn't fire duplicate requests.
  const loadMore = async () => {
    if (loadingMoreRef.current || !cursor) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const page = await sendMessage('getAssets', { cursor, limit: ASSET_PAGE })
      setAssets((prev) => {
        const seen = new Set(prev.map((a) => a.id))
        return [...prev, ...page.assets.filter((a) => !seen.has(a.id))]
      })
      setCursor(page.nextCursor)
    } catch {
      // leave the cursor in place so a later scroll can retry
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }

  // Load the next page once the grid is scrolled near its bottom.
  const handleAssetsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) loadMore()
  }

  // Auto-fill: a page may be too short to overflow the viewport (e.g. 9 tiles
  // fit within the max-height), which would leave the grid un-scrollable and
  // strand the remaining pages. While there's another page AND the content
  // isn't tall enough to scroll, keep pulling pages until it is. Tiles are
  // CSS aspect-square, so heights are known at layout time (no image-load wait).
  useEffect(() => {
    if (!fetched || !cursor || loadingMoreRef.current) return
    const el = scrollRef.current
    if (el && el.scrollHeight <= el.clientHeight + 1) loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetched, cursor, assets])

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => picks.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Real upload progress streamed from the background worker, keyed by pick id.
  useEffect(() => {
    const off = onMessage('uploadProgress', ({ data }) => {
      const pct = data.total > 0 ? Math.round((data.loaded / data.total) * 100) : 0
      setPicks((prev) =>
        prev.map((p) =>
          // Never let a late tick pull a finished row back below 100%.
          p.id === data.uploadId && p.status === 'uploading'
            ? { ...p, progress: Math.min(99, pct) }
            : p,
        ),
      )
    })
    return () => off()
  }, [])

  const addFiles = (files: File[]) => {
    if (!files.length) return
    const invalidType = files.find((f) => !f.type.startsWith('image/'))
    if (invalidType) {
      setError('Only image files are allowed')
      return
    }
    const tooLarge = files.find((f) => f.size > MAX_SIZE)
    if (tooLarge) {
      setError(`"${tooLarge.name}" is too large — max 5MB`)
      return
    }
    setError(null)
    setPicks((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'ready' as PickStatus,
        progress: 0,
      })),
    ])
    if (inputRef.current) inputRef.current.value = ''
  }

  const removePick = (id: string) => {
    setPicks((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const setPickStatus = (id: string, status: PickStatus) =>
    setPicks((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))

  const handleUpload = async () => {
    if (!picks.length || uploading) return
    setUploading(true)
    setError(null)
    try {
      await Promise.all(
        picks.map(async (pick) => {
          setPicks((prev) =>
            prev.map((p) => (p.id === pick.id ? { ...p, status: 'uploading', progress: 0 } : p)),
          )
          try {
            const dataBase64 = await fileToBase64(pick.file)
            await sendMessage('uploadAsset', {
              filename: pick.file.name,
              mimeType: pick.file.type,
              dataBase64,
              uploadId: pick.id,
            })
            setPicks((prev) =>
              prev.map((p) => (p.id === pick.id ? { ...p, status: 'done', progress: 100 } : p)),
            )
          } catch {
            setPickStatus(pick.id, 'error')
            throw new Error('upload failed')
          }
        }),
      )
      // Reset to the first page so freshly-uploaded assets show at the top
      // and the cursor is re-anchored.
      const updated = await sendMessage('getAssets', { limit: ASSET_PAGE })
      setAssets(updated.assets)
      setCursor(updated.nextCursor)
      picks.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPicks([])
      setDirection('back')
      setScreen('list')
    } catch {
      setError('Some files failed to upload. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const goToUpload = () => {
    setError(null)
    setDirection('forward')
    setScreen('upload')
  }

  const backToList = () => {
    if (uploading) return
    picks.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setPicks([])
    setError(null)
    setDirection('back')
    setScreen('list')
  }

  const rows = chunk(assets, 3)
  // The populated, scrollable asset grid carries its own bottom spacing on the
  // last row (inside the scroll viewport). Every other state (skeleton, empty,
  // upload screen) relies on the content container's bottom padding instead.
  const showAssetGrid = screen === 'list' && fetched && assets.length > 0

  return (
    <div className="bg-white rounded-[16px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center px-2 py-[10px] bg-transparent border-none cursor-pointer"
      >
        <span className="flex-1 text-[16px] font-medium text-black leading-6 tracking-[-0.01em] text-left">
          Library
        </span>
        <span className="text-[#999] shrink-0">
          <ExpandToggleIcon isOpen={isOpen} />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-2 overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={screen}
                  custom={direction}
                  variants={screenVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className={`flex flex-col gap-2.5 ${showAssetGrid ? '' : 'pb-3'}`}
                >
                  {screen === 'list' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1 items-center">
                          <span className="text-[14px] font-medium text-black leading-[18px] tracking-[-0.01em]">
                            Assets
                          </span>
                          <div className="p-[3px] rounded-full bg-[#F6F6F6] ">
                            <Info width={15} height={15} strokeWidth={2} color="#ccc" />
                          </div>
                        </div>
                        <button
                          onClick={goToUpload}
                          className="bg-[#F6C013] flex gap-[4px] items-center justify-center py-[4px] px-[8px] rounded-lg border-none cursor-pointer text-[14px] font-medium text-black leading-[18px] tracking-[-0.01em]"
                        >
                          <span className="w-[15px] h-[15px] flex items-center justify-center shrink-0">
                            <Plus
                              width={15}
                              height={15}
                              strokeWidth={2.5}
                              style={{ minWidth: 15, minHeight: 15 }}
                            />
                          </span>
                          Upload
                        </button>
                      </div>

                      {error && (
                        <p className="text-[12px] font-medium text-red-500 tracking-[-0.01em]">
                          {error}
                        </p>
                      )}

                      {!fetched ? (
                        <div className="flex flex-col gap-1.5 w-full">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex gap-1.5 w-full">
                              {Array.from({ length: 3 }).map((_, j) => (
                                <div
                                  key={j}
                                  className="flex-[1_0_0] min-w-0 aspect-square rounded-[12px] bg-[#efefef] animate-pulse"
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : assets.length === 0 ? (
                        <EmptyState />
                      ) : (
                        <div
                          ref={scrollRef}
                          onScroll={handleAssetsScroll}
                          className="flex flex-col gap-1.5 w-full max-h-[120px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                          {rows.map((row, i) => (
                            <div key={i} className="flex gap-1.5 w-full last:pb-3">
                              {row.map((asset) => (
                                <AssetTile key={asset.id} asset={asset} />
                              ))}
                              {Array.from({ length: 3 - row.length }).map((_, j) => (
                                <div
                                  key={j}
                                  className="flex-[1_0_0] min-w-0 aspect-square opacity-0"
                                />
                              ))}
                            </div>
                          ))}
                          {loadingMore && (
                            <div className="flex items-center justify-center py-1.5">
                              <Loader2
                                width={18}
                                height={18}
                                strokeWidth={2}
                                color="#999"
                                className="animate-spin"
                                style={{ minWidth: 18, minHeight: 18 }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={backToList}
                          disabled={uploading}
                          aria-label="Back to assets"
                          className="bg-[#F6F6F6] h-[26px] w-[26px] flex items-center justify-center rounded-lg border-none cursor-pointer shrink-0 disabled:opacity-40"
                        >
                          <ChevronLeft
                            width={15}
                            height={15}
                            strokeWidth={2}
                            color="black"
                            style={{ minWidth: 15, minHeight: 15 }}
                          />
                        </button>
                        <span className="text-[14px] font-medium text-[#999] tracking-[-0.01em]">
                          Upload assets
                        </span>
                      </div>

                      <button
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOver(true)
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOver(false)
                          addFiles(Array.from(e.dataTransfer.files ?? []))
                        }}
                        className={`w-full rounded-[12px] border-[1.5px] py-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                          dragOver
                            ? 'border-[#F6C013] bg-[#fffaf0] border-dashed'
                            : 'border-[#CCCCCC] bg-[#F6F6F6] border-dashed border'
                        }`}
                      >
                        <input
                          ref={inputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                        />
                        <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                          <Plus width={24} height={24} strokeWidth={2} color="#999" />
                        </span>
                        <span className="text-[14px] tracking-[-0.01em] text-[#999]">
                          <span className="font-medium text-black underline underline-offset-2">
                            Browse
                          </span>{' '}
                          or drag and drop
                        </span>
                      </button>

                      {error && (
                        <p className="text-[12px] font-medium text-red-500 tracking-[-0.01em]">
                          {error}
                        </p>
                      )}

                      {picks.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {picks.map((pick) => (
                            <PickedRow
                              key={pick.id}
                              pick={pick}
                              busy={uploading}
                              onRemove={() => removePick(pick.id)}
                            />
                          ))}
                        </div>
                      )}

                      <button
                        onClick={handleUpload}
                        disabled={!picks.length || uploading}
                        className={`w-full h-[40px] rounded-[14px] border-none text-[14px] font-medium tracking-[-0.01em] flex items-center justify-center gap-2 transition-colors ${
                          !picks.length || uploading
                            ? 'bg-[#f0f0f0] text-[#999] cursor-default'
                            : 'bg-black text-white cursor-pointer'
                        } ${uploading ? '!bg-black !text-white' : ''}`}
                      >
                        {uploading ? (
                          <>
                            <UploadSpinner size={18} className="text-white" />
                            Uploading…
                          </>
                        ) : (
                          'Upload'
                        )}
                      </button>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
