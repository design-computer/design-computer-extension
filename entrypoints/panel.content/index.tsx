import './style.css'
import ReactDOM from 'react-dom/client'
import { onMessage } from '../../lib/messaging'
import type { SessionData } from '../../lib/messaging'
import confetti from 'canvas-confetti'
import type { CodeData } from './types'
import { Panel } from './components/Panel'

// ── Content Script ───────────────────────────────────────────────────────────

export default defineContentScript({
  matches: ['*://claude.ai/*', '*://chatgpt.com/*', '*://gemini.google.com/*'],
  cssInjectionMode: 'manual',
  registration: 'runtime',

  async main() {
    console.log('[design.computer] panel content script LOADED')
    const { createIsolatedElement } = await import('@webext-core/isolated-element')

    let parentEl: HTMLElement | null = null
    let root: ReactDOM.Root | null = null
    let currentCodeData: CodeData | null = null

    async function show(codeData?: CodeData | null, prefetchedSession?: SessionData) {
      if (parentEl) return

      const { parentElement, isolatedElement } = await createIsolatedElement({
        name: 'design-computer-panel',
        css: {
          url: browser.runtime.getURL('/content-scripts/panel.css'),
        },
        isolateEvents: ['keydown', 'keyup', 'keypress'],
      })

      parentElement.style.position = 'fixed'
      parentElement.style.top = '0'
      parentElement.style.right = '0'
      parentElement.style.zIndex = '2147483647'

      document.body.appendChild(parentElement)
      parentEl = parentElement

      root = ReactDOM.createRoot(isolatedElement)
      root.render(
        <Panel onClose={hide} initialCode={codeData} prefetchedSession={prefetchedSession} />,
      )
    }

    async function showSuccess(slug: string, url: string, session?: SessionData) {
      if (parentEl) return

      const { parentElement, isolatedElement } = await createIsolatedElement({
        name: 'design-computer-panel',
        css: {
          url: browser.runtime.getURL('/content-scripts/panel.css'),
        },
        isolateEvents: ['keydown', 'keyup', 'keypress'],
      })

      parentElement.style.position = 'fixed'
      parentElement.style.top = '0'
      parentElement.style.right = '0'
      parentElement.style.zIndex = '2147483647'

      document.body.appendChild(parentElement)
      parentEl = parentElement

      root = ReactDOM.createRoot(isolatedElement)
      root.render(<Panel onClose={hide} initialSuccess={{ slug, url, session }} />)

      // Fire confetti
      try {
        // Panel is ~280px wide, positioned top-right with 16px margin
        // Calculate origin relative to viewport so confetti bursts from panel bottom
        const pw = 280
        const panelRight = 16
        const panelX = (window.innerWidth - panelRight - pw / 2) / window.innerWidth
        const panelBottom = 0.35 // approximate panel bottom as fraction of viewport height
        confetti({
          particleCount: 80,
          spread: 55,
          origin: { x: panelX, y: panelBottom },
          angle: 90,
          startVelocity: 45,
          zIndex: 2147483647,
        })
        confetti({
          particleCount: 40,
          spread: 40,
          origin: { x: panelX - 0.05, y: panelBottom + 0.02 },
          angle: 70,
          startVelocity: 40,
          zIndex: 2147483647,
        })
        confetti({
          particleCount: 40,
          spread: 40,
          origin: { x: panelX + 0.05, y: panelBottom + 0.02 },
          angle: 110,
          startVelocity: 40,
          zIndex: 2147483647,
        })
      } catch {}
    }

    function hide() {
      if (root) {
        root.unmount()
        root = null
      }
      if (parentEl) {
        parentEl.remove()
        parentEl = null
      }
      currentCodeData = null
    }

    // Close panel on SPA navigation (chat change)
    let lastUrl = location.href
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href
        if (parentEl) hide()
      }
    })
    urlObserver.observe(document.body, { childList: true, subtree: true })

    onMessage('togglePanel', ({ data }) => {
      if (parentEl) {
        hide()
      } else {
        show(undefined, data.session)
      }
    })

    onMessage('openPanelWithCode', ({ data }) => {
      currentCodeData = {
        code: data.code,
        language: data.language,
        chatId: data.chatId,
        chatUrl: data.chatUrl,
      }
      if (parentEl) hide()
      show(currentCodeData)
    })

    onMessage('openPanelWithSuccess', ({ data }) => {
      if (parentEl) hide()
      showSuccess(data.slug, data.url, data.session)
    })

    // Check storage for pending action (set by background before inject)
    browser.storage.session.get('__dc_panel_action').then((result) => {
      const action = result.__dc_panel_action
      if (!action) {
        show() // Default: just open panel
        return
      }
      browser.storage.session.remove('__dc_panel_action')
      if (action.type === 'toggle') {
        show(undefined, action.session)
      } else if (action.type === 'code') {
        show(action.codeData)
      } else if (action.type === 'success') {
        showSuccess(action.slug, action.url, action.session)
      }
    })
  },
})
