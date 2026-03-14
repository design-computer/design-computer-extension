import '../../lib/publish-button.css'
import ReactDOM from 'react-dom/client'
import { PublishButton } from '../../components/PublishButton'
import { sendMessage } from '../../lib/messaging'

const appPattern = new MatchPattern('*://gemini.google.com/app/*')

export default defineContentScript({
  matches: ['*://gemini.google.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // Fetch session from web app via background
    sendMessage('getSession', undefined)
      .then((session) => {
        console.log('[design.computer] session on Gemini:', session)
      })
      .catch((err) => {
        console.warn('[design.computer] failed to get session:', err)
      })

    let seen = new WeakSet<Element>()
    let statusPromise = fetchStatus()

    function getChatId() {
      return location.pathname.match(/\/app\/([^/]+)/)?.[1]
    }

    function fetchStatus(): Promise<boolean> {
      const chatId = getChatId()
      if (!chatId) return Promise.resolve(false)
      return sendMessage('checkStatus', { chatId })
        .then((r) => r.exists)
        .catch(() => false)
    }

    function isStreaming() {
      return !!document.querySelector('button[aria-label="Stop generating"]')
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

      const buttonsDiv = codeContainer.querySelector('.code-block-decoration .buttons')
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
              colorClass="bg-[#1a73e8]"
              getCode={() => codeEl.textContent ?? ''}
              getLanguage={() => detectLanguage(codeContainer)}
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

      // Prepend instead of default append
      if (buttonsDiv) {
        buttonsDiv.prepend(ui.shadow.host)
      }
    }

    function detectCodeBlocks() {
      if (isStreaming()) return
      document
        .querySelectorAll('code[data-test-id="code-content"]')
        .forEach((el) => injectButton(el))
    }

    detectCodeBlocks()

    const observer = new MutationObserver(() => detectCodeBlocks())
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      if (appPattern.includes(newUrl)) {
        seen = new WeakSet()
        statusPromise = fetchStatus()
        detectCodeBlocks()
      }
    })
  },
})
