import { useEffect, useState } from 'react'
import { sendMessage } from '../lib/messaging'

export const DC_PUBLISHED_EVENT = '__dc_published'
export const DC_STREAMING_EVENT = '__dc_streaming'

const logoUrl = browser.runtime.getURL('/button-logo-gradient.png')
const buttonBgUrl = browser.runtime.getURL('/button.png')
const codingBgUrl = browser.runtime.getURL('/coding-bg.png')

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
  const [isUpdate, setIsUpdate] = useState(hasExisting)
  const [disabled, setDisabled] = useState(false)
  const [streaming, setStreaming] = useState(() => {
    // Check initial streaming state (button may mount during streaming)
    return !!document.querySelector(
      'button[aria-label="Stop Response"], button[aria-label="Stop response"], ' +
        '[data-testid="stop-button"], [aria-label="Stop streaming"], [aria-label="Stop generating"], ' +
        'button.send-button.stop',
    )
  })

  useEffect(() => {
    const onPublished = () => {
      setIsUpdate(true)
      setDisabled(false)
    }
    const onStreaming = (e: Event) => {
      setStreaming((e as CustomEvent).detail?.streaming ?? false)
    }
    document.addEventListener(DC_PUBLISHED_EVENT, onPublished)
    document.addEventListener(DC_STREAMING_EVENT, onStreaming)
    return () => {
      document.removeEventListener(DC_PUBLISHED_EVENT, onPublished)
      document.removeEventListener(DC_STREAMING_EVENT, onStreaming)
    }
  }, [])

  const isDisabled = disabled || streaming

  const handleClick = async () => {
    if (isDisabled) return
    setDisabled(true)

    try {
      const code = await getCode()
      const language = getLanguage()

      if (isUpdate && chatId) {
        // Update flow: check session first, then publish, then open panel
        const session = await sendMessage('getSession', undefined)
        const result = await sendMessage('publish', { code, language, chatId, chatUrl })
        await sendMessage('openPanelWithSuccess', {
          slug: result.url.match(/https?:\/\/([^.]+)\./)?.[1] || '',
          url: result.url,
          session,
        })
        document.dispatchEvent(new CustomEvent(DC_PUBLISHED_EVENT))
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
      disabled={isDisabled}
      style={{
        width: isSmall ? 79 : 89,
        height: isSmall ? 22 : 30,
        background: `url('${streaming ? codingBgUrl : buttonBgUrl}') center / 100% 100% no-repeat`,
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {streaming ? (
        <>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: isSmall ? 12 : 14,
              lineHeight: isSmall ? '20px' : '26px',
              color: '#fff',
              letterSpacing: '-0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            Coding
          </span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
          >
            <path
              d="M6.50016 1.0835V3.25016M8.77516 4.22516L10.346 2.65433M9.75016 6.50016H11.9168M8.77516 8.77516L10.346 10.346M6.50016 9.75016V11.9168M2.65433 10.346L4.22516 8.77516M1.0835 6.50016H3.25016M2.65433 2.65433L4.22516 4.22516"
              stroke="white"
              strokeWidth="1.08333"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      ) : (
        <>
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
            {isUpdate ? 'Update' : 'Publish'}
          </span>
          <img
            src={logoUrl}
            alt=""
            style={{ height: isSmall ? 10 : 13, width: 'auto', flexShrink: 0 }}
            draggable={false}
          />
        </>
      )}
    </button>
  )
}
