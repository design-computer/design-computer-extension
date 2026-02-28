import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/login-session.spec.ts'],
  timeout: 30_000,
  // Persistent Chrome profile can only be opened by one process at a time
  workers: 1,
  use: {
    headless: false,
  },
  // Must run wxt build before e2e tests
  // Extension output: .output/chrome-mv3
})
