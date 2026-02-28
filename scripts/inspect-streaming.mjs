#!/usr/bin/env node
// Sends a message to ChatGPT and captures DOM snapshots during and after streaming
// to find the right signal for "streaming complete".

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
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' })

const input = page.locator('#prompt-textarea')
await input.waitFor({ timeout: 10_000 })
await input.click()
await input.fill('write hello world in javascript. just the code block.')
await page.keyboard.press('Enter')

await page.waitForURL(/chatgpt\.com\/c\//, { timeout: 15_000 })
console.log('\n--- URL transitioned to /c/* ---')

// Poll every 300ms and log what we see
let done = false
let iteration = 0
while (!done && iteration < 60) {
  await page.waitForTimeout(300)
  iteration++

  const snapshot = await page.evaluate(() => {
    // Things to check for streaming-complete signal
    const stopBtn = document.querySelector('[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="stop"]')
    const sendBtn = document.querySelector('[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="send"]')
    const pre = document.querySelector('pre[data-start]')
    const cmContent = pre?.querySelector('.cm-content')
    const dataIsLastNode = pre?.hasAttribute('data-is-last-node')
    const dataEnd = pre?.getAttribute('data-end')

    // Look for reaction buttons (appear after streaming)
    const reactionBtns = document.querySelectorAll('[data-testid*="turn-action"], [data-testid*="good-response"], [data-testid*="bad-response"]')

    // Look for any element with "generating" or "streaming" in aria labels
    const generatingEl = document.querySelector('[aria-label*="generating"], [aria-label*="Generating"]')

    return {
      hasStopBtn: !!stopBtn,
      stopBtnLabel: stopBtn?.getAttribute('aria-label'),
      hasSendBtn: !!sendBtn,
      preExists: !!pre,
      codeLength: cmContent?.textContent?.length ?? 0,
      codePreview: cmContent?.textContent?.slice(0, 40),
      dataIsLastNode,
      dataEnd,
      reactionBtnCount: reactionBtns.length,
      hasGeneratingEl: !!generatingEl,
    }
  })

  console.log(`[${String(iteration).padStart(2, '0')}]`, JSON.stringify(snapshot))

  // Stop once we have a code block and no stop button
  if (snapshot.preExists && !snapshot.hasStopBtn && snapshot.reactionBtnCount > 0) {
    console.log('\n--- Streaming complete signal detected ---')
    done = true
  }
}

await context.close()
