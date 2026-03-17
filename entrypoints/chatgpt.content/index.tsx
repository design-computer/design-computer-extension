import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { sendMessage } from '../../lib/messaging'

export default defineContentScript({
  matches: ['*://chatgpt.com/*'],
  cssInjectionMode: 'ui',
  registration: 'runtime',

  async main(ctx) {
    console.log('[design.computer] content script active on ChatGPT')

    // Fetch session from web app via background
    sendMessage('getSession', undefined)
      .then((session) => {
        console.log('[design.computer] session on ChatGPT:', session)
      })
      .catch((err) => {
        console.warn('[design.computer] failed to get session:', err)
      })

    const seen = new WeakSet<Element>()
    const pending = new Set<Element>()
    let statusPromise = fetchStatus()

    function getChatId() {
      return location.pathname.match(/\/c\/([^/]+)/)?.[1]
    }

    function fetchStatus(): Promise<boolean> {
      const chatId = getChatId()
      if (!chatId) return Promise.resolve(false)
      return sendMessage('checkStatus', { chatId })
        .then((r) => r.exists)
        .catch(() => false)
    }

    function isStreaming() {
      // ChatGPT has changed this aria-label over time — check both variants
      return !!document.querySelector(
        '[aria-label="Stop streaming"], [aria-label="Stop generating"]',
      )
    }

    function detectLanguage(block: Element): string {
      // Language label is inside the sticky header within the <pre>
      const inner =
        block
          .querySelector('div[class*="sticky"] div:first-child')
          ?.textContent?.trim()
          .toLowerCase() ??
        block
          .querySelector('div[class*="text-token-text-primary"]')
          ?.textContent?.trim()
          .toLowerCase()
      if (inner && /^[a-z]+$/.test(inner)) return inner
      return 'plaintext'
    }

    /** Find the toolbar buttons container inside a code block */
    function getToolbarButtons(block: Element): Element | null {
      // The first button inside the pre is the Copy button; its parent is the buttons flex row
      return block.querySelector('button')?.parentElement ?? null
    }

    function flushPending() {
      if (pending.size === 0 || isStreaming()) return
      pending.forEach((block) => {
        seen.add(block)
        injectButton(block)
      })
      pending.clear()
    }

    function detectCodeBlocks() {
      document.querySelectorAll('pre[data-start]').forEach((block) => {
        if (seen.has(block) || pending.has(block)) return
        pending.add(block)
      })
      flushPending()
    }

    async function injectButton(block: Element) {
      const toolbar = getToolbarButtons(block)
      if (!toolbar) return
      if (toolbar.querySelector('dc-publish-btn')) return

      const hasExisting = await statusPromise
      const chatId = getChatId()

      const ui = await createShadowRootUi(ctx, {
        name: 'dc-publish-btn',
        position: 'inline',
        anchor: toolbar,
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
              colorClass="bg-[#10a37f]"
              getCode={() => block.querySelector('.cm-content')?.textContent ?? ''}
              getLanguage={() => detectLanguage(block)}
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
