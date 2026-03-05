import { sendMessage } from '../lib/messaging'
import { createPublishButton } from '../lib/publishButton'

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  async main(ctx) {
    let seen = new WeakSet<Element>()

    function getChatId(): string | undefined {
      return location.pathname.match(/\/chat\/([^/]+)/)?.[1]
    }

    function isStreaming(): boolean {
      // Claude shows a stop button while generating
      return !!document.querySelector('button[aria-label="Stop Response"]')
    }

    // Each artifact panel has a Preview/Code toggle in its header
    function getArtifactPanels(): Element[] {
      return Array.from(document.querySelectorAll('button[aria-label="Code"]'))
        .map(btn => btn.closest('.flex.flex-col.h-full.overflow-hidden'))
        .filter((el): el is Element => el !== null)
    }

    async function injectButton(panel: Element, hasExisting: boolean) {
      if (seen.has(panel)) return
      seen.add(panel)

      const chatId = getChatId()

      const { parentElement, button: btn } = await createPublishButton({
        colorClass: 'bg-amber-600',
        label: hasExisting ? 'Update' : 'Publish',
      })

      btn.addEventListener('click', async () => {
        if (btn.disabled) return
        btn.disabled = true
        btn.textContent = 'Publishing…'

        try {
          const code = await readCode(panel)
          const language = detectLanguage(panel)

          const { url } = await sendMessage('publish', { code, language, chatId })
          await navigator.clipboard.writeText(url)
          btn.textContent = '✅ Copied!'
          console.log('[design.computer] published:', url)
        } catch (err) {
          btn.textContent = '⚠ Error'
          btn.disabled = false
          console.error('[design.computer] publish failed:', err)
        }
      })

      // Insert before the Copy button in the header actions area
      const copyBtn = panel.querySelector('button.rounded-l-lg')
      if (copyBtn?.parentElement?.parentElement) {
        copyBtn.parentElement.parentElement.insertBefore(parentElement, copyBtn.parentElement)
      }
    }

    async function readCode(panel: Element): Promise<string> {
      const codeTab = panel.querySelector('button[aria-label="Code"]') as HTMLButtonElement | null
      const previewTab = panel.querySelector('button[aria-label="Preview"]') as HTMLButtonElement | null
      const wasPreview = previewTab?.getAttribute('data-state') === 'on'

      // Switch to Code view if needed
      if (wasPreview && codeTab) {
        codeTab.click()
        // Wait for code element to appear in DOM instead of fixed timeout
        await waitForElement(panel, '.code-block__code', 3000)
      }

      const contentArea = panel.querySelector('.flex-1.min-h-0')
      console.log('[design.computer] content area innerHTML:', contentArea?.innerHTML?.slice(0, 200))

      const codeEl = panel.querySelector('.code-block__code')
      console.log('[design.computer] codeEl:', codeEl?.tagName, 'text:', codeEl?.textContent?.slice(0, 80))
      const code = codeEl?.textContent ?? ''

      // Restore Preview view
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

    async function detectArtifacts() {
      if (isStreaming()) return
      const chatId = getChatId()
      const hasExisting = chatId ? (await sendMessage('checkStatus', { chatId })).exists : false
      getArtifactPanels().forEach(panel => injectButton(panel, hasExisting))
    }

    detectArtifacts()

    const observer = new MutationObserver(() => detectArtifacts())
    observer.observe(document.body, { childList: true, subtree: true })

    ctx.onInvalidated(() => observer.disconnect())

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      seen = new WeakSet()
      detectArtifacts()
    })
  },
})
