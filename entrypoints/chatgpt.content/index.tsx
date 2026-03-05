import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { sendMessage } from '../../lib/messaging'

export default defineContentScript({
  matches: ['*://chatgpt.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('[design.computer] content script active on ChatGPT')

    const seen = new WeakSet<Element>()
    const pending = new Set<Element>()
    let statusPromise = fetchStatus()

    function getChatId() {
      return location.pathname.match(/\/c\/([^/]+)/)?.[1]
    }

    function fetchStatus(): Promise<boolean> {
      const chatId = getChatId()
      if (!chatId) return Promise.resolve(false)
      return sendMessage('checkStatus', { chatId }).then(r => r.exists).catch(() => false)
    }

    function isStreaming() {
      return !!document.querySelector('[aria-label="Stop streaming"]')
    }

    function detectLanguage(block: Element): string {
      const label = block.previousElementSibling?.textContent?.trim().toLowerCase()
      if (label && /^[a-z]+$/.test(label)) return label
      return 'plaintext'
    }

    function flushPending() {
      if (pending.size === 0 || isStreaming()) return
      pending.forEach(block => {
        seen.add(block)
        injectButton(block)
      })
      pending.clear()
    }

    function detectCodeBlocks() {
      document.querySelectorAll('pre[data-start]').forEach(block => {
        if (seen.has(block) || pending.has(block)) return
        pending.add(block)
      })
      flushPending()
    }

    async function injectButton(block: Element) {
      if (block.querySelector('dc-publish-btn')) return

      const hasExisting = await statusPromise
      const chatId = getChatId()
      ;(block as HTMLElement).style.position = 'relative'

      const ui = await createShadowRootUi(ctx, {
        name: 'dc-publish-btn',
        position: 'inline',
        anchor: block,
        onMount(container) {
          const app = document.createElement('div')
          container.append(app)
          const root = ReactDOM.createRoot(app)
          root.render(
            <PublishButton
              chatId={chatId}
              hasExisting={hasExisting}
              colorClass="bg-[#10a37f]"
              getCode={() => block.querySelector('.cm-content')?.textContent ?? ''}
              getLanguage={() => detectLanguage(block)}
            />,
          )
          return root
        },
        onRemove(root) {
          root?.unmount()
        },
      })
      ui.mount()

      Object.assign((ui.shadow.host as HTMLElement).style, {
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: '9999',
      })
    }

    detectCodeBlocks()

    const observer = new MutationObserver(() => detectCodeBlocks())
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      statusPromise = fetchStatus()
      detectCodeBlocks()
    })
  },
})
