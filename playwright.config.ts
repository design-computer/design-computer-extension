import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    headless: false,
  },
  // Must run wxt build before e2e tests
  // Extension output: .output/chrome-mv3
})
