import { transform } from 'sucrase'

function looksLikeHtml(code: string): boolean {
  const trimmed = code.trimStart()
  return trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')
}

function looksLikeJsx(code: string): boolean {
  // Explicit react import — most reliable signal
  if (/from\s+['"]react['"]/.test(code)) return true
  // return <Tag or return (<Tag
  if (/return\s*\(?\s*<[a-zA-Z]/.test(code)) return true
  // => <Tag or => (<Tag
  if (/=>\s*\(?\s*<[a-zA-Z]/.test(code)) return true
  // PascalCase component usage: <MyComponent or <MyComponent/> etc.
  return /<[A-Z][a-zA-Z]*[\s/>]/.test(code)
}

function looksLikeVue(code: string): boolean {
  return /createApp\s*\(/.test(code)
    || /defineComponent\s*\(/.test(code)
    || /from\s+['"]vue['"]/.test(code)
}

/** Detect the component name to mount. Falls back to 'App'. */
function detectReactComponent(code: string): string {
  // export default function Foo / export default class Foo
  const m1 = code.match(/export\s+default\s+(?:function|class)\s+([A-Z][a-zA-Z0-9]*)/)
  if (m1) return m1[1]
  // export default Foo (identifier, not anonymous)
  const m2 = code.match(/export\s+default\s+([A-Z][a-zA-Z0-9]*)\s*[;\n]/)
  if (m2) return m2[1]
  // const Foo = ... / function Foo / class Foo — pick the last PascalCase definition
  const defs = [...code.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:const|function|class)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/g)]
  if (defs.length > 0) return defs[defs.length - 1][1]
  return 'App'
}

const REACT_IMPORTMAP = JSON.stringify({
  imports: {
    'react': 'https://esm.sh/react@18',
    'react-dom': 'https://esm.sh/react-dom@18',
    'react-dom/client': 'https://esm.sh/react-dom@18/client',
    'react/jsx-runtime': 'https://esm.sh/react@18/jsx-runtime',
  },
})

const VUE_IMPORTMAP = JSON.stringify({
  imports: {
    'vue': 'https://esm.sh/vue@3',
  },
})

function htmlShell(opts: {
  head: string
  body: string
  script: string
  scriptType?: 'module' | 'text/javascript'
}): string {
  const type = opts.scriptType ?? 'module'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>design.computer</title>
  ${opts.head}
</head>
<body>
  ${opts.body}
  <script type="${type}">
${opts.script}
  <\/script>
</body>
</html>`
}

function wrapReact(code: string, isTs: boolean): string {
  const transforms: Parameters<typeof transform>[1]['transforms'] = ['jsx']
  if (isTs) transforms.push('typescript')

  let transformed: string
  try {
    ;({ code: transformed } = transform(code, { transforms, jsxRuntime: 'classic', production: false }))
  } catch {
    return fallback(code)
  }

  const componentName = detectReactComponent(code)
  const needsReactImport = !/import\s+React\b/.test(code) && !/import\s*\*\s*as\s+React\b/.test(code)

  const preamble = [
    needsReactImport ? "import React from 'react';" : '',
    "import { createRoot } from 'react-dom/client';",
  ].filter(Boolean).join('\n')

  const mount = `\ncreateRoot(document.getElementById('root')).render(React.createElement(${componentName}));`

  return htmlShell({
    head: `<script type="importmap">${REACT_IMPORTMAP}<\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>`,
    body: '<div id="root"></div>',
    script: `${preamble}\n${transformed}\n${mount}`,
    scriptType: 'module',
  })
}

function wrapVue(code: string): string {
  // Code already calls createApp — let it manage its own mounting
  if (/createApp\s*\(/.test(code) && /\.mount\s*\(/.test(code)) {
    return htmlShell({
      head: `<script type="importmap">${VUE_IMPORTMAP}<\/script>`,
      body: '<div id="app"></div>',
      script: code,
      scriptType: 'module',
    })
  }

  // Code exports / defines a component object — wrap with createApp
  return htmlShell({
    head: `<script type="importmap">${VUE_IMPORTMAP}<\/script>`,
    body: '<div id="app"></div>',
    script: `import { createApp } from 'vue';\n${code}\nconst __exports = (typeof module !== 'undefined' && module.exports) || {};\ncreateApp(__exports.default ?? __exports).mount('#app');`,
    scriptType: 'module',
  })
}

function fallback(code: string): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>design.computer</title></head><body><pre><code>${escaped}</code></pre></body></html>`
}

export function codeToHtml(code: string, language = 'plaintext'): string {
  if (language === 'html' || looksLikeHtml(code)) return code

  if (language === 'jsx' || language === 'tsx') {
    return wrapReact(code, language === 'tsx')
  }

  if (language === 'vue') {
    return wrapVue(code)
  }

  if (language === 'javascript' || language === 'js') {
    if (looksLikeJsx(code)) return wrapReact(code, false)
    return htmlShell({ head: '', body: '', script: code, scriptType: 'text/javascript' })
  }

  if (language === 'typescript' || language === 'ts') {
    if (looksLikeJsx(code)) return wrapReact(code, true)
    const { code: js } = transform(code, { transforms: ['typescript'] })
    return htmlShell({ head: '', body: '', script: js, scriptType: 'text/javascript' })
  }

  if (language === 'css') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>design.computer</title><style>${code}</style></head><body></body></html>`
  }

  // Unknown language — still try JSX/Vue heuristics before giving up
  if (looksLikeJsx(code)) return wrapReact(code, false)
  if (looksLikeVue(code)) return wrapVue(code)

  return fallback(code)
}
