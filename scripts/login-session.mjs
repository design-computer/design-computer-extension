#!/usr/bin/env node
// Opens Chrome with the extension loaded so you can log into ChatGPT.
// The session is saved to .playwright-session/ automatically.
// Press Ctrl+C when you're done logging in.

import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3')
const sessionDir = path.resolve(__dirname, '../.playwright-session')

const context = await chromium.launchPersistentContext(sessionDir, {
  headless: false,
  channel: 'chrome', // Use system Chrome — less likely to be flagged by Google OAuth
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--disable-blink-features=AutomationControlled',
  ],
  ignoreDefaultArgs: ['--enable-automation'],
})

const page = await context.newPage()
await page.goto('https://chatgpt.com')

console.log('\n  Browser is open. Log into ChatGPT, then press Ctrl+C to save the session.\n')

process.on('SIGINT', async () => {
  console.log('\n  Saving session...')
  await context.close()
  console.log('  Done. Run `npm run e2e` to use it.\n')
  process.exit(0)
})

// Keep the process alive
await new Promise(() => {})
