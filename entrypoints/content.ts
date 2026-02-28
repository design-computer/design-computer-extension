import { sendMessage } from '../lib/messaging'

export default defineContentScript({
  matches: ['*://chatgpt.com/c/*'],
  async main(ctx) {
    console.log('[design.computer] content script active on ChatGPT')

    // Blocks already fully processed (streaming done, button injected)
    const seen = new WeakSet<Element>()
    // Blocks spotted mid-stream — waiting for streaming to finish
    const pending = new Set<Element>()

    function isStreaming(): boolean {
      return !!document.querySelector('[aria-label="Stop streaming"]')
    }

    function flushPending() {
      if (pending.size === 0 || isStreaming()) return
      pending.forEach(block => {
        seen.add(block)
        const text = block.querySelector('.cm-content')?.textContent ?? block.textContent
        console.log('[design.computer] code block detected', text?.slice(0, 80))
        injectButton(block)
      })
      pending.clear()
    }

    // ChatGPT renders code blocks as <pre data-start="..."> with a CodeMirror editor inside.
    // Queue new blocks as pending; only capture once streaming stops.
    function detectCodeBlocks(root: Document | Element = document) {
      root.querySelectorAll('pre[data-start]').forEach(block => {
        if (seen.has(block) || pending.has(block)) return
        pending.add(block)
      })
      flushPending()
    }

    function injectButton(block: Element) {
      if (block.querySelector('.dc-publish-btn')) return

      const btn = document.createElement('button')
      btn.className = 'dc-publish-btn'
      btn.textContent = 'Publish'
      Object.assign(btn.style, {
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: '9999',
        padding: '4px 10px',
        background: '#10a37f',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        fontWeight: '500',
      })
      ;(block as HTMLElement).style.position = 'relative'

      btn.addEventListener('click', async () => {
        if ((btn as HTMLButtonElement).disabled) return
        ;(btn as HTMLButtonElement).disabled = true
        btn.textContent = 'Publishing…'

        const code = block.querySelector('.cm-content')?.textContent ?? ''
        const language = detectLanguage(block)

        try {
          const { url } = await sendMessage('publish', { code, language })
          await navigator.clipboard.writeText(url)
          btn.textContent = '✅ Copied!'
          console.log('[design.computer] published:', url)
        } catch (err) {
          btn.textContent = '⚠ Error'
          ;(btn as HTMLButtonElement).disabled = false
          console.error('[design.computer] publish failed:', err)
        }
      })

      block.appendChild(btn)
    }

    // ChatGPT shows the language name in a div immediately before the <pre>
    function detectLanguage(block: Element): string {
      const label = block.previousElementSibling?.textContent?.trim().toLowerCase()
      if (label && /^[a-z]+$/.test(label)) return label
      return 'plaintext'
    }

    // Scan blocks already in DOM at script load time (existing chat, no streaming)
    detectCodeBlocks()

    // Watch for new blocks and for the stop button to disappear
    const observer = new MutationObserver(() => detectCodeBlocks())
    observer.observe(document.body, { childList: true, subtree: true })

    // Disconnect when the extension context is invalidated (update/reload)
    ctx.onInvalidated(() => observer.disconnect())

    // ChatGPT is an SPA — re-scan when navigating between chats
    ctx.addEventListener(window, 'wxt:locationchange', () => detectCodeBlocks())
  },
})
