#!/usr/bin/env node
import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3')
const sessionDir = path.resolve(__dirname, '../.playwright-session')

const context = await chromium.launchPersistentContext(sessionDir, {
  headless: false,
  channel: 'chrome',
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--disable-blink-features=AutomationControlled',
  ],
  ignoreDefaultArgs: ['--enable-automation'],
})

const page = await context.newPage()

page.on('console', msg => {
  if (msg.text().includes('[design.computer]')) {
    console.log('EXTENSION LOG:', msg.text())
  }
})

await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' })
const input = page.locator('#prompt-textarea')
await input.waitFor({ timeout: 10_000 })
await input.fill('write hello world in javascript. just the code block.')
await page.keyboard.press('Enter')

await page.waitForURL(/chatgpt\.com\/c\//, { timeout: 15_000 })
await page.goto(page.url(), { waitUntil: 'domcontentloaded' })

// Wait for streaming to finish and detection to fire
await page.waitForSelector('pre[data-start]', { timeout: 30_000 })
await page.waitForFunction(
  () => !document.querySelector('[aria-label="Stop streaming"]'),
  { timeout: 30_000 }
)
await page.waitForTimeout(500)

await context.close()
