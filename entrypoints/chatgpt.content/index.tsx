import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { sendMessage } from '../../lib/messaging'

export default defineContentScript({
  matches: ['*://chatgpt.com/*'],
  cssInjectionMode: 'ui',
  registration: 'runtime',

  async main(ctx) {
    console.log('[design.computer] chatgpt content script LOADED')

    // Fetch session from web app via background
    sendMessage('getSession', undefined)
      .then((session) => {
        console.log('[design.computer] session on ChatGPT:', session)
      })
      .catch((err) => {
        console.warn('[design.computer] failed to get session:', err)
      })

    let seen = new WeakSet<Element>()
    const pending = new Set<Element>()
    let currentChatId = location.pathname.match(/\/c\/([^/]+)/)?.[1]
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
        '[data-testid="stop-button"], [aria-label="Stop streaming"], [aria-label="Stop generating"]',
      )
    }

    let lastStreamingState = false
    function broadcastStreaming() {
      const streaming = isStreaming()
      if (streaming !== lastStreamingState) {
        lastStreamingState = streaming
        document.dispatchEvent(new CustomEvent('__dc_streaming', { detail: { streaming } }))
      }
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
      // ChatGPT's code block toolbar: the buttons row is inside a sticky header
      // Look for the flex row containing the copy/edit buttons (justify-self-end container)
      const buttonsRow = block.querySelector('div[class*="sticky"] div[class*="justify-self-end"]')
      if (buttonsRow) return buttonsRow
      // Fallback: first button's parent
      return block.querySelector('button')?.parentElement ?? null
    }

    function flushPending() {
      if (pending.size === 0) return
      const deferred: Element[] = []
      pending.forEach((block) => {
        const toolbar = getToolbarButtons(block)
        if (toolbar) {
          seen.add(block)
          injectButton(block)
        } else {
          // Toolbar not rendered yet — keep in pending for next mutation
          deferred.push(block)
        }
      })
      pending.clear()
      deferred.forEach((b) => pending.add(b))
    }

    function detectCodeBlocks() {
      const blocks = document.querySelectorAll('pre[data-start]')
      console.log(
        '[design.computer] chatgpt detectCodeBlocks: found',
        blocks.length,
        'pre[data-start] elements',
      )
      blocks.forEach((block) => {
        if (seen.has(block) || pending.has(block)) return
        pending.add(block)
      })
      flushPending()
    }

    async function injectButton(block: Element) {
      const toolbar = getToolbarButtons(block)
      if (!toolbar) {
        console.warn('[design.computer] chatgpt injectButton: no toolbar found for block')
        return
      }
      if (toolbar.querySelector('dc-publish-btn')) return
      console.log('[design.computer] chatgpt injectButton: injecting publish button')

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
      toolbar.prepend(ui.shadow.host)
    }

    detectCodeBlocks()

    document.addEventListener('__dc_published', () => {
      statusPromise = Promise.resolve(true)
    })

    let wasStreaming = false
    const observer = new MutationObserver(() => {
      const streaming = isStreaming()
      broadcastStreaming()
      detectCodeBlocks()
      // When streaming just ended, flush any pending blocks that were waiting
      if (wasStreaming && !streaming && pending.size > 0) {
        // Delay to let toolbars render after streaming ends
        setTimeout(() => flushPending(), 500)
      }
      wasStreaming = streaming
    })
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      // Chat changed — reset everything and re-inject buttons with correct state
      currentChatId = new URL(newUrl).pathname.match(/\/c\/([^/]+)/)?.[1]
      statusPromise = fetchStatus()
      seen = new WeakSet<Element>()
      pending.clear()
      // Remove all existing publish buttons so they re-render with correct Publish/Update
      document.querySelectorAll('dc-publish-btn').forEach((el) => el.remove())
      detectCodeBlocks()
    })
  },
})
