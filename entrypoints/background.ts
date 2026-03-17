import { onMessage } from '../lib/messaging'
import { publish, checkStatus, checkSlug, getSession, getProjects, getDomains } from '../lib/api'
import { codeToHtml } from '../lib/code-to-html'

const AI_ORIGINS = ['*://claude.ai/*', '*://chatgpt.com/*', '*://gemini.google.com/*']

export default defineBackground(() => {
  console.log('[design.computer] background active', { id: browser.runtime.id })

  // On startup, register content scripts for any already-granted permissions
  registerGrantedContentScripts()

  // Respond to pings from the web app for extension detection
  browser.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'ping') {
      sendResponse({ installed: true })
    }
  })

  // Extension icon click → toggle panel in active tab
  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'togglePanel' })
    } catch {
      // Content script not loaded on this page — ignore
    }
  })

  onMessage('grantPermissions', async ({ data }) => {
    try {
      const granted = await browser.permissions.request({ origins: data.origins })
      if (granted) {
        await registerGrantedContentScripts()
      }
      return granted
    } catch {
      return false
    }
  })

  onMessage('publish', async ({ data }) => {
    const html = codeToHtml(data.code, data.language)
    return publish(html, data.chatId, data.chatUrl, data.slug, data.domain)
  })

  onMessage('checkStatus', async ({ data }) => {
    return checkStatus(data.chatId)
  })

  onMessage('checkSlug', async ({ data }) => {
    return checkSlug(data.slug)
  })

  onMessage('getProjects', async () => {
    return getProjects()
  })

  onMessage('getDomains', async () => {
    return getDomains()
  })

  onMessage('getSession', async () => {
    const session = await getSession()
    console.log('[design.computer] session:', session)
    return session
  })
})

async function registerGrantedContentScripts() {
  for (const origin of AI_ORIGINS) {
    const has = await browser.permissions.contains({ origins: [origin] })
    if (!has) continue

    // Determine which content script to register
    let id: string | null = null
    if (origin.includes('claude.ai')) id = 'claude'
    else if (origin.includes('chatgpt.com')) id = 'chatgpt'
    else if (origin.includes('gemini.google.com')) id = 'gemini'
    if (!id) continue

    // Check if already registered
    try {
      const existing = await browser.scripting.getRegisteredContentScripts({ ids: [id] })
      if (existing.length > 0) continue
    } catch {
      /* ignore */
    }

    // Register the content script
    try {
      await browser.scripting.registerContentScripts([
        {
          id,
          matches: [origin],
          js: [`content-scripts/${id}.js`],
          css: [`content-scripts/${id}.css`],
          runAt: 'document_idle',
        },
      ])
      console.log(`[design.computer] registered content script: ${id}`)
    } catch (err) {
      console.warn(`[design.computer] failed to register ${id}:`, err)
    }
  }
}
