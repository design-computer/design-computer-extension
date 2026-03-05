import { useState } from 'react'
import { sendMessage } from '../lib/messaging'

export interface PublishButtonProps {
  chatId?: string
  hasExisting: boolean
  colorClass: string
  getCode: () => string | Promise<string>
  getLanguage: () => string
  onPublished?: () => void
}

async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern clipboard API first
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch { /* may fail in shadow DOM due to focus/gesture restrictions */ }

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
  } catch { /* execCommand may also be restricted */ }

  return false
}

export function PublishButton({ chatId, hasExisting, colorClass, getCode, getLanguage, onPublished }: PublishButtonProps) {
  const [label, setLabel] = useState(hasExisting ? 'Update' : 'Publish')
  const [disabled, setDisabled] = useState(false)

  const handleClick = async () => {
    if (disabled) return
    setDisabled(true)
    setLabel(hasExisting ? 'Updating...' : 'Publishing...')

    try {
      const code = await getCode()
      const language = getLanguage()
      const { url } = await sendMessage('publish', { code, language, chatId })
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
      className={`${colorClass} text-white text-xs font-semibold px-3 h-8 rounded-md cursor-pointer border-0 shrink-0 leading-none disabled:opacity-70 disabled:cursor-not-allowed`}
      disabled={disabled}
      onClick={handleClick}
    >
      {label}
    </button>
  )
}
