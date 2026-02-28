import { test, expect } from './fixtures'

// DES-14: Real ChatGPT integration — requires a saved session (.playwright-session).
// Run `npm run e2e:login` first if you haven't already.
test.describe('code block detection — real ChatGPT', () => {
  test('detects code block from a real ChatGPT response', async ({ context }) => {
    test.setTimeout(90_000)
    const page = await context.newPage()

    const detectionLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('[design.computer]')) detectionLogs.push(msg.text())
    })

    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' })

    const input = page.locator('#prompt-textarea')
    await input.waitFor({ timeout: 10_000 })
    await input.click()
    await input.fill('write hello world in javascript. reply with just the code block, nothing else.')
    await page.keyboard.press('Enter')

    // ChatGPT transitions to /c/{id} only when logged in.
    // If it doesn't transition, skip — session needs `npm run e2e:login` first.
    const navigated = await page.waitForURL(/chatgpt\.com\/c\//, { timeout: 20_000 })
      .then(() => true)
      .catch(() => false)

    if (!navigated) {
      test.skip(true, 'ChatGPT did not navigate to /c/* — run `npm run e2e:login` to save a session first')
      return
    }

    // ChatGPT used SPA pushState to reach /c/* — Chrome doesn't inject content scripts
    // on pushState navigations. Hard-reload the /c/* URL to force content script injection.
    await page.goto(page.url(), { waitUntil: 'domcontentloaded' })

    // Wait for the code block to appear
    await page.waitForSelector('pre[data-start]', { timeout: 30_000 })

    // Wait for streaming to fully finish — our content script holds pending blocks
    // until the stop button disappears. The reload may land mid-stream.
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="Stop streaming"]'),
      { timeout: 30_000 }
    )
    await page.waitForTimeout(300)

    const detected = detectionLogs.some(l => l.includes('code block detected'))
    expect(detected, `Expected detection log. Got: ${JSON.stringify(detectionLogs)}`).toBe(true)

    // Print what was captured so we can verify the full content
    const detectionLog = detectionLogs.find(l => l.includes('code block detected'))
    console.log('Captured:', detectionLog)

    // Verify the extracted text is actual JS code (not "JavaScriptconsole.log...")
    const codeText = await page.$eval(
      'pre[data-start] .cm-content',
      el => el.textContent ?? ''
    )
    expect(codeText).toContain('console.log')
    expect(codeText).not.toMatch(/^JavaScript/) // no language label prefix
  })
})
