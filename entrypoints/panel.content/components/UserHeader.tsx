import { LogoutIcon } from '@/entrypoints/panel.content/icons'
import { usePanelStore } from '@/entrypoints/panel.content/store'

export function UserHeader({ onLogout }: { onLogout: () => void }) {
  const session = usePanelStore((s) => s.session)
  if (!session) return null

  return (
    <div className="flex items-center gap-2 p-1.5">
      <div className="flex-1" />
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
