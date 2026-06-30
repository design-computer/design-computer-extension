import { defineConfig, type WxtViteConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

const isDev = process.env.NODE_ENV === 'development'

// Which backend the extension talks to. Set by the npm scripts via DC_ENV
// (build:staging / dev:staging / …). Defaults to development under `wxt dev`
// and production for a plain `wxt build`. An explicit VITE_WEB_URL wins over all.
const DC_ENV = process.env.DC_ENV ?? (isDev ? 'development' : 'production')

const WEB_URLS: Record<string, string> = {
  development: 'http://localhost:3000',
  staging: 'https://staging.my.design.computer',
  production: 'https://my.design.computer',
}

const WEB_URL = process.env.VITE_WEB_URL ?? WEB_URLS[DC_ENV] ?? WEB_URLS.production
const WEB_ORIGIN = `${WEB_URL}/*`

const AI_ORIGINS = ['*://claude.ai/*', '*://chatgpt.com/*', '*://gemini.google.com/*']

// Origins allowed to hand the auth token to the extension (externally_connectable).
// Production locks to prod only; non-prod builds also allow localhost for convenience.
const CONNECTABLE =
  DC_ENV === 'production'
    ? ['https://my.design.computer/*']
    : Array.from(new Set([WEB_ORIGIN, 'http://localhost:3000/*']))

// Extension display name, prefixed per env so a staging/dev build is visually
// distinguishable from production in chrome://extensions and the toolbar.
const BASE_NAME = 'one click publish — design.computer'
const NAME_PREFIX: Record<string, string> = {
  development: '[DEV] ',
  staging: '[STG] ',
  production: '',
}
const NAME = `${NAME_PREFIX[DC_ENV] ?? ''}${BASE_NAME}`

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  dev: {
    server: {
      port: 9989,
    },
  },
  vite: () =>
    ({
      plugins: [tailwindcss()],
      // Bake the resolved backend URL into the bundle (read via lib/config.ts).
      define: {
        'import.meta.env.VITE_WEB_URL': JSON.stringify(WEB_URL),
      },
    }) as WxtViteConfig,
  hooks: {
    'build:manifestGenerated': (_, manifest) => {
      // Remove AI origins + the web origin from host_permissions (WXT auto-adds
      // them from content script matches). They belong in optional_host_permissions.
      if (manifest.host_permissions) {
        manifest.host_permissions = manifest.host_permissions.filter(
          (p: string) =>
            !AI_ORIGINS.includes(p) &&
            !p.includes('design.computer') &&
            (!isDev ? !p.includes('localhost') : true),
        )
        if (manifest.host_permissions.length === 0) {
          delete manifest.host_permissions
        }
      }
    },
  },
  manifest: {
    name: NAME,
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs17OkA6ErSJH3sZntU9MdaqF3o1CgbGKUbOUnCGB7DcY0q//JjtHXgfH/pNxOIF1yloA4ctbvWaSdc1vTJkZKJ4H0N2y9XIKW5ow8b0YcqdxDVp4k0XpUtGZKZB4JIU6usSutWxDXXlieGOYasbLMrNDffktuO9a6cHYcV2C0MRl0yrTt74YnlKYjS0mYid/QtTPCAdJ8R8l9UnQx/5MgqjrbG5cPlIMtDnmr9BwvgGxQigCoy5K36E8nv9Cgu7h6N/QM1us9NIUnjStRLcMffYeE0siGHlHefuoga5RLhBCKxG8uqp3/LHTXadGkz9mRPBFOkTzxKpTapCocM8v5QIDAQAB',
    action: {},
    permissions: ['storage', 'scripting'],
    optional_host_permissions: [...AI_ORIGINS, WEB_ORIGIN],
    web_accessible_resources: [
      {
        resources: [
          'fonts/Geist-Light.ttf',
          'fonts/Geist-Regular.ttf',
          'fonts/Geist-Medium.ttf',
          'fonts/Geist-SemiBold.ttf',
          'fonts/Geist-Bold.ttf',
          'content-scripts/panel.css',
          'button.png',
          'button-logo-gradient.png',
          'coding-bg.png',
          'library-empty.png',
          'clipboard-intercept.js',
        ],
        matches: AI_ORIGINS,
      },
    ],
    externally_connectable: {
      matches: CONNECTABLE,
    },
  },
})
