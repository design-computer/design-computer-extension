import { CategorySelect } from '@/entrypoints/panel.content/components/CategorySelect'
import { ExpandToggleIcon } from '@/entrypoints/panel.content/icons'
import { WEB_URL } from '@/entrypoints/panel.content/types'
import type { TemplateItem } from '@/lib/messaging'
import { sendMessage } from '@/lib/messaging'
import { TEMPLATE_CATEGORIES } from '@/lib/templates-categories'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Bookmark, ChevronLeft, ImageIcon, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

type Tab = 'featured' | 'saved'
type Screen = 'list' | 'detail' | 'create'

// Vertical slide+fade for moving between the list / detail / create screens.
// `custom` carries the direction so the exiting screen slides the right way
// (forward = going deeper: current screen exits up / next enters from below).
const screenSlide = {
  enter: (dir: 'forward' | 'back') => ({ opacity: 0, y: dir === 'forward' ? 24 : -24 }),
  center: { opacity: 1, y: 0 },
  exit: (dir: 'forward' | 'back') => ({ opacity: 0, y: dir === 'forward' ? -24 : 24 }),
}

// Category filter option: `value: null` is the "All categories" row.
type CategoryOption = { value: string | null; label: string; count: number }

function BookmarkOutlineIcon({ size = 14 }: { size?: number }) {
  return (
    <Bookmark
      width={size}
      height={size}
      strokeWidth={2}
      style={{ minWidth: size, minHeight: size }}
    />
  )
}

function BookmarkFilledIcon({ size = 14 }: { size?: number }) {
  return (
    <Bookmark
      width={size}
      height={size}
      strokeWidth={2}
      fill="currentColor"
      style={{ minWidth: size, minHeight: size }}
    />
  )
}

function ChevronLeftIcon() {
  return <ChevronLeft width={15} height={15} strokeWidth={2} color="black" />
}

function ArrowUpRightIcon() {
  return <ArrowUpRight width={15} height={15} strokeWidth={2.5} />
}

function CategoryCombobox({
  categories,
  selected,
  onSelect,
}: {
  categories: CategoryOption[]
  selected: string | null
  onSelect: (value: string | null) => void
}) {
  const label = selected ?? 'All categories'

  return (
    <CategorySelect className="flex-1">
      <CategorySelect.Trigger className="w-full flex items-center justify-between">
        {label}
      </CategorySelect.Trigger>
      <CategorySelect.Content>
        {categories.map((opt) => (
          <CategorySelect.Item
            key={opt.value ?? '__all__'}
            selected={opt.value === selected}
            onSelect={() => onSelect(opt.value)}
          >
            <span className="font-medium text-black truncate">{opt.label}</span>
            <span className="text-[#999] tabular-nums shrink-0">{opt.count}</span>
          </CategorySelect.Item>
        ))}
      </CategorySelect.Content>
    </CategorySelect>
  )
}

function FilterBar({
  tab,
  onTabChange,
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  tab: Tab
  onTabChange: (t: Tab) => void
  categories: CategoryOption[]
  selectedCategory: string | null
  onSelectCategory: (value: string | null) => void
}) {
  return (
    <div className="flex items-center gap-[6px]">
      <button
        onClick={() => onTabChange('saved')}
        className={`p-[5.5px] flex items-center justify-center rounded-[8px] border-none cursor-pointer shrink-0 transition-colors ${
          tab === 'saved' ? 'bg-black text-white' : 'bg-[#F6F6F6] text-[#999]'
        }`}
      >
        {tab === 'saved' ? <BookmarkFilledIcon size={15} /> : <BookmarkOutlineIcon size={15} />}
      </button>
      <button
        onClick={() => onTabChange('featured')}
        className={`py-[4px] px-[8px] rounded-lg border-none cursor-pointer text-[14px] font-medium leading-[18px] tracking-[-0.01em] transition-colors whitespace-nowrap ${
          tab === 'featured' ? 'bg-black text-white' : 'bg-[#F6F6F6] text-[#999]'
        }`}
      >
        Featured
      </button>
      <CategoryCombobox
        categories={categories}
        selected={selectedCategory}
        onSelect={onSelectCategory}
      />
    </div>
  )
}

function CoverImage({
  url,
  name,
  className = 'w-full h-full',
}: {
  url: string | null
  name: string
  className?: string
}) {
  if (url) return <img src={url} alt={name} className={`object-cover ${className}`} />
  return (
    <div className={`flex items-center justify-center bg-[#f4f4f4] ${className}`}>
      <ImageIcon width={20} height={20} strokeWidth={1.5} color="#ccc" />
    </div>
  )
}

function CardBookmark({ filled = false }: { filled?: boolean }) {
  return (
    <span className=" flex items-center justify-center shrink-0">
      <Bookmark width={15} height={15} strokeWidth={2} color={filled ? '#fff' : '#999999'} />
    </span>
  )
}

// Bookmark icon + count, styled per spec: 2px gap, 12px / 16px, -1% tracking.
function BookmarkCount({ count, filled }: { count: number; filled: boolean }) {
  return (
    <span className="flex items-center gap-[2px] text-[12px] leading-[16px] tracking-[-0.01em] text-[#999] shrink-0">
      <CardBookmark filled={filled} /> {count}
    </span>
  )
}

function TemplateGridCard({
  template,
  onSelect,
}: {
  template: TemplateItem
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-[6px] text-left bg-transparent border-none cursor-pointer p-0"
    >
      <CoverImage
        url={template.coverUrl}
        name={template.name}
        className="h-[91.5px] w-full rounded-[8px]"
      />
      <div className="flex items-center justify-between px-1">
        <span className="flex-1 text-[12px] font-medium text-black tracking-[-0.01em] leading-[18px] truncate">
          {template.name}
        </span>
        <BookmarkCount count={template.bookmarkCount} filled={template.isBookmarked} />
      </div>
    </button>
  )
}

function TemplateSavedCard({
  template,
  onSelect,
}: {
  template: TemplateItem
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-[6px] text-left bg-transparent border-none cursor-pointer p-0 w-full"
    >
      <CoverImage
        url={template.coverUrl}
        name={template.name}
        className="w-full aspect-[4/3] rounded-[8px]"
      />
      <div className="flex items-center justify-between p-[4px]">
        <span className="flex-1 text-[12px] font-medium text-black tracking-[-0.01em] leading-[18px] truncate">
          {template.name}
        </span>
        <BookmarkCount count={template.bookmarkCount} filled={template.isBookmarked} />
      </div>
    </button>
  )
}

function TemplateDetail({
  template,
  onBack,
  onToggleBookmark,
  onEdit,
}: {
  template: TemplateItem
  onBack: () => void
  onToggleBookmark: (t: TemplateItem) => void
  onEdit: (t: TemplateItem) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-[6px]">
        <button
          onClick={onBack}
          className="bg-[#F6F6F6] h-[26px] w-[26px] flex items-center justify-center rounded-lg border-none cursor-pointer shrink-0"
        >
          <ChevronLeftIcon />
        </button>
        <span className="flex-1 text-[14px] font-medium text-black leading-[18px] tracking-[-0.01em] truncate">
          {template.name}
        </span>
        <button
          onClick={() => onToggleBookmark(template)}
          aria-pressed={template.isBookmarked}
          aria-label={template.isBookmarked ? 'Remove bookmark' : 'Bookmark template'}
          className="flex items-center gap-[2px] bg-transparent border-none cursor-pointer p-0 text-[12px] leading-[16px] tracking-[-0.01em] text-[#999] shrink-0"
        >
          <CardBookmark filled={template.isBookmarked} /> {template.bookmarkCount}
        </button>
        {template.isOwner && (
          <button
            onClick={() => onEdit(template)}
            className="py-1 px-2 bg-[#F6F6F6] rounded-lg border-none cursor-pointer text-[12px] font-medium text-[#333] tracking-[-0.01em] shrink-0"
          >
            Edit
          </button>
        )}
      </div>

      <CoverImage
        url={template.coverUrl}
        name={template.name}
        className="w-full h-[189px] rounded-[12px]"
      />

      <div className="flex gap-1.5 items-center justify-between">
        <button
          onClick={() => window.open(`${WEB_URL}/templates/${template.slug}`, '_blank')}
          className="flex-1 py-[6px] px-[12px] flex items-center justify-center gap-[4px] bg-[#F6F6F6] rounded-xl border-none cursor-pointer text-[14px] font-medium leading-[24px] text-[#999] tracking-[-0.01em]"
        >
          Preview <ArrowUpRightIcon />
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 py-1 px-3   min-width-[151px] flex items-center justify-center bg-[#F6C013] rounded-xl border-none cursor-pointer text-[14px] font-medium leading-[24px] text-black tracking-[-0.01em]"
        >
          {copied ? 'Copied!' : 'Copy prompt'}
        </button>
      </div>

      {template.description && (
        <p className="text-[12px] text-[#999999] leading-[18px] tracking-[-0.01em]">
          {template.description}
        </p>
      )}

      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-black leading-[18px] tracking-[-0.01em]">
            Creator
          </span>
          {template.creatorName ? (
            <span className="flex items-center gap-[4px] min-w-0">
              <span className="w-[15px] h-[15px] rounded-full bg-[#f4f4f4] overflow-hidden shrink-0">
                {template.creatorAvatar && (
                  <img
                    src={template.creatorAvatar}
                    alt={template.creatorName}
                    className="w-full h-full object-cover"
                  />
                )}
              </span>
              <span className="text-[12px] font-medium text-black leading-[16px] tracking-[-0.01em] truncate">
                {template.creatorName}
              </span>
            </span>
          ) : (
            <span className="text-[12px] text-[#999] leading-[16px] tracking-[-0.01em]">—</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-black leading-[18px] tracking-[-0.01em]">
            Categories
          </span>
          {template.category ? (
            <span className="px-[8px] py-[2px] bg-[#F6F6F6] rounded-full text-[12px] leading-[16px] tracking-[-0.01em] text-[#333]">
              {template.category}
            </span>
          ) : (
            <span className="text-[12px] text-[#999] leading-[16px] tracking-[-0.01em]">—</span>
          )}
        </div>
      </div>
    </div>
  )
}

function SavedEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between py-[4px] pl-[6px]">
        <span className="text-[14px] font-medium text-black leading-[18px] tracking-[-0.01em]">
          Saved
        </span>
        <button
          onClick={onCreate}
          className="py-[4px] px-[8px] flex items-center gap-[4px] bg-[#F6C013] rounded-lg border-none cursor-pointer text-[14px] font-medium leading-[18px] tracking-[-0.01em] text-black"
        >
          <span className=" flex items-center justify-center shrink-0">
            <Plus width={15} height={15} strokeWidth={2.5} />
          </span>
          Create
        </button>
      </div>
      <div className="bg-[#F6F6F6] rounded-[12px] py-8 flex flex-col items-center gap-2">
        <span className="text-[#ccc] w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <BookmarkOutlineIcon size={15} />
        </span>
        <p className="text-[14px] text-[#999] text-center leading-[18px] tracking-[-0.01em]">
          Save your favorite templates or
          <br />
          create your own.
        </p>
      </div>
    </div>
  )
}

const MAX_COVER_SIZE = 5 * 1024 * 1024 // 5MB — matches the web API

// Cover can be: the template's existing (remote) cover, a freshly picked file,
// or none (cleared / never set). Only 'new' carries base64 bytes to upload;
// only its previewUrl is an object URL that needs revoking.
type CoverState =
  | { kind: 'none' }
  | { kind: 'existing'; previewUrl: string }
  | { kind: 'new'; filename: string; mimeType: string; dataBase64: string; previewUrl: string }

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

// Shared form for both creating a new template and editing an existing one
// (pass `template` to edit). Submits via the create/update message accordingly.
function CreateForm({
  template,
  onBack,
  onSaved,
}: {
  template?: TemplateItem
  onBack: () => void
  onSaved: (t: TemplateItem) => void
}) {
  const isEditing = !!template
  const hadCover = !!template?.coverUrl

  const [title, setTitle] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [prompt, setPrompt] = useState(template?.content ?? '')
  const [isPublic, setIsPublic] = useState(template?.isPublic ?? false)
  const [category, setCategory] = useState<string | null>(template?.category ?? null)
  const [cover, setCover] = useState<CoverState>(
    template?.coverUrl ? { kind: 'existing', previewUrl: template.coverUrl } : { kind: 'none' },
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const isValid = title.trim().length > 0 && prompt.trim().length > 0

  // Revoke the preview object URL on unmount — only 'new' covers own one.
  useEffect(() => {
    return () => {
      if (cover.kind === 'new') URL.revokeObjectURL(cover.previewUrl)
    }
  }, [cover])

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (coverInputRef.current) coverInputRef.current.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Cover must be an image')
      return
    }
    if (file.size > MAX_COVER_SIZE) {
      setError('Cover too large — max 5MB')
      return
    }
    setError(null)
    const dataBase64 = await fileToBase64(file)
    setCover((prev) => {
      if (prev.kind === 'new') URL.revokeObjectURL(prev.previewUrl)
      return {
        kind: 'new',
        filename: file.name,
        mimeType: file.type,
        dataBase64,
        previewUrl: URL.createObjectURL(file),
      }
    })
  }

  const removeCover = () => {
    setCover((prev) => {
      if (prev.kind === 'new') URL.revokeObjectURL(prev.previewUrl)
      return { kind: 'none' }
    })
  }

  const handleSubmit = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    setError(null)
    const newCover =
      cover.kind === 'new'
        ? { filename: cover.filename, mimeType: cover.mimeType, dataBase64: cover.dataBase64 }
        : null
    try {
      const base = {
        name: title.trim(),
        description: description.trim(),
        content: prompt,
        category,
        isPublic,
        cover: newCover,
      }
      const saved =
        isEditing && template
          ? await sendMessage('updateTemplate', {
              ...base,
              slug: template.slug,
              // Drop the cover only when it was cleared and no new one was picked.
              removeCover: cover.kind === 'none' && hadCover,
            })
          : await sendMessage('createTemplate', base)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save template')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onBack}
          disabled={submitting}
          className="w-7 h-7 flex items-center justify-center bg-[#f4f4f4] rounded-full border-none cursor-pointer text-[#333] shrink-0 disabled:opacity-40"
        >
          <ChevronLeftIcon />
        </button>
        <span className="text-[14px] font-medium text-[#999] tracking-[-0.01em]">
          {isEditing ? 'Edit template' : 'Create template'}
        </span>
      </div>

      <input
        type="text"
        placeholder="Template title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-[#f4f4f4] rounded-[12px] px-3 py-3 text-[14px] font-medium text-black placeholder:text-[#ccc] border-none outline-none"
      />

      <div className="relative">
        <input
          type="text"
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[#f4f4f4] rounded-[12px] px-3 py-3 pr-20 text-[14px] text-black placeholder:text-[#ccc] border-none outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#ccc] pointer-events-none">
          Optional
        </span>
      </div>

      {/* Cover image: hidden file input + a styled trigger / chosen-file row. */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverChange}
      />
      {cover.kind !== 'none' ? (
        <div className="w-full bg-[#f4f4f4] rounded-[12px] p-2 flex items-center gap-2">
          <img
            src={cover.previewUrl}
            alt=""
            className="w-12 h-9 rounded-[8px] object-cover shrink-0"
          />
          <span className="flex-1 text-[14px] font-medium text-black truncate">
            {cover.kind === 'new' ? cover.filename : 'Current cover'}
          </span>
          <button
            onClick={() => coverInputRef.current?.click()}
            className="bg-transparent border-none cursor-pointer text-[12px] font-medium text-[#459EF2] px-1 shrink-0"
          >
            Replace
          </button>
          <button
            onClick={removeCover}
            aria-label="Remove cover"
            className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center shrink-0"
          >
            <X width={18} height={18} strokeWidth={2} color="#999" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => coverInputRef.current?.click()}
          className="w-full bg-[#f4f4f4] rounded-[12px] px-3 py-3 flex items-center gap-2 border-none cursor-pointer text-left"
        >
          <span className="text-[#ccc] text-[20px] font-light leading-none">+</span>
          <span className="flex-1 text-[14px] font-medium text-black">Cover image</span>
          <span className="text-[12px] text-[#ccc]">4:3 aspect</span>
        </button>
      )}

      <textarea
        placeholder="Your prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        className="w-full bg-[#f4f4f4] rounded-[12px] px-3 py-3 text-[14px] text-black placeholder:text-[#ccc] border-none outline-none resize-none"
      />

      <CategorySelect className="w-full ml-0">
        <CategorySelect.Trigger className="w-full justify-between bg-[#f4f4f4] rounded-[12px] px-3 py-3 text-[14px]">
          <span className={category ? 'text-black font-medium' : 'text-[#ccc]'}>
            {category ?? 'Category'}
          </span>
        </CategorySelect.Trigger>
        <CategorySelect.Content className="w-full">
          {TEMPLATE_CATEGORIES.map((c) => (
            <CategorySelect.Item key={c} selected={category === c} onSelect={() => setCategory(c)}>
              <span className="font-medium text-black">{c}</span>
            </CategorySelect.Item>
          ))}
        </CategorySelect.Content>
      </CategorySelect>

      <div className="bg-[#f4f4f4] rounded-[12px] px-3 py-3 flex items-center">
        <span className="flex-1 text-[14px] font-medium text-black">Public template</span>
        <button
          onClick={() => setIsPublic((v) => !v)}
          className={`w-10 h-[22px] rounded-full flex items-center transition-colors border-none cursor-pointer shrink-0 ${isPublic ? 'bg-black' : 'bg-[#ccc]'}`}
        >
          <span
            className={`w-[18px] h-[18px] rounded-full bg-white mx-0.5 block shrink-0 transition-transform ${isPublic ? 'translate-x-[18px]' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {error && (
        <p className="text-[12px] font-medium text-[#FF4D4F] tracking-[-0.01em] px-1">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className={`w-full h-11 rounded-[12px] border-none text-[14px] font-medium text-white tracking-[-0.01em] transition-colors ${
          isValid && !submitting ? 'bg-black cursor-pointer' : 'bg-[#ccc] cursor-default'
        }`}
      >
        {submitting ? (isEditing ? 'Saving…' : 'Creating…') : isEditing ? 'Save' : 'Create'}
      </button>
    </div>
  )
}

export function TemplatesSection({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<Tab>('featured')
  const [screen, setScreen] = useState<Screen>('list')
  const [selected, setSelected] = useState<TemplateItem | null>(null)
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [screenDir, setScreenDir] = useState<'forward' | 'back'>('forward')
  // The template being edited (null = the create screen is in "new" mode).
  const [editing, setEditing] = useState<TemplateItem | null>(null)

  // Move between screens with a direction so the slide animates the right way.
  const openDetail = (t: TemplateItem) => {
    setScreenDir('forward')
    setSelected(t)
    setScreen('detail')
  }
  const openCreate = () => {
    setScreenDir('forward')
    setEditing(null)
    setScreen('create')
  }
  const openEdit = (t: TemplateItem) => {
    setScreenDir('forward')
    setEditing(t)
    setScreen('create')
  }
  const backToList = () => {
    setScreenDir('back')
    setSelected(null)
    setScreen('list')
  }
  // Cancel the create/edit form: edit → back to its detail; new → Saved list.
  const cancelForm = () => {
    setScreenDir('back')
    if (editing) {
      setSelected(editing)
      setEditing(null)
      setScreen('detail')
    } else {
      setSelected(null)
      setTab('saved')
      setScreen('list')
    }
  }

  // After create or edit: upsert into the list. New → Saved tab list; edit →
  // back to the (refreshed) detail view.
  const handleSaved = (t: TemplateItem) => {
    const wasEditing = !!editing
    setTemplates((prev) =>
      prev.some((x) => x.id === t.id) ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev],
    )
    setEditing(null)
    if (wasEditing) {
      setSelected(t)
      setScreenDir('back')
      setScreen('detail')
    } else {
      setTab('saved')
      backToList()
    }
  }

  useEffect(() => {
    setLoading(true)
    sendMessage('getTemplates', undefined)
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // "Saved" = templates you own or have bookmarked.
  const savedTemplates = templates.filter((t) => t.isOwner || t.isBookmarked)

  // Category filter options: "All categories" + each category present in the data,
  // with live counts. Empty categories are omitted to keep the list clean.
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const counts = new Map<string, number>()
    for (const t of templates) {
      if (t.category) counts.set(t.category, (counts.get(t.category) ?? 0) + 1)
    }
    const present = TEMPLATE_CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0).map((c) => ({
      value: c as string | null,
      label: c,
      count: counts.get(c) ?? 0,
    }))
    return [{ value: null, label: 'All categories', count: templates.length }, ...present]
  }, [templates])

  const featuredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates

  const handleToggleBookmark = async (t: TemplateItem) => {
    const bookmark = !t.isBookmarked
    const apply = (count: number, isBookmarked: boolean) => {
      setTemplates((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, isBookmarked, bookmarkCount: count } : x)),
      )
      setSelected((prev) =>
        prev && prev.id === t.id ? { ...prev, isBookmarked, bookmarkCount: count } : prev,
      )
    }
    // Optimistic update, then reconcile with the server's canonical count.
    apply(Math.max(0, t.bookmarkCount + (bookmark ? 1 : -1)), bookmark)
    try {
      const res = await sendMessage('toggleBookmark', { slug: t.slug, bookmark })
      apply(res.bookmarkCount, res.bookmarked)
    } catch {
      apply(t.bookmarkCount, t.isBookmarked)
    }
  }

  return (
    <div className="bg-white rounded-[16px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center px-1.5 py-[10px] bg-transparent border-none cursor-pointer"
      >
        <span className="flex-1 text-[16px] font-medium text-black leading-6 tracking-[-0.01em] text-left">
          Templates
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
            <div className="px-1.5 pb-2.5 overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={screenDir}>
                <motion.div
                  key={screen}
                  custom={screenDir}
                  variants={screenSlide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="flex flex-col gap-3"
                >
                  {screen === 'list' && (
                    <FilterBar
                      tab={tab}
                      onTabChange={(t) => {
                        setTab(t)
                        setSelected(null)
                      }}
                      categories={categoryOptions}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                    />
                  )}

                  {screen === 'list' && (
                    // Swap the filtered view (tab + category) with a presence
                    // animation: the outgoing view fades/slides up and out before
                    // the incoming one fades/slides in. Keyed so each filter click
                    // — Featured↔Saved, or a new category — retriggers it.
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={tab === 'featured' ? `featured:${selectedCategory ?? 'all'}` : 'saved'}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                      >
                        {tab === 'featured' ? (
                          loading ? (
                            <p className="text-[13px] text-[#999] py-4 text-center">Loading…</p>
                          ) : templates.length === 0 ? (
                            <p className="text-[13px] text-[#999] py-4 text-center">
                              No templates yet.
                            </p>
                          ) : featuredTemplates.length === 0 ? (
                            <p className="text-[13px] text-[#999] py-4 text-center">
                              No templates in {selectedCategory}.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {featuredTemplates.map((t) => (
                                <TemplateGridCard
                                  key={t.id}
                                  template={t}
                                  onSelect={() => openDetail(t)}
                                />
                              ))}
                            </div>
                          )
                        ) : savedTemplates.length === 0 ? (
                          <SavedEmpty onCreate={openCreate} />
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-medium text-black">Saved</span>
                              <button
                                onClick={openCreate}
                                className="h-8 px-3 flex items-center gap-1 bg-[#E8B84B] rounded-full border-none cursor-pointer text-[13px] font-medium text-black"
                              >
                                + Create
                              </button>
                            </div>
                            <div className="flex flex-col gap-3">
                              {savedTemplates.map((t) => (
                                <TemplateSavedCard
                                  key={t.id}
                                  template={t}
                                  onSelect={() => openDetail(t)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}

                  {screen === 'detail' && selected && (
                    <TemplateDetail
                      template={selected}
                      onBack={backToList}
                      onToggleBookmark={handleToggleBookmark}
                      onEdit={openEdit}
                    />
                  )}

                  {screen === 'create' && (
                    <CreateForm
                      template={editing ?? undefined}
                      onBack={cancelForm}
                      onSaved={handleSaved}
                    />
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
