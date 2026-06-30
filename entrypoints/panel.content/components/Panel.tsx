import { usePanelStore } from '@/entrypoints/panel.content/store'
import type { CodeData, SuccessData } from '@/entrypoints/panel.content/types'
import type { SessionData } from '@/lib/messaging'
import { sendMessage } from '@/lib/messaging'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LoggedInView } from './LoggedInView'
import { LoggedOutView } from './LoggedOutView'
import { PanelLayout } from './PanelLayout'

export function Panel({
  onClose,
  initialCode,
  initialSuccess,
  prefetchedSession,
}: {
  onClose: () => void
  initialCode?: CodeData | null
  initialSuccess?: SuccessData | null
  prefetchedSession?: SessionData
}) {
  const [session, setSession] = useState<SessionData | undefined>(prefetchedSession ?? undefined)
  const [loggedOut, setLoggedOut] = useState(false)
  const [loading, setLoading] = useState(!initialSuccess && !prefetchedSession)
  const [closing, setClosing] = useState(false)

  const handleClose = useCallback(() => {
    setClosing(true)
  }, [])
  const confettiRef = useRef<confetti.CreateTypes | null>(null)
  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node && !confettiRef.current) {
      confettiRef.current = confetti.create(node, { resize: true })
    }
  }, [])

  const fireConfetti = useCallback(() => {
    const fire = confettiRef.current
    if (!fire) return
    fire({
      particleCount: 80,
      spread: 55,
      origin: { x: 0.5, y: 0.8 },
      angle: 90,
      startVelocity: 45,
    })
    fire({
      particleCount: 40,
      spread: 40,
      origin: { x: 0.4, y: 0.82 },
      angle: 70,
      startVelocity: 40,
    })
    fire({
      particleCount: 40,
      spread: 40,
      origin: { x: 0.6, y: 0.82 },
      angle: 110,
      startVelocity: 40,
    })
  }, [])
  // Fire confetti on mount when opened with success state (update button flow)
  useEffect(() => {
    if (initialSuccess) {
      const t = setTimeout(fireConfetti, 100)
      return () => clearTimeout(t)
    }
  }, [initialSuccess, fireConfetti])

  // Listen for external confetti trigger (e.g. Update button clicked while panel is open)
  useEffect(() => {
    const handler = () => fireConfetti()
    document.addEventListener('__dc_fire_confetti', handler)
    return () => document.removeEventListener('__dc_fire_confetti', handler)
  }, [fireConfetti])

  useEffect(() => {
    if (prefetchedSession) return
    // Try reading pre-fetched session from storage first
    browser.storage.session
      .get('__dc_session')
      .then((result) => {
        if (result.__dc_session) {
          setSession(result.__dc_session)
          setLoading(false)
          return
        }
        // Fallback to API fetch
        return sendMessage('getSession', undefined).then((data) => {
          setSession(data)
          setLoading(false)
        })
      })
      .catch(() => {
        setSession(null)
        setLoading(false)
      })
  }, [])

  const publishState = usePanelStore((s) => s.publishState)
  const resolvedSession = initialSuccess?.session ?? session
  const avatarImage = resolvedSession?.user?.image ?? null
  const userName = resolvedSession?.user?.name ?? null

  // Determine which view to show
  let viewKey: string
  let viewContent: React.ReactNode

  if (initialSuccess) {
    const s = initialSuccess.session ?? session
    if (!loading && !s) {
      // Not logged in
      viewKey = 'logged-out'
      viewContent = <LoggedOutView onClose={handleClose} />
    } else if (!s || !s.user?.name) {
      // Session not ready yet — wait for it
      viewKey = 'loading'
      viewContent = null
    } else {
      viewKey = 'success'
      viewContent = (
        <LoggedInView
          session={s as NonNullable<SessionData>}
          onClose={handleClose}
          onLogout={() => setLoggedOut(true)}
          initialSuccess={initialSuccess}
          fireConfetti={fireConfetti}
        />
      )
    }
  } else if (loggedOut || (!loading && !session)) {
    viewKey = 'logged-out'
    viewContent = <LoggedOutView onClose={onClose} />
  } else if (loading) {
    // Show the panel chrome (container + header shell) immediately rather than
    // blocking the whole panel on the session fetch. Content stays empty until
    // the session resolves, then the real view fades in — so the panel appears
    // the instant it's opened instead of after the round-trip.
    viewKey = 'loading'
    viewContent = null
  } else {
    viewKey = 'logged-in'
    viewContent = (
      <LoggedInView
        session={session!}
        onClose={handleClose}
        onLogout={() => setLoggedOut(true)}
        initialCode={initialCode}
        initialSuccess={initialSuccess}
        fireConfetti={fireConfetti}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, transformOrigin: 'top right' }}
      animate={closing ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onAnimationComplete={() => {
        if (closing) onClose()
      }}
      className="relative overflow-x-hidden! m-4 w-[280px] bg-[#333333]/80 backdrop-blur-[4px] border border-white/10 rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.28)] overflow-hidden font-sans p-1"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 50 }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={viewKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <PanelLayout
            avatarImage={avatarImage}
            userName={userName}
            showGear={viewKey === 'logged-out'}
            noCard={viewKey !== 'logged-out' && publishState === 'published'}
            loading={viewKey === 'loading'}
          >
            {viewContent}
          </PanelLayout>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
