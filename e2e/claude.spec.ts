import { test, expect } from './fixtures'

// Claude.ai artifact panel structure
const ARTIFACT_HTML = `<html><body>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex items-center justify-between px-2 py-2 bg-bg-000 gap-2">
      <div class="flex items-center gap-2 flex-1 overflow-hidden pl-3">
        <div role="group">
          <button type="button" data-state="on" aria-label="Preview">Preview</button>
          <button type="button" data-state="off" aria-label="Code">Code</button>
        </div>
        <h2>Landing page<span class="text-text-400 opacity-50"> · </span><span class="text-text-400">HTML</span></h2>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <div class="flex h-8 whitespace-nowrap">
          <button class="rounded-l-lg bg-bg-000 h-full flex items-center justify-center px-2 border-y-0.5 border-l-0.5 border-border-200">Copy</button>
        </div>
      </div>
    </div>
    <div class="flex-1 min-h-0 bg-bg-000 overflow-auto">
      <div class="h-full">
        <div id="code-view" style="display:none;">
          <div class="code-block__code"><!DOCTYPE html><html><body>hello</body></html></div>
        </div>
      </div>
    </div>
  </div>
</body>
<script>
  // Simulate tab switching behaviour
  document.querySelector('[aria-label="Code"]').addEventListener('click', () => {
    document.querySelector('[aria-label="Code"]').setAttribute('data-state', 'on')
    document.querySelector('[aria-label="Preview"]').setAttribute('data-state', 'off')
    document.getElementById('code-view').style.display = 'block'
  })
  document.querySelector('[aria-label="Preview"]').addEventListener('click', () => {
    document.querySelector('[aria-label="Preview"]').setAttribute('data-state', 'on')
    document.querySelector('[aria-label="Code"]').setAttribute('data-state', 'off')
    document.getElementById('code-view').style.display = 'none'
  })
</script>
</html>`

test.describe('Claude.ai artifact publish button', () => {
  test('injects Publish button into artifact header', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: ARTIFACT_HTML,
    }))

    await page.goto('https://claude.ai/chat/test-claude', { waitUntil: 'domcontentloaded' })
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
      body: ARTIFACT_HTML,
    }))

    await page.goto('https://claude.ai/chat/test-claude-dedup', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    await page.evaluate(() => {
      document.body.appendChild(document.createElement('div'))
      document.body.appendChild(document.createElement('div'))
    })
    await page.waitForTimeout(300)

    await expect(page.locator('.dc-publish-btn')).toHaveCount(1)
  })

  test('switches to Code tab to read code then restores Preview', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: ARTIFACT_HTML,
    }))

    await page.goto('https://claude.ai/chat/test-claude-tabs', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    // Preview is active before click
    await expect(page.locator('[aria-label="Preview"]')).toHaveAttribute('data-state', 'on')

    await page.locator('.dc-publish-btn').click()

    // After publish attempt, Preview should be restored
    await expect(page.locator('.dc-publish-btn')).toHaveText('⚠ Error', { timeout: 10_000 })
    await expect(page.locator('[aria-label="Preview"]')).toHaveAttribute('data-state', 'on')
  })

  test('messaging roundtrip works on click', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: ARTIFACT_HTML,
    }))

    await page.goto('https://claude.ai/chat/test-claude-click', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    await page.locator('.dc-publish-btn').click()
    await expect(page.locator('.dc-publish-btn')).toHaveText('⚠ Error', { timeout: 10_000 })
    await expect(page.locator('.dc-publish-btn')).not.toBeDisabled()
  })
})
