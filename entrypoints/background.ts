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

  // Allow content scripts to access session storage
  browser.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })

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

  // Extension icon click
  browser.action.onClicked.addListener(async (tab) => {
    const hasAny = await hasAnyPermission()
    if (!hasAny) {
      browser.runtime.openOptionsPage()
      return
    }
    if (!tab.id) return

    const session = await getSession()

    try {
      await sendMessage('togglePanel', { session }, tab.id)
    } catch {
      // Panel not injected — store action and inject
      await browser.storage.session.set({ __dc_panel_action: { type: 'toggle', session } })
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/panel.js'],
        })
      } catch {
        browser.runtime.openOptionsPage()
      }
    }
  })

  // ── onMessage handlers ──

  onMessage('openPanelWithCode', async ({ data, sender }) => {
    const tabId = sender.tab?.id
    if (!tabId) return
    try {
      await sendMessage('openPanelWithCode', data, tabId)
    } catch {
      await browser.storage.session.set({ __dc_panel_action: { type: 'code', codeData: data } })
      try {
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/panel.js'],
        })
      } catch {
        browser.runtime.openOptionsPage()
      }
    }
  })

  onMessage('openPanelWithSuccess', async ({ data, sender }) => {
    const tabId = sender.tab?.id
    if (!tabId) return
    try {
      await sendMessage('openPanelWithSuccess', data, tabId)
    } catch {
      await browser.storage.session.set({ __dc_panel_action: { type: 'success', ...data } })
      try {
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/panel.js'],
        })
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
      if (granted) await registerGrantedContentScripts()
      return granted
    } catch {
      return false
    }
  })

  onMessage('publish', async ({ data }) => {
    const html = codeToHtml(data.code, data.language)
    return publish(html, data.chatId, data.chatUrl, data.slug, data.domain)
  })

  onMessage('checkStatus', async ({ data }) => checkStatus(data.chatId))
  onMessage('checkSlug', async ({ data }) => checkSlug(data.slug))
  onMessage('getProjects', async () => getProjects())
  onMessage('getDomains', async () => getDomains())
  onMessage('getSession', async () => getSession())
  onMessage('logout', async () => {
    await logout()
  })

  // togglePanel is handled by the panel content script, not background
  // But we need to register it so the library doesn't complain
  onMessage('togglePanel', async () => {})
})

async function hasAnyPermission(): Promise<boolean> {
  for (const origin of AI_ORIGINS) {
    if (await browser.permissions.contains({ origins: [origin] })) return true
  }
  return false
}

async function injectPlatformScripts(tabId: number, tabUrl: string) {
  const url = new URL(tabUrl)
  let js: string | null = null
  let css: string | null = null
  if (url.hostname === 'chatgpt.com') {
    js = 'content-scripts/chatgpt.js'
    css = 'content-scripts/chatgpt.css'
  } else if (url.hostname === 'claude.ai') {
    js = 'content-scripts/claude.js'
    css = 'content-scripts/claude.css'
  } else if (url.hostname.endsWith('gemini.google.com')) {
    js = 'content-scripts/gemini.js'
    css = 'content-scripts/gemini.css'
  }
  if (!js) return
  try {
    if (css) await browser.scripting.insertCSS({ target: { tabId }, files: [css] })
    await browser.scripting.executeScript({ target: { tabId }, files: [js] })
  } catch {
    /* ignore */
  }
}

async function registerGrantedContentScripts() {
  for (const origin of AI_ORIGINS) {
    if (!(await browser.permissions.contains({ origins: [origin] }))) continue

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
    if (!(await browser.permissions.contains({ origins: [`*://${host}/*`] }))) continue
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
