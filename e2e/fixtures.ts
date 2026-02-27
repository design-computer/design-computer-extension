import { test as base, chromium, type BrowserContext } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3')

interface ExtensionFixtures {
  context: BrowserContext
  extensionId: string
}

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })
    await use(context)
    await context.close()
  },

  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers()
    if (!worker) {
      worker = await context.waitForEvent('serviceworker')
    }
    const extensionId = worker.url().split('/')[2]
    await use(extensionId)
  },
})

export { expect } from '@playwright/test'
