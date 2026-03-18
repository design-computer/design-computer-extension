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

  // Extension icon click → open options if no permissions granted, otherwise toggle panel
  browser.action.onClicked.addListener(async (tab) => {
    const hasAny = await hasAnyPermission()
    if (!hasAny) {
      browser.runtime.openOptionsPage()
      return
    }
    if (!tab.id) return
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'togglePanel' })
    } catch {
      // Panel not injected yet — inject it
      try {
        // Inject panel
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/panel.js'],
        })

        // Also inject the publish button script for this platform if not already active
        if (tab.url) {
          const url = new URL(tab.url)
          let platformScript: string | null = null
          let platformCss: string | null = null
          if (url.hostname === 'chatgpt.com') {
            platformScript = 'content-scripts/chatgpt.js'
            platformCss = 'content-scripts/chatgpt.css'
          } else if (url.hostname === 'claude.ai') {
            platformScript = 'content-scripts/claude.js'
            platformCss = 'content-scripts/claude.css'
          } else if (url.hostname.endsWith('gemini.google.com')) {
            platformScript = 'content-scripts/gemini.js'
            platformCss = 'content-scripts/gemini.css'
          }

          if (platformScript) {
            try {
              if (platformCss) {
                await browser.scripting.insertCSS({
                  target: { tabId: tab.id },
                  files: [platformCss],
                })
              }
              await browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: [platformScript],
              })
            } catch {
              /* already injected or no permission */
            }
          }
        }
      } catch {
        // No permission for this site — open options page
        browser.runtime.openOptionsPage()
      }
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

async function hasAnyPermission(): Promise<boolean> {
  for (const origin of AI_ORIGINS) {
    const has = await browser.permissions.contains({ origins: [origin] })
    if (has) return true
  }
  return false
}

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
