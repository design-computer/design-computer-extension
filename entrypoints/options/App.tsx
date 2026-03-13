import { useState, useEffect } from 'react'

interface SitePermission {
  id: string
  name: string
  origin: string
  description: string
  icon: string
}

const SITES: SitePermission[] = [
  {
    id: 'api',
    name: 'Get Design API',
    origin: 'https://api.curiosive.com/*',
    description: 'Required to publish your code to a live URL',
    icon: '',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    origin: '*://chatgpt.com/*',
    description: 'Publish code blocks from ChatGPT conversations',
    icon: 'https://chatgpt.com/favicon.ico',
  },
  {
    id: 'claude',
    name: 'Claude',
    origin: '*://claude.ai/*',
    description: 'Publish artifacts and code from Claude conversations',
    icon: 'https://claude.ai/favicon.ico',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    origin: '*://gemini.google.com/*',
    description: 'Publish code blocks from Gemini conversations',
    icon: 'https://gemini.google.com/favicon.ico',
  },
]

export default function App() {
  const [granted, setGranted] = useState<Record<string, boolean>>({})

  useEffect(() => {
    checkAllPermissions()
  }, [])

  async function checkAllPermissions() {
    const result: Record<string, boolean> = {}
    for (const site of SITES) {
      result[site.id] = await browser.permissions.contains({ origins: [site.origin] })
    }
    setGranted(result)
  }

  const allGranted = SITES.every(site => granted[site.id])

  async function requestAll() {
    const ok = await browser.permissions.request({
      origins: SITES.map(s => s.origin),
    })
    if (ok) {
      setGranted(Object.fromEntries(SITES.map(s => [s.id, true])))
    }
  }

  async function requestPermission(site: SitePermission) {
    const ok = await browser.permissions.request({ origins: [site.origin] })
    if (ok) {
      setGranted(prev => ({ ...prev, [site.id]: true }))
    }
  }

  async function revokePermission(site: SitePermission) {
    const ok = await browser.permissions.remove({ origins: [site.origin] })
    if (ok) {
      setGranted(prev => ({ ...prev, [site.id]: false }))
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">Get Design</h1>
      <p className="text-gray-500 mb-8">
        Enable the sites where you'd like a Publish button on code blocks. We never read or modify your conversations — we only access the code you choose to publish.
      </p>

      {!allGranted && (
        <button
          onClick={requestAll}
          className="w-full mb-4 px-4 py-3 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer border-0"
        >
          Allow All Sites
        </button>
      )}

      <div className="flex flex-col gap-4">
        {SITES.map(site => {
          const isGranted = granted[site.id] ?? false
          return (
            <div
              key={site.id}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              {site.icon ? (
                <img
                  src={site.icon}
                  alt=""
                  className="w-8 h-8 rounded"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">API</div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm">{site.name}</h2>
                <p className="text-xs text-gray-500">{site.description}</p>
              </div>
              {isGranted ? (
                <button
                  onClick={() => revokePermission(site)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Revoke
                </button>
              ) : (
                <button
                  onClick={() => requestPermission(site)}
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer border-0"
                >
                  Allow Access
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
