import { describe, test, expect } from 'vitest'
import { codeToHtml } from './code-to-html'

describe('codeToHtml — html passthrough', () => {
  test('returns html as-is when language is html', () => {
    const input = '<!DOCTYPE html><html><body>hi</body></html>'
    expect(codeToHtml(input, 'html')).toBe(input)
  })

  test('returns html as-is when code starts with <!DOCTYPE', () => {
    const input = '<!DOCTYPE html><html></html>'
    expect(codeToHtml(input, 'plaintext')).toBe(input)
  })
})

describe('codeToHtml — css', () => {
  test('wraps css in a style tag', () => {
    const result = codeToHtml('body { color: red }', 'css')
    expect(result).toContain('<style>body { color: red }</style>')
  })
})

describe('codeToHtml — javascript', () => {
  test('wraps plain js in a script tag', () => {
    const result = codeToHtml('console.log("hi")', 'javascript')
    expect(result).toContain('console.log("hi")')
    expect(result).toContain('<script')
  })
})

describe('codeToHtml — typescript', () => {
  test('strips types and wraps in script tag', () => {
    const result = codeToHtml('const x: number = 1', 'typescript')
    expect(result).toContain('const x = 1')
    expect(result).toContain('<script')
  })
})

describe('codeToHtml — React (jsx)', () => {
  const reactComponent = `
import React from 'react'

export default function App() {
  return <div>Hello World</div>
}
`.trim()

  test('uses importmap with react esm.sh entries', () => {
    const result = codeToHtml(reactComponent, 'jsx')
    expect(result).toContain('esm.sh/react@18')
    expect(result).toContain('esm.sh/react-dom@18/client')
    expect(result).toContain('"react"')
  })

  test('mounts detected component (App)', () => {
    const result = codeToHtml(reactComponent, 'jsx')
    expect(result).toContain('createElement(App)')
  })

  test('includes a root div mount point', () => {
    const result = codeToHtml(reactComponent, 'jsx')
    expect(result).toContain('<div id="root">')
  })

  test('uses script type="module"', () => {
    const result = codeToHtml(reactComponent, 'jsx')
    expect(result).toContain('type="module"')
  })

  test('includes tailwind cdn for styling', () => {
    const result = codeToHtml(reactComponent, 'jsx')
    expect(result).toContain('cdn.tailwindcss.com')
  })

  test('does not inject duplicate React import when already present', () => {
    const result = codeToHtml(reactComponent, 'jsx')
    const count = (result.match(/import React from/g) ?? []).length
    expect(count).toBe(1)
  })

  test('injects React import when missing', () => {
    const noImport = `export default function App() { return <div>Hi</div> }`
    const result = codeToHtml(noImport, 'jsx')
    expect(result).toContain("import React from 'react'")
  })
})

describe('codeToHtml — React (tsx)', () => {
  const tsxComponent = `
interface Props { name: string }

export default function Greeting({ name }: Props) {
  return <h1>Hello {name}</h1>
}
`.trim()

  test('strips TypeScript types and renders jsx', () => {
    const result = codeToHtml(tsxComponent, 'tsx')
    expect(result).toContain('createElement(Greeting)')
    expect(result).not.toContain(': Props')
    expect(result).not.toContain('interface Props')
  })
})

describe('codeToHtml — JSX detection in js/ts', () => {
  test('treats js with react import as React even without JSX syntax', () => {
    const code = `import { useState } from 'react'\nconsole.log(useState)`
    const result = codeToHtml(code, 'javascript')
    expect(result).toContain('esm.sh/react@18')
  })

  test('treats js with JSX syntax as React', () => {
    const code = `function App() { return <div>hi</div> }\nexport default App`
    const result = codeToHtml(code, 'javascript')
    expect(result).toContain('esm.sh/react@18')
    expect(result).toContain('createElement(App)')
  })

  test('treats ts with JSX syntax as React (tsx)', () => {
    const code = `function App(): JSX.Element { return <div>hello</div> }\nexport default App`
    const result = codeToHtml(code, 'typescript')
    expect(result).toContain('esm.sh/react@18')
    expect(result).toContain('createElement(App)')
  })
})

describe('codeToHtml — Vue', () => {
  const selfMounting = `
import { createApp, ref } from 'vue'

createApp({
  setup() {
    const count = ref(0)
    return { count }
  },
  template: '<button @click="count++">{{ count }}</button>'
}).mount('#app')
`.trim()

  test('uses importmap with vue esm.sh entry', () => {
    const result = codeToHtml(selfMounting, 'vue')
    expect(result).toContain('esm.sh/vue@3')
    expect(result).toContain('"vue"')
  })

  test('includes an app div mount point', () => {
    const result = codeToHtml(selfMounting, 'vue')
    expect(result).toContain('<div id="app">')
  })

  test('uses script type="module"', () => {
    const result = codeToHtml(selfMounting, 'vue')
    expect(result).toContain('type="module"')
  })

  test('wraps component-object vue code with createApp', () => {
    const componentObj = `
import { ref } from 'vue'
export default {
  setup() { return { count: ref(0) } },
  template: '<div>{{ count }}</div>'
}
`.trim()
    const result = codeToHtml(componentObj, 'vue')
    expect(result).toContain("import { createApp } from 'vue'")
    expect(result).toContain(".mount('#app')")
  })
})

describe('codeToHtml — heuristic fallback for unknown language', () => {
  test('detects react from plaintext label via import', () => {
    const code = `import { useState } from 'react'\nexport default function App() { return <div>hi</div> }`
    const result = codeToHtml(code, 'plaintext')
    expect(result).toContain('esm.sh/react@18')
    expect(result).toContain('createElement(App)')
  })

  test('detects vue from plaintext label', () => {
    const code = `import { createApp } from 'vue'\ncreateApp({ template: '<div>hi</div>' }).mount('#app')`
    const result = codeToHtml(code, 'plaintext')
    expect(result).toContain('esm.sh/vue@3')
  })
})

describe('codeToHtml — fallback', () => {
  test('escapes html in unknown language', () => {
    const result = codeToHtml('<script>alert(1)</script>', 'ruby')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<script>alert')
  })
})
