import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'

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
    <svg width="32" height="32" viewBox="0 0 22 22" fill="none" className="shrink-0 rounded-lg">
      <g clipPath="url(#clip0_gemini_opt)">
        <mask
          id="mask0_gemini_opt"
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="22"
          height="22"
        >
          <path
            d="M10.424 0.360504C10.5925 -0.0949991 11.2392 -0.0876904 11.3973 0.37143L11.8392 1.65378C12.4992 3.56939 13.5793 5.3131 15.0005 6.75719C16.4217 8.20127 18.1479 9.30915 20.0528 9.99968L21.4779 10.5162C21.9314 10.6806 21.9324 11.3217 21.4794 11.4874L20.0508 12.0102C18.1978 12.6884 16.5147 13.7621 15.1187 15.1567C13.7227 16.5513 12.6473 18.2333 11.9673 20.0856L11.4082 21.6086C11.2428 22.0593 10.6058 22.0605 10.4387 21.6104L9.85488 20.0382C9.17208 18.1993 8.09911 16.5301 6.70975 15.1454C5.32039 13.7606 3.64761 12.6932 1.80642 12.0165L0.352209 11.4821C-0.0982743 11.3165 -0.0994555 10.6798 0.350363 10.5126L1.833 9.96136C3.6665 9.27969 5.33115 8.21006 6.71309 6.82564C8.09503 5.44121 9.16166 3.77465 9.84004 1.93993L10.424 0.360504Z"
            fill="#3186FF"
          />
        </mask>
        <g mask="url(#mask0_gemini_opt)">
          <g filter="url(#f0_gemini_opt)">
            <path
              d="M12.0333 22.738C20.0247 22.738 26.5031 17.4826 26.5031 10.9997C26.5031 4.51687 20.0247 -0.738525 12.0333 -0.738525C4.04183 -0.738525 -2.43652 4.51687 -2.43652 10.9997C-2.43652 17.4826 4.04183 22.738 12.0333 22.738Z"
              fill="#3689FF"
            />
          </g>
          <g filter="url(#f1_gemini_opt)">
            <path
              d="M2.47209 15.8719C5.26502 15.8719 7.52913 13.4756 7.52913 10.5196C7.52913 7.56356 5.26502 5.16724 2.47209 5.16724C-0.320844 5.16724 -2.58496 7.56356 -2.58496 10.5196C-2.58496 13.4756 -0.320844 15.8719 2.47209 15.8719Z"
              fill="#F6C013"
            />
          </g>
          <g filter="url(#f2_gemini_opt)">
            <path
              d="M1.43888 16.3151C4.23181 16.3151 6.49593 13.9187 6.49593 10.9627C6.49593 8.00668 4.23181 5.61035 1.43888 5.61035C-1.35405 5.61035 -3.61816 8.00668 -3.61816 10.9627C-3.61816 13.9187 -1.35405 16.3151 1.43888 16.3151Z"
              fill="#F6C013"
            />
          </g>
          <g filter="url(#f3_gemini_opt)">
            <path
              d="M14.3212 0.774604C12.6971 6.09004 4.83465 9.91664 1.66016 9.96588L10.63 -4.87305L14.3212 0.774604Z"
              fill="#FA4340"
            />
          </g>
          <g filter="url(#f4_gemini_opt)">
            <path
              d="M14.0644 -0.92315C12.4402 4.39229 4.57782 8.21888 1.40332 8.26812L10.3731 -6.5708L14.0644 -0.92315Z"
              fill="#FA4340"
            />
          </g>
          <g filter="url(#f5_gemini_opt)">
            <path
              d="M14.3583 20.6341C12.7342 15.3187 4.87176 11.4921 1.69727 11.4429L10.6671 26.2818L14.3583 20.6341Z"
              fill="#14BB69"
            />
          </g>
          <g filter="url(#f6_gemini_opt)">
            <path
              d="M14.5068 23.6605C12.8826 18.3451 5.0202 14.5185 1.8457 14.4692L10.8155 29.3082L14.5068 23.6605Z"
              fill="#14BB69"
            />
          </g>
        </g>
      </g>
      <defs>
        <filter
          id="f0_gemini_opt"
          x="-5.09"
          y="-3.4"
          width="34.26"
          height="28.8"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="bg" />
          <feBlend in="SourceGraphic" in2="bg" result="s" />
          <feGaussianBlur stdDeviation="1.33" result="e" />
        </filter>
        <filter
          id="f1_gemini_opt"
          x="-7.31"
          y="0.44"
          width="19.57"
          height="20.16"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="bg" />
          <feBlend in="SourceGraphic" in2="bg" result="s" />
          <feGaussianBlur stdDeviation="2.36" result="e" />
        </filter>
        <filter
          id="f2_gemini_opt"
          x="-8.34"
          y="0.89"
          width="19.57"
          height="20.16"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="bg" />
          <feBlend in="SourceGraphic" in2="bg" result="s" />
          <feGaussianBlur stdDeviation="2.36" result="e" />
        </filter>
        <filter
          id="f3_gemini_opt"
          x="-3.07"
          y="-9.6"
          width="22.12"
          height="24.29"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="bg" />
          <feBlend in="SourceGraphic" in2="bg" result="s" />
          <feGaussianBlur stdDeviation="2.36" result="e" />
        </filter>
        <filter
          id="f4_gemini_opt"
          x="-3.32"
          y="-11.3"
          width="22.12"
          height="24.29"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="bg" />
          <feBlend in="SourceGraphic" in2="bg" result="s" />
          <feGaussianBlur stdDeviation="2.36" result="e" />
        </filter>
        <filter
          id="f5_gemini_opt"
          x="-3.03"
          y="6.72"
          width="22.12"
          height="24.29"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="bg" />
          <feBlend in="SourceGraphic" in2="bg" result="s" />
          <feGaussianBlur stdDeviation="2.36" result="e" />
        </filter>
        <filter
          id="f6_gemini_opt"
          x="-2.88"
          y="9.74"
          width="22.12"
          height="24.29"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="bg" />
          <feBlend in="SourceGraphic" in2="bg" result="s" />
          <feGaussianBlur stdDeviation="2.36" result="e" />
        </filter>
        <clipPath id="clip0_gemini_opt">
          <rect width="21.85" height="22" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

function ChatGPTIcon() {
  return (
    <img src="/icons/chatgpt.png" alt="" width="32" height="32" className="shrink-0 rounded-lg" />
  )
}

function ClaudeIcon() {
  return (
    <img src="/icons/claude.png" alt="" width="32" height="32" className="shrink-0 rounded-lg" />
  )
}

function DesignComputerIcon() {
  return (
    <img
      src="/icons/design-computer.png"
      alt=""
      width="32"
      height="32"
      className="shrink-0 rounded-full"
    />
  )
}

const ICON_MAP: Record<string, () => React.ReactNode> = {
  gemini: () => <GeminiIcon />,
  chatgpt: () => <ChatGPTIcon />,
  claude: () => <ClaudeIcon />,
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // Local toggle state — all ON by default
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(AI_SITES.map((s) => [s.id, true])),
  )
  // Already granted permissions (from previous session)
  const [alreadyGranted, setAlreadyGranted] = useState<Record<string, boolean>>({})

  useEffect(() => {
    checkPermissions()
  }, [])

  async function checkPermissions() {
    const result: Record<string, boolean> = {}
    for (const site of AI_SITES) {
      result[site.id] = await browser.permissions.contains({ origins: [site.origin] })
    }
    setAlreadyGranted(result)
    // If some are already granted, reflect that in toggles
    setSelected((prev) => {
      const next = { ...prev }
      for (const [id, granted] of Object.entries(result)) {
        if (granted) next[id] = true
      }
      return next
    })
  }

  function toggleSite(id: string) {
    // Don't allow toggling off already-granted permissions from this UI
    // They can revoke from Chrome's extension settings
    if (alreadyGranted[id]) return
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleAllow() {
    const origins = AI_SITES.filter((s) => selected[s.id] && !alreadyGranted[s.id]).map(
      (s) => s.origin,
    )
    // Always include design.computer
    origins.push('https://my.design.computer/*')
    const ok = await browser.permissions.request({ origins })
    if (ok) {
      await checkPermissions()
    }
  }

  const allSelected = AI_SITES.every((s) => selected[s.id])
  const allAlreadyGranted = AI_SITES.every((s) => alreadyGranted[s.id])
  const hasNewSelections = AI_SITES.some((s) => selected[s.id] && !alreadyGranted[s.id])

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-[350px] rounded-[20px] p-1.5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-col gap-2 p-3">
          <h2 className="text-lg font-medium text-black tracking-[-0.01em] leading-6">
            Enable Publishing
          </h2>
          <p className="text-base font-medium text-[#999] tracking-[-0.01em] leading-[22px]">
            We only access the code you choose to share, the rest is private.
          </p>

          {/* Action button */}
          {!allAlreadyGranted && (
            <button
              className={`w-full border-none rounded-[14px] py-2 px-4 flex items-center justify-center gap-3 ${hasNewSelections ? 'bg-black cursor-pointer' : 'bg-[#ccc] cursor-default'}`}
              onClick={handleAllow}
              disabled={!hasNewSelections}
            >
              {allSelected && (
                <span className="text-sm font-medium text-[#999] tracking-[-0.01em]">
                  Recommended
                </span>
              )}
              <span className="text-sm font-medium text-white tracking-[-0.01em]">
                {allSelected ? 'Allow All Sites' : 'Allow Selected'}
              </span>
            </button>
          )}
        </div>

        {/* Site list */}
        <div className="flex flex-col gap-1.5">
          {AI_SITES.map((site) => {
            const isOn = selected[site.id] ?? true
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
                <Switch checked={isOn} onCheckedChange={() => toggleSite(site.id)} />
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
            <Switch checked disabled />
          </div>
        </div>
      </div>
    </div>
  )
}
