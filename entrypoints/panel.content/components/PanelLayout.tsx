import { SettingsIcon } from '@/entrypoints/panel.content/icons'
import { WEB_URL } from '@/entrypoints/panel.content/types'
import type { ReactNode } from 'react'

/**
 * Placeholder shown in the content area while the session/publish-status
 * resolves, so the panel never flashes an empty body. Matches the real layout's
 * footprint (full width, ~same row heights) to avoid a reflow when content
 * lands. `tone` adapts to the background: "dark" sits on the panel chrome,
 * "light" sits inside the white card.
 */
export function PanelBodySkeleton({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  const block = tone === 'light' ? 'bg-black/[0.06]' : 'bg-white/10'
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      <div className={`h-9 w-full rounded-[14px] ${block} animate-pulse`} />
      <div className={`h-[42px] w-full rounded-[16px] ${block} animate-pulse`} />
      <div className={`h-[42px] w-full rounded-[16px] ${block} animate-pulse`} />
    </div>
  )
}

/**
 * App shell: dark chrome with an avatar + Dashboard/Settings controls,
 * wrapping the active view in a white content card. Used for both the
 * logged-out and logged-in states.
 *
 * Dashboard opens the web app in a new tab; the settings gear is still a stub.
 */
export function PanelLayout({
  avatarImage,
  userName,
  showGear = true,
  noCard = false,
  loading = false,
  children,
}: {
  avatarImage?: string | null
  userName?: string | null
  showGear?: boolean
  noCard?: boolean
  loading?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 w-full min-w-0">
      <header className="flex items-center gap-2 p-1.5">
        {avatarImage ? (
          <img src={avatarImage} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-linear-to-b from-white to-[#999] shrink-0" />
        )}
        {userName && (
          <span className="text-[13px] font-medium text-white/80 tracking-[-0.01em] truncate max-w-[80px]">
            {userName}
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => window.open(WEB_URL, '_blank')}
          className="px-3 py-1.5 rounded-[12px] bg-[#444444] border-none cursor-pointer text-[13px] font-medium text-[#999999] tracking-[-0.01em] whitespace-nowrap"
        >
          Dashboard
        </button>
        {showGear && (
          <button
            type="button"
            aria-label="Settings"
            className="p-1.5 flex items-center justify-center rounded-[12px] bg-[#444444] border-none cursor-pointer shrink-0"
          >
            <SettingsIcon />
          </button>
        )}
      </header>
      {loading ? (
        <PanelBodySkeleton tone="dark" />
      ) : noCard ? (
        <div className="flex flex-col gap-1.5">{children}</div>
      ) : (
        <div className="bg-white rounded-[16px] p-1.5">{children}</div>
      )}
    </div>
  )
}
