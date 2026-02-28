export default defineContentScript({
  matches: ['*://chatgpt.com/c/*'],
  main(ctx) {
    console.log('[design.computer] content script active on ChatGPT');

    const seen = new WeakSet<Element>();

    // ChatGPT renders code blocks as <pre data-start="..."> containing a CodeMirror
    // editor (.cm-editor / .cm-content). There is no <code> element.
    function detectCodeBlocks(root: Document | Element = document) {
      root.querySelectorAll('pre[data-start]').forEach(block => {
        if (seen.has(block)) return;
        seen.add(block);
        const text = block.querySelector('.cm-content')?.textContent ?? block.textContent;
        console.log('[design.computer] code block detected', text?.slice(0, 80));
      });
    }

    // Scan blocks already in DOM at script load time
    detectCodeBlocks();

    // Watch for new blocks streamed in dynamically
    const observer = new MutationObserver(() => detectCodeBlocks());
    observer.observe(document.body, { childList: true, subtree: true });

    // Disconnect when the extension context is invalidated (update/reload)
    ctx.onInvalidated(() => observer.disconnect());

    // ChatGPT is an SPA — re-scan when navigating between chats
    ctx.addEventListener(window, 'wxt:locationchange', () => detectCodeBlocks());
  },
});
