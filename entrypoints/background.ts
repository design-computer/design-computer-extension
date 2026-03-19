import { onMessage } from '../lib/messaging'
import {
  publish,
  checkStatus,
  checkSlug,
  getSession,
  getProjects,
  getDomains,
  logout,
} from '../lib/api'
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

  // Cached code data from publish button click
  let pendingCodeData: {
    code: string
    language: string
    chatId?: string
    chatUrl?: string
  } | null = null

  // Handle messages from content scripts and options page
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message?.type === 'openPanelWithCode' && sender.tab?.id) {
      // Store code data, then inject/toggle panel
      pendingCodeData = {
        code: message.code,
        language: message.language,
        chatId: message.chatId,
        chatUrl: message.chatUrl,
      }
      // Inject panel in the sender's tab
      ;(async () => {
        const tabId = sender.tab!.id!
        try {
          await browser.tabs.sendMessage(tabId, { type: 'openPanelWithCode', ...pendingCodeData })
        } catch {
          // Panel not injected yet
          try {
            await browser.scripting.executeScript({
              target: { tabId },
              files: ['content-scripts/panel.js'],
            })
            // Wait a bit for panel to initialize, then send data
            setTimeout(() => {
              browser.tabs.sendMessage(tabId, { type: 'openPanelWithCode', ...pendingCodeData })
            }, 300)
          } catch {
            browser.runtime.openOptionsPage()
          }
        }
      })()
      return
    }

    if (message?.type === 'openPanelWithSuccess' && sender.tab?.id) {
      // Update completed — open panel showing success state with confetti
      ;(async () => {
        const tabId = sender.tab!.id!
        const successData = {
          type: 'openPanelWithSuccess',
          slug: message.slug,
          url: message.url,
          session: message.session,
        }
        try {
          await browser.tabs.sendMessage(tabId, successData)
        } catch {
          try {
            await browser.scripting.executeScript({
              target: { tabId },
              files: ['content-scripts/panel.js'],
            })
            setTimeout(() => {
              browser.tabs.sendMessage(tabId, successData)
            }, 300)
          } catch {
            browser.runtime.openOptionsPage()
          }
        }
      })()
      return
    }

    if (message?.type === 'getPendingCode') {
      // Panel asks for pending code data
      const data = pendingCodeData
      pendingCodeData = null
      return data
    }

    if (message?.type === 'registerContentScripts') {
      registerGrantedContentScripts()
    }
  })

  // Extension icon click → open options if no permissions granted, otherwise toggle panel
  browser.action.onClicked.addListener(async (tab) => {
    console.log('[design.computer] icon clicked, tab:', tab.id, 'url:', tab.url)
    const hasAny = await hasAnyPermission()
    if (!hasAny) {
      console.log('[design.computer] no permissions granted, opening options')
      browser.runtime.openOptionsPage()
      return
    }
    if (!tab.id) return
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'togglePanel' })
      console.log('[design.computer] togglePanel sent OK')
    } catch (err) {
      console.log('[design.computer] togglePanel failed, injecting scripts:', err)
      // Panel not injected yet — inject it
      try {
        // Inject panel
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/panel.js'],
        })
        console.log('[design.computer] panel.js injected')

        // Also inject the publish button script for this platform if not already active
        console.log('[design.computer] tab.url:', tab.url ?? 'UNDEFINED')
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

          console.log('[design.computer] platform:', url.hostname, 'script:', platformScript)
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
              console.log('[design.computer] platform script injected:', platformScript)
            } catch (e) {
              console.warn('[design.computer] platform script injection failed:', e)
            }
          }
        }
      } catch (e) {
        console.warn('[design.computer] panel injection failed, opening options:', e)
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

  onMessage('logout', async () => {
    await logout()
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
  console.log('[design.computer] registerGrantedContentScripts called')
  for (const origin of AI_ORIGINS) {
    const has = await browser.permissions.contains({ origins: [origin] })
    console.log(`[design.computer] permission check ${origin}: ${has}`)
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
      console.log(`[design.computer] existing registration for ${id}:`, existing.length)
      if (existing.length > 0) continue
    } catch (e) {
      console.warn(`[design.computer] getRegisteredContentScripts failed for ${id}:`, e)
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

  // Inject into already-open tabs (no refresh needed)
  const hostMap: Record<string, { js: string; css: string }> = {
    'claude.ai': { js: 'content-scripts/claude.js', css: 'content-scripts/claude.css' },
    'chatgpt.com': { js: 'content-scripts/chatgpt.js', css: 'content-scripts/chatgpt.css' },
    'gemini.google.com': { js: 'content-scripts/gemini.js', css: 'content-scripts/gemini.css' },
  }

  for (const [host, files] of Object.entries(hostMap)) {
    const has = await browser.permissions.contains({ origins: [`*://${host}/*`] })
    if (!has) continue
    try {
      const tabs = await browser.tabs.query({ url: `*://${host}/*` })
      for (const tab of tabs) {
        if (!tab.id) continue
        try {
          await browser.scripting.insertCSS({ target: { tabId: tab.id }, files: [files.css] })
          await browser.scripting.executeScript({ target: { tabId: tab.id }, files: [files.js] })
        } catch {
          /* tab might be loading or restricted */
        }
      }
    } catch {
      /* ignore */
    }
  }
}
