import { onMessage } from '../lib/messaging'
import { publish } from '../lib/api'

export default defineBackground(() => {
  console.log('[design.computer] background active', { id: browser.runtime.id })

  onMessage('publish', async ({ data }) => {
    const html = codeToHtml(data.code, data.language)
    return publish(html)
  })
})

function codeToHtml(code: string, language = 'plaintext'): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>design.computer</title></head><body><pre><code class="language-${language}">${escaped}</code></pre></body></html>`
}
