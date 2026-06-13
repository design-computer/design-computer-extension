// Insert template (design.md) text into the current AI chat's input box.
// Each platform uses a different editor, so we try selectors in order and use the
// insertion technique that triggers the editor's own input handling.

const INPUT_SELECTORS = [
  '#prompt-textarea', // ChatGPT (ProseMirror contenteditable)
  'div.ProseMirror[contenteditable="true"]', // Claude
  '.ql-editor[contenteditable="true"]', // Gemini
  'textarea[data-testid="prompt-textarea"]', // ChatGPT legacy textarea
  'main textarea', // generic fallback
  'textarea',
]

export function insertPrompt(text: string): boolean {
  let el: HTMLElement | null = null
  for (const sel of INPUT_SELECTORS) {
    const found = document.querySelector<HTMLElement>(sel)
    if (found) {
      el = found
      break
    }
  }
  if (!el) return false

  el.focus()

  // Textarea: use the native value setter so React's tracked value updates.
  if (el instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }

  // Contenteditable (ProseMirror / Quill): select all, then insertText so the
  // editor's beforeinput/input handlers run and its internal state stays in sync.
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(el)
  selection?.removeAllRanges()
  selection?.addRange(range)

  const ok = document.execCommand('insertText', false, text)
  if (!ok) {
    // Fallback for editors where execCommand is blocked.
    el.textContent = text
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }))
  }
  return true
}
