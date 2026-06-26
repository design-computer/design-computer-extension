/**
 * Backend the extension talks to. Resolved at build time.
 *
 * The value is injected by `wxt.config.ts` via Vite `define` based on the
 * selected environment (DC_ENV):
 *   - development → http://localhost:3000
 *   - staging     → https://staging.my.design.computer
 *   - production  → https://my.design.computer
 *
 * The `?? ` fallback below is the safe default (production) for any build where
 * the value was not injected.
 */
export const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://my.design.computer'

/** Origin match pattern (`<origin>/*`) for `permissions.request` / manifest. */
export const WEB_ORIGIN = `${WEB_URL}/*`
