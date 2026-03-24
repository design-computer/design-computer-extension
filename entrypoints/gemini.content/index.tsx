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
    console.log('[design.computer] gemini content script LOADED')

    // Fetch session from web app via background
    sendMessage('getSession', undefined)
      .then((session) => {
        console.log('[design.computer] session on Gemini:', session)
      })
      .catch((err) => {
        console.warn('[design.computer] failed to get session:', err)
      })

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
        console.log(
          '[design.computer] gemini streaming:',
          streaming,
          'stop-btn:',
          !!document.querySelector('button.send-button.stop'),
          'aria:',
          !!document.querySelector('button[aria-label="Stop generating"]'),
        )
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
      console.log(
        '[design.computer] gemini detectCodeBlocks: found',
        blocks.length,
        'code elements',
      )
      blocks.forEach((el) => injectButton(el))
    }

    detectCodeBlocks()

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
