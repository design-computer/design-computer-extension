import { test, expect } from './fixtures'

const CODE_BLOCK_HTML = `<html><body>
  <div class="code-block" style="display:block;">
    <div class="code-block-decoration header-formatted">
      <span>HTML</span>
      <div class="buttons"></div>
    </div>
    <div class="formatted-code-block-internal-container">
      <div class="animated-opacity">
        <pre><code role="text" data-test-id="code-content" class="code-container formatted">&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;body&gt;hello&lt;/body&gt;&lt;/html&gt;</code></pre>
      </div>
    </div>
  </div>
</body></html>`

test.describe('Gemini publish button', () => {
  test('injects Publish button into .code-block-decoration .buttons', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: CODE_BLOCK_HTML,
    }))

    await page.goto('https://gemini.google.com/app/test-gemini', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    const btn = page.locator('.dc-publish-btn')
    await expect(btn).toBeVisible()
    await expect(btn).toHaveText('Publish')
  })

  test('button is inside .buttons div (next to copy button)', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: CODE_BLOCK_HTML,
    }))

    await page.goto('https://gemini.google.com/app/test-gemini-placement', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    const btn = page.locator('.code-block-decoration .buttons .dc-publish-btn')
    await expect(btn).toHaveCount(1)
  })

  test('does not inject duplicate buttons on repeated mutations', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: CODE_BLOCK_HTML,
    }))

    await page.goto('https://gemini.google.com/app/test-gemini-dedup', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    await page.evaluate(() => {
      document.body.appendChild(document.createElement('div'))
      document.body.appendChild(document.createElement('div'))
    })
    await page.waitForTimeout(300)

    await expect(page.locator('.dc-publish-btn')).toHaveCount(1)
  })

  test('messaging roundtrip works on click', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: CODE_BLOCK_HTML,
    }))

    await page.goto('https://gemini.google.com/app/test-gemini-click', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    await page.locator('.dc-publish-btn').click()
    await expect(page.locator('.dc-publish-btn')).toHaveText('⚠ Error', { timeout: 10_000 })
    await expect(page.locator('.dc-publish-btn')).not.toBeDisabled()
  })

  test('detects code block injected dynamically', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }))

    await page.goto('https://gemini.google.com/app/test-gemini-dynamic', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(300)

    await page.evaluate(() => {
      const block = document.createElement('div')
      block.className = 'code-block'
      block.innerHTML = `
        <div class="code-block-decoration header-formatted">
          <span>JavaScript</span>
          <div class="buttons"></div>
        </div>
        <pre><code role="text" data-test-id="code-content">console.log("hi")</code></pre>
      `
      document.body.appendChild(block)
    })

    await page.waitForTimeout(500)
    await expect(page.locator('.dc-publish-btn')).toBeVisible()
  })
})
