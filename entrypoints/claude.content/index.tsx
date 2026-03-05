import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { sendMessage } from '../../lib/messaging'

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    let seen = new WeakSet<Element>()
    let statusPromise = fetchStatus()

    function getChatId() {
      return location.pathname.match(/\/chat\/([^/]+)/)?.[1]
    }

    function fetchStatus(): Promise<boolean> {
      const chatId = getChatId()
      if (!chatId) return Promise.resolve(false)
      return sendMessage('checkStatus', { chatId }).then(r => r.exists).catch(() => false)
    }

    function isStreaming() {
      return !!document.querySelector('button[aria-label="Stop Response"]')
    }

    function getArtifactPanels(): Element[] {
      return Array.from(document.querySelectorAll('button[aria-label="Code"]'))
        .map(btn => btn.closest('.flex.flex-col.h-full.overflow-hidden'))
        .filter((el): el is Element => el !== null)
    }

    async function readCode(panel: Element): Promise<string> {
      const codeTab = panel.querySelector('button[aria-label="Code"]') as HTMLButtonElement | null
      const previewTab = panel.querySelector('button[aria-label="Preview"]') as HTMLButtonElement | null
      const wasPreview = previewTab?.getAttribute('data-state') === 'on'

      if (wasPreview && codeTab) {
        codeTab.click()
        await waitForElement(panel, '.code-block__code', 3000)
      }

      const codeEl = panel.querySelector('.code-block__code')
      const code = codeEl?.textContent ?? ''

      if (wasPreview && previewTab) {
        previewTab.click()
      }

      return code
    }

    function waitForElement(parent: Element, selector: string, timeout: number): Promise<Element | null> {
      return new Promise(resolve => {
        const el = parent.querySelector(selector)
        if (el) return resolve(el)
        const timer = setTimeout(() => { obs.disconnect(); resolve(null) }, timeout)
        const obs = new MutationObserver(() => {
          const found = parent.querySelector(selector)
          if (found) { clearTimeout(timer); obs.disconnect(); resolve(found) }
        })
        obs.observe(parent, { childList: true, subtree: true })
      })
    }

    function detectLanguage(panel: Element): string {
      const label = panel.querySelector('h2 .text-text-400:not(.opacity-50)')?.textContent?.trim().toLowerCase()
      if (label && /^[a-z]+$/.test(label)) return label
      return 'plaintext'
    }

    async function injectButton(panel: Element) {
      if (seen.has(panel)) return
      seen.add(panel)

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
              hasExisting={hasExisting}
              colorClass="bg-amber-600"
              getCode={() => readCode(panel)}
              getLanguage={() => detectLanguage(panel)}
            />,
          )
          return root
        },
        onRemove(root) {
          root?.unmount()
        },
      })
      ui.mount()

      // Move before the copy button group
      if (copyBtn?.parentElement) {
        anchor.insertBefore(ui.shadow.host, copyBtn.parentElement)
      }
    }

    function detectArtifacts() {
      if (isStreaming()) return
      getArtifactPanels().forEach(panel => injectButton(panel))
    }

    detectArtifacts()

    const observer = new MutationObserver(() => detectArtifacts())
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      seen = new WeakSet()
      statusPromise = fetchStatus()
      detectArtifacts()
    })
  },
})
