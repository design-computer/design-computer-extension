import { cn } from '@/lib/utils'
import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

/**
 * CategorySelect — a small, dependency-free dropdown built with a composition
 * (compound-component) API and animated with framer-motion. Replaces the old
 * shadcn `Command` + Radix `Popover` combo, which pulled in cmdk's fuzzy-filter
 * / keyboard model just to show a handful of static category rows.
 *
 * Every part forwards native props and merges a caller `className` onto its
 * base styles, so callers can restyle/extend without forking the component:
 *   <CategorySelect className="ml-0">
 *     <CategorySelect.Trigger className="bg-white">{label}</CategorySelect.Trigger>
 *     <CategorySelect.Content className="min-w-[240px]">
 *       {options.map((o) => (
 *         <CategorySelect.Item key={o} selected={...} onSelect={...}>…</CategorySelect.Item>
 *       ))}
 *     </CategorySelect.Content>
 *   </CategorySelect>
 */

interface CategorySelectContextValue {
  open: boolean
  toggle: () => void
  close: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  // The node to portal the dropdown into — the ShadowRoot the panel lives in
  // (so Tailwind styles apply), or document.body when not inside a shadow root.
  portalTarget: ShadowRoot | HTMLElement | null
}

const CategorySelectContext = createContext<CategorySelectContextValue | null>(null)

function useCategorySelect() {
  const ctx = useContext(CategorySelectContext)
  if (!ctx) throw new Error('CategorySelect.* must be used within <CategorySelect>')
  return ctx
}

function CategorySelectRoot({ children, className, ...rest }: ComponentPropsWithoutRef<'div'>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // Resolved after mount: the ShadowRoot the panel lives in (preferred so the
  // portaled dropdown inherits the same Tailwind styles), else document.body.
  const [portalTarget, setPortalTarget] = useState<ShadowRoot | HTMLElement | null>(null)

  useEffect(() => {
    const root = rootRef.current?.getRootNode()
    setPortalTarget(root instanceof ShadowRoot ? root : document.body)
  }, [])

  // Close on outside click / Escape. The panel lives inside a shadow root, so
  // we bind to getRootNode() (the ShadowRoot) rather than document — that keeps
  // event.target un-retargeted so `contains()` resolves correctly. The dropdown
  // is portaled out of rootRef, so a click counts as "inside" if it lands in
  // either the root (trigger) or the portaled content.
  useEffect(() => {
    if (!open) return
    const root = rootRef.current?.getRootNode() as ShadowRoot | Document | undefined
    if (!root) return

    const onPointerDown = (e: Event) => {
      const target = e.target as Node
      const inside = rootRef.current?.contains(target) || contentRef.current?.contains(target)
      if (!inside) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    root.addEventListener('pointerdown', onPointerDown, true)
    root.addEventListener('keydown', onKeyDown as EventListener, true)
    return () => {
      root.removeEventListener('pointerdown', onPointerDown, true)
      root.removeEventListener('keydown', onKeyDown as EventListener, true)
    }
  }, [open])

  return (
    <CategorySelectContext.Provider
      value={{
        open,
        toggle: () => setOpen((v) => !v),
        close: () => setOpen(false),
        triggerRef,
        contentRef,
        portalTarget,
      }}
    >
      <div ref={rootRef} className={cn('relative ml-auto shrink-0', className)} {...rest}>
        {children}
      </div>
    </CategorySelectContext.Provider>
  )
}

function Trigger({ children, className, onClick, ...rest }: ComponentPropsWithoutRef<'button'>) {
  const { open, toggle, triggerRef } = useCategorySelect()
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={(e) => {
        onClick?.(e)
        toggle()
      }}
      className={cn(
        'py-[4px] px-[8px] rounded-lg bg-[#F6F6F6] border-none cursor-pointer text-[14px] font-medium leading-[18px] text-[#999] tracking-[-0.01em] flex items-center gap-1.5 whitespace-nowrap',
        className,
      )}
      {...rest}
    >
      {children}
      <span
        className={`flex items-center transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      >
        <ChevronDown width={15} height={15} strokeWidth={2} color="#999999" />
      </span>
    </button>
  )
}

// Gap between the trigger and the dropdown, in px (matches the old `mt-2`).
const CONTENT_GAP = 8

function Content({ children, className, style, ...rest }: HTMLMotionProps<'div'>) {
  const { open, triggerRef, contentRef, portalTarget } = useCategorySelect()
  // Fixed-position coords derived from the trigger's viewport rect. Right-anchored
  // (like the old `right-0`) so the dropdown's right edge tracks the trigger's.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setPos({ top: r.bottom + CONTENT_GAP, right: window.innerWidth - r.right })
    }
    update()
    window.addEventListener('resize', update)
    // Capture phase so we also react to scrolls in inner containers (the panel).
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, triggerRef])

  if (!portalTarget) return null

  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={contentRef}
          role="listbox"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            transformOrigin: 'top right',
            ...style,
          }}
          className={cn(
            'z-[2147483647] min-w-[200px] p-1 bg-white rounded-[14px] border border-[#eee] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-h-[280px] overflow-y-auto',
            className,
          )}
          {...rest}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget,
  )
}

function Item({
  selected = false,
  onSelect,
  children,
  className,
  onClick,
  ...rest
}: ComponentPropsWithoutRef<'button'> & { selected?: boolean; onSelect: () => void }) {
  const { close } = useCategorySelect()
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={(e) => {
        onClick?.(e)
        onSelect()
        close()
      }}
      className={cn(
        'w-full flex items-center justify-between gap-[2px] px-[18px] py-[12px] rounded-[20px] cursor-pointer border-none text-[14px] leading-[18px] tracking-[-0.01em] transition-colors hover:bg-[#F8F8F8]',
        selected ? 'bg-[#F8F8F8]' : 'bg-transparent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export const CategorySelect = Object.assign(CategorySelectRoot, { Trigger, Content, Item })
