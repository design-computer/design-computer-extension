import { WEB_URL } from '@/entrypoints/panel.content/types'

export function LoggedOutView({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="flex items-center p-1.5">
        <div className="w-6 h-6 rounded-[20px] bg-gradient-to-b from-white to-[#999]" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 px-1.5">
          <p className="text-sm font-medium text-muted tracking-[-0.01em] leading-[18px]">
            Welcome
          </p>
          <p className="text-lg font-medium text-black tracking-[-0.01em] leading-6">
            Connect your account and start generating.
          </p>
        </div>
        <button
          className="w-full bg-black text-white border-none rounded-[14px] py-2 px-4 text-sm font-medium tracking-[-0.01em] leading-6 text-center cursor-pointer"
          onClick={() => {
            window.open(`${WEB_URL}/login`, '_blank')
            onClose()
          }}
        >
          Connect
        </button>
      </div>
    </>
  )
}
