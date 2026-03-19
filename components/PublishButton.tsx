import { useState } from 'react'
import { sendMessage } from '../lib/messaging'

const logoUrl = browser.runtime.getURL('/button-logo-gradient.png')

export interface PublishButtonProps {
  chatId?: string
  chatUrl?: string
  hasExisting: boolean
  getCode: () => string | Promise<string>
  getLanguage: () => string
  onPublished?: () => void
}

async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern clipboard API first
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* may fail in shadow DOM due to focus/gesture restrictions */
  }

  // Fallback: create a temporary textarea in the host document
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (ok) return true
  } catch {
    /* execCommand may also be restricted */
  }

  return false
}

const buttonBgUrl = browser.runtime.getURL('/button.png')

export function PublishButton({
  chatId,
  chatUrl,
  hasExisting,
  getCode,
  getLanguage,
  onPublished,
}: PublishButtonProps) {
  const [label, setLabel] = useState(hasExisting ? 'Update' : 'Publish')
  const [disabled, setDisabled] = useState(false)

  const handleClick = async () => {
    if (disabled) return
    setDisabled(true)
    setLabel(hasExisting ? 'Updating...' : 'Publishing...')

    try {
      const code = await getCode()
      const language = getLanguage()
      const { url } = await sendMessage('publish', { code, language, chatId, chatUrl })
      const copied = await copyToClipboard(url)
      setLabel(copied ? 'Copied!' : 'Published!')
      onPublished?.()
      console.log('[design.computer] published:', url)
    } catch (err) {
      setLabel('Error')
      setDisabled(false)
      console.error('[design.computer] publish failed:', err)
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
