import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { sendMessage } from '../../lib/messaging'

const appPattern = new MatchPattern('*://gemini.google.com/app/*')

export default defineContentScript({
  matches: ['*://gemini.google.com/*'],
  cssInjectionMode: 'ui',
  registration: 'runtime',

  async main(ctx) {
    // Fetch session from web app via background
    sendMessage('getSession', undefined)
      .then(() => {})
      .catch((err) => console.error('[design.computer] prefetch session:', err))

    let seen = new WeakSet<Element>()
    let currentChatId = location.pathname.match(/\/app\/([^/]+)/)?.[1]
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
        'button.send-button.stop, button[aria-label="Stop generating"]',
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

    function detectLanguage(codeContainer: Element): string {
      const label = codeContainer
        .querySelector('.code-block-decoration span')
        ?.textContent?.trim()
        .toLowerCase()
      if (label && /^[a-z]+$/.test(label)) return label
      return 'plaintext'
    }

    async function injectButton(codeEl: Element) {
      const codeContainer = codeEl.closest('.code-block')
      if (!codeContainer) return
      if (seen.has(codeContainer)) return
      seen.add(codeContainer)

      const hasExisting = await statusPromise
      const chatId = getChatId()

      const buttonsDiv =
        codeContainer.querySelector('.buttons') ||
        codeContainer.querySelector('.code-block-decoration .buttons')
      const anchor = buttonsDiv || codeContainer

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
              getCode={() => codeEl.textContent ?? ''}
              getLanguage={() => detectLanguage(codeContainer)}
              size="default"
            />,
          )
          return root
        },
        onRemove(root) {
          root?.unmount()
        },
      })
      ui.mount()

      if (buttonsDiv) {
        ;(buttonsDiv as HTMLElement).style.display = 'flex'
        ;(buttonsDiv as HTMLElement).style.alignItems = 'center'
        buttonsDiv.prepend(ui.shadow.host)
      }
    }

    function detectCodeBlocks() {
      const blocks = document.querySelectorAll('code[data-test-id="code-content"]')
      blocks.forEach((el) => injectButton(el))
    }

    detectCodeBlocks()

    const onPublished = () => {
      statusPromise = Promise.resolve(true)
    }
    document.addEventListener('__dc_published', onPublished)
    ctx.onInvalidated(() => document.removeEventListener('__dc_published', onPublished))

    // TODO: Throttle with requestAnimationFrame — this callback fires on every DOM
    // mutation (hundreds/sec during streaming) and runs querySelectorAll each time.
    const observer = new MutationObserver(() => {
      broadcastStreaming()
      detectCodeBlocks()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      if (appPattern.includes(newUrl)) {
        seen = new WeakSet()
        currentChatId = new URL(newUrl).pathname.match(/\/app\/([^/]+)/)?.[1]
        statusPromise = currentChatId
          ? sendMessage('checkStatus', { chatId: currentChatId })
              .then((r) => r.exists)
              .catch(() => false)
          : Promise.resolve(false)
        document.querySelectorAll('dc-publish-btn').forEach((el) => el.remove())
        detectCodeBlocks()
      }
    })
  },
})
