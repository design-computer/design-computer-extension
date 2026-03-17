import { defineConfig, type WxtViteConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

const AI_ORIGINS = ['*://claude.ai/*', '*://chatgpt.com/*', '*://gemini.google.com/*']

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
    }) as WxtViteConfig,
  hooks: {
    'build:manifestGenerated': (_, manifest) => {
      // Remove AI origins from host_permissions (WXT auto-adds them from content script matches)
      // They should only be in optional_host_permissions
      if (manifest.host_permissions) {
        manifest.host_permissions = manifest.host_permissions.filter(
          (p: string) => !AI_ORIGINS.includes(p),
        )
      }
    },
  },
  manifest: {
    name: 'one click publish — design.computer',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs17OkA6ErSJH3sZntU9MdaqF3o1CgbGKUbOUnCGB7DcY0q//JjtHXgfH/pNxOIF1yloA4ctbvWaSdc1vTJkZKJ4H0N2y9XIKW5ow8b0YcqdxDVp4k0XpUtGZKZB4JIU6usSutWxDXXlieGOYasbLMrNDffktuO9a6cHYcV2C0MRl0yrTt74YnlKYjS0mYid/QtTPCAdJ8R8l9UnQx/5MgqjrbG5cPlIMtDnmr9BwvgGxQigCoy5K36E8nv9Cgu7h6N/QM1us9NIUnjStRLcMffYeE0siGHlHefuoga5RLhBCKxG8uqp3/LHTXadGkz9mRPBFOkTzxKpTapCocM8v5QIDAQAB',
    action: {},
    permissions: ['storage', 'scripting'],
    optional_host_permissions: AI_ORIGINS,
    web_accessible_resources: [
      {
        resources: ['fonts/Switzer-Variable.woff2', 'content-scripts/panel.css'],
        matches: AI_ORIGINS,
      },
    ],
    host_permissions: ['https://my.design.computer/*', 'http://localhost:3000/*'],
    externally_connectable: {
      matches: ['https://my.design.computer/*', 'http://localhost:3000/*'],
    },
  },
})
