import { test, expect } from './fixtures'

const STOP_BTN = '<button aria-label="Stop streaming">stop</button>'

// DES-14 / DES-24: MutationObserver detects code blocks only after streaming completes
test.describe('code block detection on ChatGPT', () => {
  test('detects a code block already in the DOM at load time (no streaming)', async ({ context }) => {
    const page = await context.newPage()

    // No stop button present → not streaming → block captured immediately
    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<html><body>
        <pre data-start="0"><div class="cm-editor"><div class="cm-content">console.log("hello world")</div></div></pre>
      </body></html>`,
    }))

    const logs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('[design.computer]')) logs.push(msg.text())
    })

    await page.goto('https://chatgpt.com/c/test-static', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    expect(logs.some(l => l.includes('code block detected'))).toBe(true)
  })

  test('does NOT capture mid-stream, captures once stop button is removed', async ({ context }) => {
    const page = await context.newPage()

    // Page starts with stop button (streaming in progress) and a partial code block
    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<html><body>
        ${STOP_BTN}
        <pre data-start="0"><div class="cm-editor"><div class="cm-content">console.log(</div></div></pre>
      </body></html>`,
    }))

    const logs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('[design.computer]')) logs.push(msg.text())
    })

    await page.goto('https://chatgpt.com/c/test-streaming', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    // Should not have logged yet — stop button is present
    expect(logs.some(l => l.includes('code block detected'))).toBe(false)

    // Simulate streaming complete: update content and remove stop button
    await page.evaluate(() => {
      document.querySelector('.cm-content')!.textContent = 'console.log("Hello, World!");'
      document.querySelector('[aria-label="Stop streaming"]')!.remove()
      // Trigger a mutation so the observer fires
      document.body.appendChild(document.createElement('span'))
    })
    await page.waitForTimeout(500)

    // Now it should have captured the complete content
    expect(logs.some(l => l.includes('code block detected'))).toBe(true)
    expect(logs.some(l => l.includes('Hello, World!'))).toBe(true)
  })

  test('detects a code block injected dynamically (no streaming)', async ({ context }) => {
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

    await page.goto('https://chatgpt.com/c/test-dynamic', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(300)

    await page.evaluate(() => {
      const pre = document.createElement('pre')
      pre.setAttribute('data-start', '0')
      const cmEditor = document.createElement('div')
      cmEditor.className = 'cm-editor'
      const cmContent = document.createElement('div')
      cmContent.className = 'cm-content'
      cmContent.textContent = 'const x = 1;'
      cmEditor.appendChild(cmContent)
      pre.appendChild(cmEditor)
      document.body.appendChild(pre)
    })

    await page.waitForTimeout(500)

    expect(logs.some(l => l.includes('code block detected'))).toBe(true)
  })

  test('does not log the same code block twice', async ({ context }) => {
    const page = await context.newPage()

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<html><body>
        <pre data-start="0"><div class="cm-editor"><div class="cm-content">const x = 1;</div></div></pre>
      </body></html>`,
    }))

    const detectionLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('code block detected')) detectionLogs.push(msg.text())
    })

    await page.goto('https://chatgpt.com/c/test-dedup', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // Trigger unrelated DOM mutations
    await page.evaluate(() => {
      document.body.appendChild(document.createElement('div'))
      document.body.appendChild(document.createElement('div'))
    })
    await page.waitForTimeout(300)

    expect(detectionLogs.length).toBe(1)
  })
})
