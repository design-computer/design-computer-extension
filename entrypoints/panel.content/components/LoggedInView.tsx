import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import type { SessionData } from '@/lib/messaging'
import { sendMessage } from '@/lib/messaging'
import { usePanelStore } from '@/entrypoints/panel.content/store'
import type { CodeData, SuccessData } from '@/entrypoints/panel.content/types'
import { PublishForm } from './PublishForm'
import { PublishedView } from './PublishedView'
import { UserHeader } from './UserHeader'

export function LoggedInView({
  session,
  onClose,
  onLogout,
  initialCode,
  initialSuccess,
  fireConfetti,
}: {
  session: NonNullable<SessionData>
  onClose: () => void
  onLogout: () => void
  initialCode?: CodeData | null
  initialSuccess?: SuccessData | null
  fireConfetti?: () => void
}) {
  const publishState = usePanelStore((s) => s.publishState)
  const statusChecked = usePanelStore((s) => s.statusChecked)
  const setSession = usePanelStore((s) => s.setSession)
  const init = usePanelStore((s) => s.init)

  useEffect(() => {
    setSession(session)
    init({ initialCode, initialSuccess })
  }, [])

  const handleLogout = async () => {
    try {
      await sendMessage('logout', undefined)
    } catch {}
    onLogout()
  }

  if (!statusChecked) return null

  return (
    <>
      <UserHeader onLogout={handleLogout} />
      <AnimatePresence mode="wait">
        {publishState === 'published' ? (
          <PublishedView key="published" />
        ) : (
          <PublishForm key="form" onClose={onClose} fireConfetti={fireConfetti} />
        )}
      </AnimatePresence>
    </>
  )
}
