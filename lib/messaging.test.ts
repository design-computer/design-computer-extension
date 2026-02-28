import { describe, test, expect, beforeEach, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing'

// Reset module registry before each test so onMessage listener state is fresh
beforeEach(() => {
  fakeBrowser.reset()
  vi.resetModules()
})

describe('publish message', () => {
  test('roundtrip: sendMessage reaches onMessage handler and returns response', async () => {
    const { sendMessage, onMessage } = await import('./messaging')

    onMessage('publish', async ({ data }) => {
      return { url: `http://test.curiosive.com/${data.code.length}` }
    })

    const result = await sendMessage('publish', { code: 'console.log("hi")' })

    // 'console.log("hi")' = 17 chars
    expect(result.url).toBe('http://test.curiosive.com/17')
  })

  test('forwards code and language correctly', async () => {
    const { sendMessage, onMessage } = await import('./messaging')
    let received: { code: string; language?: string } | null = null

    onMessage('publish', async ({ data }) => {
      received = data
      return { url: 'http://x.curiosive.com' }
    })

    await sendMessage('publish', { code: 'const x = 1', language: 'typescript' })

    expect(received).toEqual({ code: 'const x = 1', language: 'typescript' })
  })

  test('language is optional', async () => {
    const { sendMessage, onMessage } = await import('./messaging')

    onMessage('publish', async ({ data }) => {
      return { url: `http://${data.language ?? 'no-lang'}.curiosive.com` }
    })

    const result = await sendMessage('publish', { code: 'hello' })

    expect(result.url).toBe('http://no-lang.curiosive.com')
  })
})
