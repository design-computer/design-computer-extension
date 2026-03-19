import { useState } from 'react'

const logoUrl = browser.runtime.getURL('/button-logo-gradient.png')
const buttonBgUrl = browser.runtime.getURL('/button.png')

export interface PublishButtonProps {
  chatId?: string
  chatUrl?: string
  hasExisting: boolean
  getCode: () => string | Promise<string>
  getLanguage: () => string
}

export function PublishButton({
  chatId,
  chatUrl,
  hasExisting,
  getCode,
  getLanguage,
}: PublishButtonProps) {
  const [label] = useState(hasExisting ? 'Update' : 'Publish')
  const [disabled, setDisabled] = useState(false)

  const handleClick = async () => {
    if (disabled) return
    setDisabled(true)

    try {
      const code = await getCode()
      const language = getLanguage()

      // Send code data to background → opens panel with pre-filled data
      await browser.runtime.sendMessage({
        type: 'openPanelWithCode',
        code,
        language,
        chatId,
        chatUrl,
      })
    } catch (err) {
      console.error('[design.computer] failed to open panel:', err)
      setDisabled(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        width: 89,
        height: 30,
        background: `url('${buttonBgUrl}') center / 100% 100% no-repeat`,
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '26px',
          color: '#fff',
          letterSpacing: '-0.42px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <img
        src={logoUrl}
        alt=""
        style={{ height: 13, width: 'auto', flexShrink: 0 }}
        draggable={false}
      />
    </button>
  )
}
