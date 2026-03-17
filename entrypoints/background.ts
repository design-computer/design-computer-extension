import { onMessage } from '../lib/messaging'
import { publish, checkStatus, checkSlug, getSession, getProjects, getDomains } from '../lib/api'
import { codeToHtml } from '../lib/code-to-html'

const AI_ORIGINS = ['*://claude.ai/*', '*://chatgpt.com/*', '*://gemini.google.com/*']

export default defineBackground(() => {
  console.log('[design.computer] background active', { id: browser.runtime.id })

  // Open options page on first install
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      browser.runtime.openOptionsPage()
    }
  })

  // On startup, register content scripts for any already-granted permissions
  registerGrantedContentScripts()

  // Respond to pings from the web app for extension detection
  browser.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'ping') {
      sendResponse({ installed: true })
    }
  })

  // Cached panel data — pre-fetched before panel injection
  let cachedPanelData: {
    session: Awaited<ReturnType<typeof getSession>>
    status: Awaited<ReturnType<typeof checkStatus>> | null
    chatId: string | null
  } | null = null

  // Extension icon click → pre-fetch data, then inject panel
  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) return

    try {
      // Try sending toggle message first (panel already injected)
      await browser.tabs.sendMessage(tab.id, { type: 'togglePanel' })
    } catch {
      // Panel not injected yet — pre-fetch data, then inject
      try {
        // Extract chatId from tab URL
        const url = new URL(tab.url)
        let chatId: string | null = null
        if (url.hostname === 'claude.ai')
          chatId = url.pathname.match(/\/chat\/([^/]+)/)?.[1] || null
        else if (url.hostname === 'chatgpt.com')
          chatId = url.pathname.match(/\/c\/([^/]+)/)?.[1] || null
        else if (url.hostname === 'gemini.google.com')
          chatId = url.pathname.match(/\/app\/([^/]+)/)?.[1] || null

        // Pre-fetch session + status in parallel
        const [session, status] = await Promise.all([
          getSession(),
          chatId ? checkStatus(chatId) : Promise.resolve(null),
        ])

        cachedPanelData = { session, status, chatId }

        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/panel.js'],
        })
      } catch {
        browser.runtime.openOptionsPage()
      }
    }
  })

  onMessage('getPanelData', () => {
    const data = cachedPanelData
    return data ?? { session: null, status: null, chatId: null }
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
