import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { sendMessage } from '../../lib/messaging'

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
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
    let statusPromise = fetchStatus()

    function getChatId() {
      return location.pathname.match(/\/chat\/([^/]+)/)?.[1]
    }

    function fetchStatus(): Promise<boolean> {
      const chatId = getChatId()
      if (!chatId) return Promise.resolve(false)
      return sendMessage('checkStatus', { chatId })
        .then((r) => r.exists)
        .catch(() => false)
    }

    function isStreaming() {
      return !!document.querySelector('button[aria-label="Stop Response"]')
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

    async function readCode(panel: Element): Promise<string> {
      const codeTab = panel.querySelector('button[aria-label="Code"]') as HTMLButtonElement | null
      const previewTab = panel.querySelector(
        'button[aria-label="Preview"]',
      ) as HTMLButtonElement | null
      const wasPreview = previewTab?.getAttribute('data-state') === 'on'

      // Try reading from the preview iframe first (HTML artifacts)
      if (wasPreview) {
        try {
          const iframe = panel.querySelector(
            'iframe[title="Claude content"]',
          ) as HTMLIFrameElement | null
          const iframeDoc = iframe?.contentDocument
          if (iframeDoc?.documentElement) {
            const html = iframeDoc.documentElement.outerHTML
            if (html.trim()) {
              console.log('[design.computer] read HTML from preview iframe')
              return html
            }
          }
        } catch {
          // cross-origin — fall through to code tab
        }
      }

      // Switch to Code tab
      if (wasPreview && codeTab) {
        codeTab.click()
        // Wait for any code element to appear
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
        '[design.computer] readCode result:',
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
      const anchor = copyBtn?.parentElement?.parentElement
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
              colorClass="bg-amber-600"
              getCode={() => readCode(panel)}
              getLanguage={() => detectPanelLanguage(panel)}
              onPublished={() => {
                statusPromise = Promise.resolve(true)
              }}
            />,
          )
          return root
        },
        onRemove(root) {
          root?.unmount()
        },
      })
      ui.mount()

      if (copyBtn?.parentElement) {
        anchor.insertBefore(ui.shadow.host, copyBtn.parentElement)
      }
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
              colorClass="bg-amber-600"
              getCode={async () => {
                ;(row as HTMLElement).click()
                const panel = await waitForPanel(3000)
                if (!panel) return ''
                // Wait for code to be available in the panel
                await waitForElement(panel, '.code-block__code', 3000)
                return readCode(panel)
              }}
              getLanguage={() => detectRowLanguage(row)}
              onPublished={() => {
                statusPromise = Promise.resolve(true)
              }}
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
      if (isStreaming()) return
      getArtifactPanels().forEach((panel) => injectPanelButton(panel))
      getArtifactRows().forEach((row) => injectRowButton(row))
    }

    detect()

    const observer = new MutationObserver(() => detect())
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      seenPanels = new WeakSet()
      seenRows = new WeakSet()
      statusPromise = fetchStatus()
      detect()
    })
  },
})
