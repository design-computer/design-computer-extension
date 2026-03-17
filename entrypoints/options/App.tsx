import { useState, useEffect } from 'react'

const AI_SITES = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Publish code from Gemini',
    origin: '*://gemini.google.com/*',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'Publish code from ChatGPT',
    origin: '*://chatgpt.com/*',
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Publish artifacts from Claude',
    origin: '*://claude.ai/*',
  },
]

// ── Icons ────────────────────────────────────────────────────────────────────

function GeminiIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0 rounded-lg">
      <rect width="32" height="32" rx="8" fill="white" />
      <path
        d="M16 4C16 10.627 10.627 16 4 16C10.627 16 16 21.373 16 28C16 21.373 21.373 16 28 16C21.373 16 16 10.627 16 4Z"
        fill="url(#gemini_opt)"
      />
      <defs>
        <linearGradient id="gemini_opt" x1="4" y1="16" x2="28" y2="16">
          <stop stopColor="#4285F4" />
          <stop offset="1" stopColor="#886FBF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function ChatGPTIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0 rounded-lg">
      <rect width="32" height="32" rx="8" fill="white" />
      <circle cx="16" cy="16" r="10" fill="#10a37f" />
      <path
        d="M16 9.5c-1.5 0-2.8.8-3.5 2l-.5.8-.8-.5C10 11 8.5 11.2 7.7 12.5c-.8 1.3-.3 3 1 3.8l.8.5-.5.8c-.7 1.2-.5 2.8.7 3.7 1.2.9 2.8.5 3.7-.7l.5-.8.8.5c1.3.8 3 .3 3.8-1s.3-3-1-3.8l-.8-.5.5-.8c.7-1.2.5-2.8-.7-3.7A2.7 2.7 0 0016 9.5z"
        fill="white"
        fillOpacity="0.5"
      />
    </svg>
  )
}

function ClaudeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0 rounded-lg">
      <rect width="32" height="32" rx="8" fill="white" />
      <path d="M19.2 10L16 21.5 12.8 10h-2.4L14.8 23h2.4L21.6 10h-2.4z" fill="#D97757" />
    </svg>
  )
}

function DesignComputerIcon() {
  return <div className="w-8 h-8 rounded-lg bg-linear-to-b from-white to-[#999] shrink-0" />
}

const ICON_MAP: Record<string, () => React.ReactNode> = {
  gemini: () => <GeminiIcon />,
  chatgpt: () => <ChatGPTIcon />,
  claude: () => <ClaudeIcon />,
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [granted, setGranted] = useState<Record<string, boolean>>({})

  useEffect(() => {
    checkPermissions()
  }, [])

  async function checkPermissions() {
    const result: Record<string, boolean> = {}
    for (const site of AI_SITES) {
      result[site.id] = await browser.permissions.contains({ origins: [site.origin] })
    }
    setGranted(result)
  }

  async function handleAllowAll() {
    const origins = AI_SITES.map((s) => s.origin)
    const ok = await browser.permissions.request({ origins })
    if (ok) {
      await checkPermissions()
    }
  }

  async function toggleSite(site: (typeof AI_SITES)[number]) {
    const isGranted = granted[site.id]
    if (isGranted) {
      const ok = await browser.permissions.remove({ origins: [site.origin] })
      if (ok) setGranted((prev) => ({ ...prev, [site.id]: false }))
    } else {
      const ok = await browser.permissions.request({ origins: [site.origin] })
      if (ok) setGranted((prev) => ({ ...prev, [site.id]: true }))
    }
  }

  const allGranted = AI_SITES.every((s) => granted[s.id])

  return (
    <div className="min-h-screen bg-white flex items-start justify-center pt-24 font-sans">
      <div className="w-[350px] bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] p-1.5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-col gap-2 p-3">
          <h2 className="text-lg font-medium text-black tracking-[-0.01em] leading-6">
            Enable Publishing
          </h2>
          <p className="text-base font-medium text-[#999] tracking-[-0.01em] leading-[22px]">
            We only access the code you choose to share, the rest is private.
          </p>

          {/* Allow All button */}
          {!allGranted && (
            <button
              className="w-full bg-black text-white border-none rounded-[14px] py-2 px-4 flex items-center justify-center gap-3 cursor-pointer"
              onClick={handleAllowAll}
            >
              <span className="text-sm font-medium text-[#999] tracking-[-0.01em]">
                Recommended
              </span>
              <span className="text-sm font-medium text-white tracking-[-0.01em]">
                Allow All Sites
              </span>
            </button>
          )}
        </div>

        {/* Site list */}
        <div className="flex flex-col gap-1.5">
          {AI_SITES.map((site) => {
            const isGranted = granted[site.id] ?? false
            const Icon = ICON_MAP[site.id]
            return (
              <div
                key={site.id}
                className="flex items-center gap-2 bg-[#f6f6f6] rounded-[14px] px-3 py-2"
              >
                {Icon ? Icon() : null}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-black tracking-[-0.01em] leading-6">
                    {site.name}
                  </p>
                  <p className="text-sm font-medium text-[#999] tracking-[-0.01em] leading-[18px]">
                    {site.description}
                  </p>
                </div>
                <button
                  className="shrink-0 w-[46px] h-[26px] rounded-full p-0.5 border-none cursor-pointer transition-colors"
                  style={{ background: isGranted ? '#000' : '#ccc' }}
                  onClick={() => toggleSite(site)}
                >
                  <div
                    className="w-[22px] h-[22px] rounded-full bg-white transition-transform"
                    style={{ transform: isGranted ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            )
          })}

          {/* design.computer — always enabled */}
          <div className="flex items-center gap-2 bg-[#f6f6f6] rounded-[14px] px-3 py-2">
            <DesignComputerIcon />
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-black tracking-[-0.01em] leading-6">
                design.computer
              </p>
              <p className="text-sm font-medium text-[#999] tracking-[-0.01em] leading-[18px]">
                Required to publish your code.
              </p>
            </div>
            <button
              className="shrink-0 w-[46px] h-[26px] rounded-full p-0.5 border-none cursor-default transition-colors"
              style={{ background: '#999' }}
              disabled
            >
              <div
                className="w-[22px] h-[22px] rounded-full bg-white"
                style={{ transform: 'translateX(20px)' }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
