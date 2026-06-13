import { LogoutIcon } from '@/entrypoints/panel.content/icons'
import { usePanelStore } from '@/entrypoints/panel.content/store'
import { WEB_URL } from '@/entrypoints/panel.content/types'

export function UserHeader({ onLogout }: { onLogout: () => void }) {
  const session = usePanelStore((s) => s.session)
  const setActiveView = usePanelStore((s) => s.setActiveView)
  if (!session) return null

  return (
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
          <div className="w-6 h-6 rounded-[20px] bg-linear-to-b from-white to-[#999] shrink-0" />
        )}
        <p className="flex-1 text-base font-medium text-black tracking-[-0.01em] leading-6 truncate">
          {session.user.name}
        </p>
      </a>
      <button
        onClick={() => setActiveView('templates')}
        className="flex items-center gap-1 bg-[#f4f4f4] rounded-[20px] pl-[8px] pr-[10px] py-[6px] h-8 border-none cursor-pointer shrink-0"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span className="text-[13px] font-medium text-[#999] tracking-[-0.01em] whitespace-nowrap">
          Templates
        </span>
      </button>
      {/* TODO: Library feature hidden for now — re-enable when assets ship
      <button
        onClick={() => setActiveView('library')}
        className="flex items-center gap-1 bg-[#f4f4f4] rounded-[20px] pl-[6px] pr-[10px] py-[6px] h-8 border-none cursor-pointer shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className="text-[13px] font-medium text-[#999] tracking-[-0.01em] whitespace-nowrap">Library</span>
      </button>
      */}
      <button
        className="flex items-center gap-1 bg-transparent border-none cursor-pointer p-0 shrink-0"
        onClick={onLogout}
      >
        <span className="text-sm font-medium text-muted tracking-[-0.01em] leading-6 whitespace-nowrap">
          Log out
        </span>
        <LogoutIcon />
      </button>
    </div>
  )
}
