export default defineContentScript({
  matches: ['*://chatgpt.com/c/*'],
  main() {
    console.log('[design.computer] content script active on ChatGPT');
  },
});
