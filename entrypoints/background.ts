import { onMessage } from '../lib/messaging'
import { publish, checkStatus, checkSlug, getSession, getProjects, getDomains } from '../lib/api'
import { codeToHtml } from '../lib/code-to-html'

export default defineBackground(() => {
  console.log('[design.computer] background active', { id: browser.runtime.id })

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
