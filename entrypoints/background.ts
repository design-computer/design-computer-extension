import { onMessage } from '../lib/messaging'
import { publish, checkStatus, getSession } from '../lib/api'
import { codeToHtml } from '../lib/code-to-html'

export default defineBackground(() => {
  console.log('[design.computer] background active', { id: browser.runtime.id })

  // Respond to pings from the web app for extension detection
  browser.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'ping') {
      sendResponse({ installed: true })
    }
  })

  onMessage('publish', async ({ data }) => {
    const html = codeToHtml(data.code, data.language)
    return publish(html, data.chatId)
  })

  onMessage('checkStatus', async ({ data }) => {
    return checkStatus(data.chatId)
  })

  onMessage('getSession', async () => {
    const session = await getSession()
    console.log('[design.computer] session:', session)
    return session
  })
})
