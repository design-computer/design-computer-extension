import { test, expect } from './fixtures'

// DES-9: Chrome extension runs in ChatGPT
test.describe('content script on ChatGPT', () => {
  test('extension loads and service worker is registered', async ({ extensionId }) => {
    expect(extensionId).toMatch(/^[a-z]{32}$/)
  })

  test('content script fires on chatgpt.com/c/* and logs to console', async ({ context }) => {
    const page = await context.newPage()

    // Intercept to serve a blank page — avoids redirects from real ChatGPT
    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }))

    const logs: string[] = []
    page.on('console', msg => { logs.push(msg.text()) })

    await page.goto('https://chatgpt.com/c/test', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    const found = logs.some(log => log.includes('[design.computer] content script active on ChatGPT'))
    expect(found, `Expected console log not found. Logs: ${JSON.stringify(logs)}`).toBe(true)
  })

  test('content script does NOT fire on chatgpt.com root (not a chat URL)', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }))

    const logs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('[design.computer]')) logs.push(msg.text())
    })

    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    expect(logs.length).toBe(0)
  })
})
