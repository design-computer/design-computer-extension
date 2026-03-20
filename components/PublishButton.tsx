import { useState } from 'react'
import { sendMessage } from '../lib/messaging'

const logoUrl = browser.runtime.getURL('/button-logo-gradient.png')
const buttonBgUrl = browser.runtime.getURL('/button.png')

export interface PublishButtonProps {
  chatId?: string
  chatUrl?: string
  hasExisting: boolean
  getCode: () => string | Promise<string>
  getLanguage: () => string
  size?: 'default' | 'small'
}

export function PublishButton({
  chatId,
  chatUrl,
  hasExisting,
  getCode,
  getLanguage,
  size = 'default',
}: PublishButtonProps) {
  const isSmall = size === 'small'
  const [label] = useState(hasExisting ? 'Update' : 'Publish')
  const [disabled, setDisabled] = useState(false)

  const handleClick = async () => {
    if (disabled) return
    setDisabled(true)

    try {
      const code = await getCode()
      const language = getLanguage()

      if (hasExisting && chatId) {
        // Update flow: check session first, then publish, then open panel
        const session = await sendMessage('getSession', undefined)
        const result = await sendMessage('publish', { code, language, chatId, chatUrl })
        await sendMessage('openPanelWithSuccess', {
          slug: result.url.match(/https?:\/\/([^.]+)\./)?.[1] || '',
          url: result.url,
          session,
        })
      } else {
        // New publish flow: open panel with code data + random slug
        await sendMessage('openPanelWithCode', {
          code,
          language: language || 'html',
          chatId,
          chatUrl,
        })
      }
    } catch (err) {
      console.error('[design.computer] failed:', err)
      setDisabled(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        width: isSmall ? 79 : 89,
        height: isSmall ? 22 : 30,
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
          fontSize: isSmall ? 12 : 14,
          lineHeight: isSmall ? '20px' : '26px',
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
        style={{ height: isSmall ? 10 : 13, width: 'auto', flexShrink: 0 }}
        draggable={false}
      />
    </button>
  )
}
