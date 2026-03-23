import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { sendMessage } from '../../lib/messaging'

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  cssInjectionMode: 'ui',
  registration: 'runtime',

  async main(ctx) {
    console.log('[design.computer] claude content script LOADED')

    // Fetch session from web app via background
    sendMessage('getSession', undefined)
      .then((session) => {
        console.log('[design.computer] session on Claude:', session)
      })
      .catch((err) => {
        console.warn('[design.computer] failed to get session:', err)
      })

    let seenPanels = new WeakSet<Element>()
    let seenRows = new WeakSet<Element>()
    let currentChatId = location.pathname.match(/\/chat\/([^/]+)/)?.[1]
    let statusPromise = fetchStatus()

    function getChatId() {
      return currentChatId
    }

    function fetchStatus(): Promise<boolean> {
      const chatId = getChatId()
      if (!chatId) return Promise.resolve(false)
      return sendMessage('checkStatus', { chatId })
        .then((r) => r.exists)
        .catch(() => false)
    }

    function isStreaming() {
      return !!document.querySelector(
        'button[aria-label="Stop Response"], button[aria-label="Stop response"]',
      )
    }

    // Broadcast streaming state changes to publish buttons
    let lastStreamingState = false
    function broadcastStreaming() {
      const streaming = isStreaming()
      if (streaming !== lastStreamingState) {
        lastStreamingState = streaming
        document.dispatchEvent(new CustomEvent('__dc_streaming', { detail: { streaming } }))
      }
    }

    // --- Side panel buttons ---

    function getArtifactPanels(): Element[] {
      return Array.from(document.querySelectorAll('button[aria-label="Code"]'))
        .map((btn) => btn.closest('.flex.flex-col.h-full.overflow-hidden'))
        .filter((el): el is Element => el !== null)
    }

    const CODE_SELECTORS = ['.code-block__code', 'pre code', '.cm-content', 'code', 'pre']

    function findCodeElement(parent: Element): Element | null {
      for (const sel of CODE_SELECTORS) {
        const el = parent.querySelector(sel)
        if (el?.textContent?.trim()) return el
      }
      return null
    }

    async function readCodeViaClipboard(panel: Element): Promise<string | null> {
      const copyBtn = panel.querySelector('button.rounded-l-lg') as HTMLButtonElement | null
      if (!copyBtn) return null

      try {
        // Save current clipboard
        const saved = await navigator.clipboard.readText().catch(() => null)

        // Click Claude's Copy button
        copyBtn.click()
        await new Promise((r) => setTimeout(r, 200))

        // Read the code
        const code = await navigator.clipboard.readText()

        // Restore original clipboard
        if (saved !== null) {
          await navigator.clipboard.writeText(saved).catch(() => {})
        }

        if (code?.trim()) {
          console.log('[design.computer] read code via clipboard:', code.length, 'chars')
          return code
        }
      } catch (err) {
        console.warn('[design.computer] clipboard read failed:', err)
      }
      return null
    }

    async function readCode(panel: Element): Promise<string> {
      // Primary: click Claude's Copy button, read from clipboard, restore original
      const clipboardCode = await readCodeViaClipboard(panel)
      if (clipboardCode?.trim()) return clipboardCode

      // Fallback: try reading from DOM
      const codeTab = panel.querySelector('button[aria-label="Code"]') as HTMLButtonElement | null
      const previewTab = panel.querySelector(
        'button[aria-label="Preview"]',
      ) as HTMLButtonElement | null
      const wasPreview = previewTab?.getAttribute('data-state') === 'on'

      // Switch to Code tab
      if (wasPreview && codeTab) {
        codeTab.click()
        await new Promise<void>((resolve) => {
          let tries = 0
          const interval = setInterval(() => {
            tries++
            if (findCodeElement(panel) || tries > 30) {
              clearInterval(interval)
              resolve()
            }
          }, 100)
        })
      }

      const codeEl = findCodeElement(panel)
      const code = codeEl?.textContent ?? ''

      console.log(
        '[design.computer] readCode fallback:',
        code.length,
        'chars, selector:',
        codeEl?.tagName,
        codeEl?.className,
      )

      if (wasPreview && previewTab) {
        previewTab.click()
      }

      return code
    }

    function detectPanelLanguage(panel: Element): string {
      const label = panel
        .querySelector('h2 .text-text-400:not(.opacity-50)')
        ?.textContent?.trim()
        .toLowerCase()
      if (label && /^[a-z]+$/.test(label)) return label
      return 'plaintext'
    }

    async function injectPanelButton(panel: Element) {
      if (seenPanels.has(panel)) return
      seenPanels.add(panel)

      const hasExisting = await statusPromise
      const chatId = getChatId()

      const copyBtn = panel.querySelector('button.rounded-l-lg')
      const anchor = copyBtn?.parentElement?.parentElement?.parentElement
      if (!anchor) return

      const ui = await createShadowRootUi(ctx, {
        name: 'dc-publish-btn',
        position: 'inline',
        anchor,
        onMount(container) {
          const app = document.createElement('div')
          container.append(app)
          const root = ReactDOM.createRoot(app)
          root.render(
            <PublishButton
              chatId={chatId}
              chatUrl={location.href}
              hasExisting={hasExisting}
              getCode={() => readCode(panel)}
              getLanguage={() => detectPanelLanguage(panel)}
            />,
          )
          return root
        },
        onRemove(root) {
          root?.unmount()
        },
      })
      ui.mount()
      anchor.prepend(ui.shadow.host)
    }

    // --- Inline chat row buttons ---

    function getArtifactRows(): Element[] {
      return Array.from(document.querySelectorAll('[aria-label="Preview contents"]'))
    }

    function detectRowLanguage(row: Element): string {
      const meta = row.querySelector('.text-text-400')?.textContent ?? ''
      const lang = meta.split('\u00B7').pop()?.trim().toLowerCase() ?? ''
      if (lang && /^[a-z]+$/.test(lang)) return lang
      return 'plaintext'
    }

    function waitForPanel(timeout: number): Promise<Element | null> {
      return new Promise((resolve) => {
        const found = getArtifactPanels()[0]
        if (found) return resolve(found)
        const timer = setTimeout(() => {
          obs.disconnect()
          resolve(null)
        }, timeout)
        const obs = new MutationObserver(() => {
          const panel = getArtifactPanels()[0]
          if (panel) {
            clearTimeout(timer)
            obs.disconnect()
            resolve(panel)
          }
        })
        obs.observe(document.body, { childList: true, subtree: true })
      })
    }

    async function injectRowButton(row: Element) {
      if (seenRows.has(row)) return
      seenRows.add(row)

      const hasExisting = await statusPromise
      const chatId = getChatId()

      const downloadBtn = row.querySelector('button[aria-label="Download"]')
      const buttonsContainer = downloadBtn?.parentElement
      if (!buttonsContainer) return

      const ui = await createShadowRootUi(ctx, {
        name: 'dc-row-publish-btn',
        position: 'inline',
        anchor: buttonsContainer,
        isolateEvents: ['click', 'mousedown', 'pointerdown'],
        onMount(container) {
          const app = document.createElement('div')
          container.append(app)
          const root = ReactDOM.createRoot(app)
          root.render(
            <PublishButton
              chatId={chatId}
              chatUrl={location.href}
              hasExisting={hasExisting}
              getCode={async () => {
                ;(row as HTMLElement).click()
                const panel = await waitForPanel(3000)
                if (!panel) return ''
                // Wait for code to be available in the panel
                await waitForElement(panel, '.code-block__code', 3000)
                return readCode(panel)
              }}
              getLanguage={() => detectRowLanguage(row)}
            />,
          )
          return root
        },
        onRemove(root) {
          root?.unmount()
        },
      })
      ui.mount()
    }

    // --- Shared helpers ---

    function waitForElement(
      parent: Element,
      selector: string,
      timeout: number,
    ): Promise<Element | null> {
      return new Promise((resolve) => {
        const el = parent.querySelector(selector)
        if (el) return resolve(el)
        const timer = setTimeout(() => {
          obs.disconnect()
          resolve(null)
        }, timeout)
        const obs = new MutationObserver(() => {
          const found = parent.querySelector(selector)
          if (found) {
            clearTimeout(timer)
            obs.disconnect()
            resolve(found)
          }
        })
        obs.observe(parent, { childList: true, subtree: true })
      })
    }

    // --- Detection ---

    function detect() {
      const panels = getArtifactPanels()
      const rows = getArtifactRows()
      console.log('[design.computer] claude detect: panels=', panels.length, 'rows=', rows.length)
      panels.forEach((panel) => injectPanelButton(panel))
      rows.forEach((row) => injectRowButton(row))
    }

    detect()

    const observer = new MutationObserver(() => {
      broadcastStreaming()
      detect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      seenPanels = new WeakSet()
      seenRows = new WeakSet()
      currentChatId = new URL(newUrl).pathname.match(/\/chat\/([^/]+)/)?.[1]
      statusPromise = fetchStatus()
      // Remove old buttons so they re-render with correct Publish/Update
      document.querySelectorAll('dc-publish-btn').forEach((el) => el.remove())
      detect()
    })
  },
})
