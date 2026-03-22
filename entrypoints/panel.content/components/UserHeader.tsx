import { LogoutIcon } from '@/entrypoints/panel.content/icons'
import { usePanelStore } from '@/entrypoints/panel.content/store'
import { WEB_URL } from '@/entrypoints/panel.content/types'

export function UserHeader({ onLogout }: { onLogout: () => void }) {
  const session = usePanelStore((s) => s.session)
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
