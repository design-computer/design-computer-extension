import { useCallback, useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { sendMessage } from '../../../lib/messaging'
import type { SessionData } from '../../../lib/messaging'
import { motion, AnimatePresence } from 'framer-motion'
import type { CodeData, SuccessData } from '../types'
import { LoggedOutView } from './LoggedOutView'
import { LoggedInView } from './LoggedInView'

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const confettiRef = useRef<confetti.CreateTypes | null>(null)

  useEffect(() => {
    if (canvasRef.current && !confettiRef.current) {
      confettiRef.current = confetti.create(canvasRef.current, { resize: true })
    }
    return () => {
      confettiRef.current?.reset()
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
      // Small delay to let canvas render
      const t = setTimeout(fireConfetti, 100)
      return () => clearTimeout(t)
    }
  }, [initialSuccess, fireConfetti])

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

  // Determine which view to show
  let viewKey: string
  let viewContent: React.ReactNode

  if (initialSuccess) {
    const s = initialSuccess.session ?? session ?? { user: { id: '', name: '', email: '' } }
    viewKey = 'success'
    console.log('[design.computer] Panel view: success', { slug: initialSuccess.slug })
    viewContent = (
      <LoggedInView
        session={s as NonNullable<SessionData>}
        onClose={onClose}
        onLogout={() => setLoggedOut(true)}
        initialSuccess={initialSuccess}
        fireConfetti={fireConfetti}
      />
    )
  } else if (loggedOut || (!loading && !session)) {
    viewKey = 'logged-out'
    console.log('[design.computer] Panel view: logged-out', { loggedOut, loading, session })
    viewContent = <LoggedOutView onClose={onClose} />
  } else if (loading) {
    console.log('[design.computer] Panel view: loading')
    return null
  } else {
    viewKey = 'logged-in'
    console.log('[design.computer] Panel view: logged-in', { user: session?.user?.email })
    viewContent = (
      <LoggedInView
        session={session!}
        onClose={onClose}
        onLogout={() => setLoggedOut(true)}
        initialCode={initialCode}
        initialSuccess={initialSuccess}
        fireConfetti={fireConfetti}
      />
    )
  }

  return (
    <div className="relative m-4 w-[280px] bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] p-1.5 flex flex-col gap-3 overflow-hidden font-sans">
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
          {viewContent}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
