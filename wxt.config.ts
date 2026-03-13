import { defineConfig, type WxtViteConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  dev: {
    server: {
      port: 9989,
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  } as WxtViteConfig),
  manifest: {
    name: 'Get Design',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs17OkA6ErSJH3sZntU9MdaqF3o1CgbGKUbOUnCGB7DcY0q//JjtHXgfH/pNxOIF1yloA4ctbvWaSdc1vTJkZKJ4H0N2y9XIKW5ow8b0YcqdxDVp4k0XpUtGZKZB4JIU6usSutWxDXXlieGOYasbLMrNDffktuO9a6cHYcV2C0MRl0yrTt74YnlKYjS0mYid/QtTPCAdJ8R8l9UnQx/5MgqjrbG5cPlIMtDnmr9BwvgGxQigCoy5K36E8nv9Cgu7h6N/QM1us9NIUnjStRLcMffYeE0siGHlHefuoga5RLhBCKxG8uqp3/LHTXadGkz9mRPBFOkTzxKpTapCocM8v5QIDAQAB',
    permissions: ['storage'],
    host_permissions: ['https://getdesignapp.ugurkellecioglu.com/*', 'http://localhost:3000/*'],
    externally_connectable: {
      matches: ['https://getdesignapp.ugurkellecioglu.com/*', 'http://localhost:3000/*'],
    },
  },
});
