import { test, expect } from './fixtures'

// DES-15: Publish button injection
// Full publish flow (Worker call → clipboard → ✅ Copied!) is covered in DES-16
// Messaging roundtrip is covered by unit tests in lib/messaging.test.ts

const CODE_BLOCK_HTML = `<html><body>
  <pre data-start="0"><div class="cm-editor"><div class="cm-content">console.log("hello world")</div></div></pre>
</body></html>`

test.describe('publish button injection', () => {
  test('injects Publish button onto a detected code block', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: CODE_BLOCK_HTML,
    }))

    await page.goto('https://chatgpt.com/c/test-publish', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    const btn = page.locator('.dc-publish-btn')
    await expect(btn).toBeVisible()
    await expect(btn).toHaveText('Publish')
  })

  test('does not inject duplicate buttons on repeated mutations', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: CODE_BLOCK_HTML,
    }))

    await page.goto('https://chatgpt.com/c/test-publish-dedup', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    // Trigger unrelated DOM mutations
    await page.evaluate(() => {
      document.body.appendChild(document.createElement('div'))
      document.body.appendChild(document.createElement('div'))
    })
    await page.waitForTimeout(300)

    const btns = page.locator('.dc-publish-btn')
    await expect(btns).toHaveCount(1)
  })

  test('content script ↔ background messaging roundtrip works', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: CODE_BLOCK_HTML,
    }))

    await page.goto('https://chatgpt.com/c/test-publish-click', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    const btn = page.locator('.dc-publish-btn')
    await btn.click()

    // "Publishing…" → proves content script called sendMessage
    // "⚠ Error"     → proves background received it, ran api.publish(), got a
    //                  network error (no real Worker in tests), and sent the error
    //                  response back to the content script
    // If messaging was broken, the button would be stuck at "Publishing…" forever
    await expect(btn).toHaveText('⚠ Error', { timeout: 10_000 })
    await expect(btn).not.toBeDisabled() // re-enabled for retry
  })
})
