import { transform } from 'sucrase'
import { onMessage } from '../lib/messaging'
import { publish, checkStatus } from '../lib/api'

export default defineBackground(() => {
  console.log('[design.computer] background active', { id: browser.runtime.id })

  onMessage('publish', async ({ data }) => {
    const html = codeToHtml(data.code, data.language)
    return publish(html, data.chatId)
  })

  onMessage('checkStatus', async ({ data }) => {
    return checkStatus(data.chatId)
  })
})

function looksLikeHtml(code: string): boolean {
  const trimmed = code.trimStart()
  return trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')
}

function codeToHtml(code: string, language = 'plaintext'): string {
  if (language === 'html' || looksLikeHtml(code)) return code
  if (language === 'javascript' || language === 'js') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>design.computer</title></head><body><script>${code}<\/script></body></html>`
  }
  if (language === 'typescript' || language === 'ts') {
    const { code: js } = transform(code, { transforms: ['typescript'] })
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>design.computer</title></head><body><script>${js}<\/script></body></html>`
  }
  if (language === 'css') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>design.computer</title><style>${code}</style></head><body></body></html>`
  }
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>design.computer</title></head><body><pre><code class="language-${language}">${escaped}</code></pre></body></html>`
}
