import { onMessage, sendMessage } from '../lib/messaging'
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

  // Extension icon click → open options if no permissions granted, otherwise toggle panel
  browser.action.onClicked.addListener(async (tab) => {
    const hasAny = await hasAnyPermission()
    if (!hasAny) {
      browser.runtime.openOptionsPage()
      return
    }
    if (!tab.id) return
    try {
      await browser.tabs.sendMessage(tab.id, { type: '__dc_togglePanel' })
    } catch {
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/panel.js'],
        })
        if (tab.url) {
          await injectPlatformScripts(tab.id, tab.url)
        }
      } catch {
        browser.runtime.openOptionsPage()
      }
    }
  })

  // ── onMessage handlers (all via @webext-core/messaging) ──

  onMessage('openPanelWithCode', async ({ data, sender }) => {
    const tabId = sender.tab?.id
    if (!tabId) return
    try {
      await browser.tabs.sendMessage(tabId, { type: '__dc_openPanelWithCode', ...data })
    } catch {
      try {
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/panel.js'],
        })
        setTimeout(() => {
          browser.tabs.sendMessage(tabId, { type: '__dc_openPanelWithCode', ...data })
        }, 300)
      } catch {
        browser.runtime.openOptionsPage()
      }
    }
  })

  onMessage('openPanelWithSuccess', async ({ data, sender }) => {
    const tabId = sender.tab?.id
    if (!tabId) return
    const successData = { type: '__dc_openPanelWithSuccess', ...data }
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
  })

  onMessage('registerContentScripts', async () => {
    await registerGrantedContentScripts()
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
    return getSession()
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

async function injectPlatformScripts(tabId: number, tabUrl: string) {
  const url = new URL(tabUrl)
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
  if (!platformScript) return
  try {
    if (platformCss) await browser.scripting.insertCSS({ target: { tabId }, files: [platformCss] })
    await browser.scripting.executeScript({ target: { tabId }, files: [platformScript] })
  } catch {
    /* already injected or no permission */
  }
}

async function registerGrantedContentScripts() {
  for (const origin of AI_ORIGINS) {
    const has = await browser.permissions.contains({ origins: [origin] })
    if (!has) continue

    let id: string | null = null
    if (origin.includes('claude.ai')) id = 'claude'
    else if (origin.includes('chatgpt.com')) id = 'chatgpt'
    else if (origin.includes('gemini.google.com')) id = 'gemini'
    if (!id) continue

    try {
      const existing = await browser.scripting.getRegisteredContentScripts({ ids: [id] })
      if (existing.length > 0) continue
    } catch {
      /* ignore */
    }

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
    } catch {
      /* ignore */
    }
  }

  // Inject into already-open tabs
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
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }
}
