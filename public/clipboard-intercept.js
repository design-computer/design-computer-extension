// Injected into page context to intercept clipboard writes.
// Content script listens for __dc_clipboard_capture events.
;(function () {
  const orig = navigator.clipboard.writeText.bind(navigator.clipboard)
  navigator.clipboard.writeText = function (text) {
    document.dispatchEvent(new CustomEvent('__dc_clipboard_capture', { detail: { text } }))
    navigator.clipboard.writeText = orig
    return orig(text)
  }
})()
