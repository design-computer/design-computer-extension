import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { CODE_SELECTORS } from '../../lib/constants'
import { sendMessage } from '../../lib/messaging'

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  cssInjectionMode: 'ui',
  registration: 'runtime',

  async main(ctx) {
    // Fetch session from web app via background
    sendMessage('getSession', undefined)
      .then(() => {})
      .catch((err) => console.error('[design.computer] prefetch session:', err))

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

    function findCodeElement(parent: Element): Element | null {
      for (const sel of CODE_SELECTORS) {
        const el = parent.querySelector(sel)
        if (el?.textContent?.trim()) return el
      }
      return null
    }

    async function readCodeViaClipboardIntercept(panel: Element): Promise<string | null> {
      // Click Claude's copy button and intercept the clipboard write via injected page script
      const copyBtn = panel.querySelector('button.rounded-l-lg') as HTMLButtonElement | null
      if (!copyBtn) return null

      return new Promise<string | null>((resolve) => {
        let resolved = false
        const handler = (e: Event) => {
          if (resolved) return
          resolved = true
          document.removeEventListener('__dc_clipboard_capture', handler)
          resolve((e as CustomEvent).detail?.text || null)
        }
        document.addEventListener('__dc_clipboard_capture', handler)

        // Inject page-context script to intercept navigator.clipboard.writeText
        // Extension resources bypass page CSP
        const script = document.createElement('script')
        script.src = browser.runtime.getURL('/clipboard-intercept.js')
        document.head.appendChild(script)
        script.remove()

        // Give the script time to load and patch, then click
        setTimeout(() => copyBtn.click(), 50)

        // Timeout fallback
        setTimeout(() => {
          if (resolved) return
          resolved = true
          document.removeEventListener('__dc_clipboard_capture', handler)
          resolve(null)
        }, 2000)
      })
    }

    async function readCode(panel: Element): Promise<string> {
      const codeTab = panel.querySelector('button[aria-label="Code"]') as HTMLButtonElement | null
      const previewTab = panel.querySelector(
        'button[aria-label="Preview"]',
      ) as HTMLButtonElement | null
      const wasPreview = previewTab?.getAttribute('data-state') === 'on'

      // Switch to Code tab if on Preview
      if (wasPreview && codeTab) {
        codeTab.click()
        await new Promise<void>((resolve) => {
          let tries = 0
          const interval = setInterval(() => {
            tries++
            if (
              findCodeElement(panel) ||
              panel.querySelector('#wiggle-file-content') ||
              tries > 30
            ) {
              clearInterval(interval)
              resolve()
            }
          }, 100)
        })
      }

      // Primary: intercept clipboard write from Claude's copy button (no clipboardRead needed)
      const clipboardCode = await readCodeViaClipboardIntercept(panel)
      if (clipboardCode?.trim()) {
        if (wasPreview && previewTab) previewTab.click()
        return clipboardCode
      }

      // Fallback: read from DOM
      const codeEl = findCodeElement(panel)
      const code = codeEl?.textContent ?? ''

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
      if (anchor.querySelector('dc-publish-btn')) return

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

    // --- Inline code blocks (non-artifact) ---

    let seenInlineBlocks = new WeakSet<Element>()

    function getInlineCodeBlocks(): Element[] {
      return Array.from(document.querySelectorAll('div[role="group"][aria-label*="code"]'))
    }

    function detectInlineLanguage(block: Element): string {
      // Language label is a div with text like "html", "css", etc.
      const label = block.querySelector('.text-text-500')?.textContent?.trim().toLowerCase()
      if (label && /^[a-z]+$/.test(label)) return label
      // Also check the code element's class
      const codeEl = block.querySelector('code[class*="language-"]')
      const langClass = codeEl?.className.match(/language-(\w+)/)?.[1]
      if (langClass) return langClass
      return 'plaintext'
    }

    async function injectInlineButton(block: Element) {
      if (seenInlineBlocks.has(block)) return
      // Skip if this block already has a publish button (could be an artifact panel too)
      if (
        block.querySelector('dc-publish-btn') ||
        block.closest('.flex.flex-col.h-full.overflow-hidden')?.querySelector('dc-publish-btn')
      )
        return
      seenInlineBlocks.add(block)

      // Find the copy button's container to place our button next to it
      const copyBtn = block.querySelector('button[aria-label="Copy to clipboard"]')
      const buttonsContainer = copyBtn?.parentElement
      if (!buttonsContainer) return
      if (buttonsContainer.querySelector('dc-publish-btn')) return

      const hasExisting = await statusPromise
      const chatId = getChatId()

      const ui = await createShadowRootUi(ctx, {
        name: 'dc-publish-btn',
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
              getCode={() => {
                const codeEl = block.querySelector('pre code')
                return codeEl?.textContent ?? ''
              }}
              getLanguage={() => detectInlineLanguage(block)}
            />,
          )
          return root
        },
        onRemove(root) {
          root?.unmount()
        },
      })
      ui.mount()
      buttonsContainer.prepend(ui.shadow.host)
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
      const inlineBlocks = getInlineCodeBlocks()
      panels.forEach((panel) => injectPanelButton(panel))
      rows.forEach((row) => injectRowButton(row))
      inlineBlocks.forEach((block) => injectInlineButton(block))
    }

    detect()

    // When a publish happens, new buttons should know a project exists
    const onPublished = () => {
      statusPromise = Promise.resolve(true)
    }
    document.addEventListener('__dc_published', onPublished)
    ctx.onInvalidated(() => document.removeEventListener('__dc_published', onPublished))

    // TODO: Throttle with requestAnimationFrame — this callback fires on every DOM
    // mutation (hundreds/sec during streaming) and runs querySelectorAll each time.
    const observer = new MutationObserver(() => {
      broadcastStreaming()
      detect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      seenPanels = new WeakSet()
      seenRows = new WeakSet()
      seenInlineBlocks = new WeakSet()
      currentChatId = new URL(newUrl).pathname.match(/\/chat\/([^/]+)/)?.[1]
      statusPromise = fetchStatus()
      // Remove old buttons so they re-render with correct Publish/Update
      document.querySelectorAll('dc-publish-btn').forEach((el) => el.remove())
      detect()
    })
  },
})
