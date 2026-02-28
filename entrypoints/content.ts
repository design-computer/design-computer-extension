export default defineContentScript({
  matches: ['*://chatgpt.com/c/*'],
  main(ctx) {
    console.log('[design.computer] content script active on ChatGPT');

    // Blocks already fully processed (streaming done, content captured)
    const seen = new WeakSet<Element>();
    // Blocks spotted mid-stream — waiting for streaming to finish
    const pending = new Set<Element>();

    function isStreaming(): boolean {
      return !!document.querySelector('[aria-label="Stop streaming"]');
    }

    function flushPending() {
      if (pending.size === 0 || isStreaming()) return;
      pending.forEach(block => {
        seen.add(block);
        const text = block.querySelector('.cm-content')?.textContent ?? block.textContent;
        console.log('[design.computer] code block detected', text?.slice(0, 80));
      });
      pending.clear();
    }

    // ChatGPT renders code blocks as <pre data-start="..."> with a CodeMirror editor inside.
    // Queue new blocks as pending; only capture once streaming stops.
    function detectCodeBlocks(root: Document | Element = document) {
      root.querySelectorAll('pre[data-start]').forEach(block => {
        if (seen.has(block) || pending.has(block)) return;
        pending.add(block);
      });
      flushPending();
    }

    // Scan blocks already in DOM at script load time (existing chat, no streaming)
    detectCodeBlocks();

    // Watch for new blocks and for the stop button to disappear
    const observer = new MutationObserver(() => detectCodeBlocks());
    observer.observe(document.body, { childList: true, subtree: true });

    // Disconnect when the extension context is invalidated (update/reload)
    ctx.onInvalidated(() => observer.disconnect());

    // ChatGPT is an SPA — re-scan when navigating between chats
    ctx.addEventListener(window, 'wxt:locationchange', () => detectCodeBlocks());
  },
});
