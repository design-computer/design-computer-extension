import { useState } from 'react'
import { sendMessage } from '../lib/messaging'

export interface PublishButtonProps {
  chatId?: string
  hasExisting: boolean
  colorClass: string
  getCode: () => string | Promise<string>
  getLanguage: () => string
}

export function PublishButton({ chatId, hasExisting, colorClass, getCode, getLanguage }: PublishButtonProps) {
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
      await navigator.clipboard.writeText(url)
      setLabel('Copied!')
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
