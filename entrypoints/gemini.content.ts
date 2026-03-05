import { sendMessage } from "../lib/messaging";
import { createPublishButton } from "../lib/publishButton";

const appPattern = new MatchPattern("*://gemini.google.com/app/*");

export default defineContentScript({
  matches: ["*://gemini.google.com/app/*"],
  async main(ctx) {
    console.log("test");
    ctx.addEventListener(window, "wxt:locationchange", ({ newUrl }) => {
      if (appPattern.includes(newUrl)) {
        seen = new WeakSet();
        detectCodeBlocks();
      }
    });

    if (appPattern.includes(location.href)) {
      console.log("[design.computer] content script active on Gemini");
    }

    let seen = new WeakSet<Element>();

    function isStreaming(): boolean {
      // Gemini shows a "Stop generating" button while streaming
      return !!document.querySelector('button[aria-label="Stop generating"]');
    }

    function getChatId(): string | undefined {
      return location.pathname.match(/\/app\/([^/]+)/)?.[1];
    }

    function detectLanguage(container: Element): string {
      const label = container
        .querySelector(".code-block-decoration span")
        ?.textContent?.trim()
        .toLowerCase();
      if (label && /^[a-z]+$/.test(label)) return label;
      return "plaintext";
    }

    async function injectButton(codeEl: Element, hasExisting: boolean) {
      // Walk up to the .code-block container
      const container = codeEl.closest(".code-block");
      if (!container) return;
      if (seen.has(container)) return;
      seen.add(container);

      const chatId = getChatId();

      const { parentElement, button: btn } = await createPublishButton({
        colorClass: "bg-[#1a73e8]",
        label: hasExisting ? "Update" : "Publish",
      });

      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.textContent = hasExisting ? "Updating…" : "Publishing…";

        const code = codeEl.textContent ?? "";
        const language = detectLanguage(container);

        try {
          const { url } = await sendMessage("publish", {
            code,
            language,
            chatId,
          });
          await navigator.clipboard.writeText(url);
          btn.textContent = "✅ Copied!";
          console.log("[design.computer] published:", url);
        } catch (err) {
          btn.textContent = "⚠ Error";
          btn.disabled = false;
          console.error("[design.computer] publish failed:", err);
        }
      });

      // Inject into the header's .buttons div (next to Gemini's own "Copy code" button)
      const buttonsDiv = container.querySelector(
        ".code-block-decoration .buttons",
      );
      if (buttonsDiv) {
        buttonsDiv.prepend(parentElement);
      } else {
        container.appendChild(parentElement);
      }
    }

    async function detectCodeBlocks() {
      if (isStreaming()) return;
      const chatId = getChatId();
      const hasExisting = chatId
        ? (await sendMessage("checkStatus", { chatId })).exists
        : false;
      document
        .querySelectorAll('code[data-test-id="code-content"]')
        .forEach((el) => {
          injectButton(el, hasExisting);
        });
    }

    detectCodeBlocks();

    const observer = new MutationObserver(() => detectCodeBlocks());
    observer.observe(document.body, { childList: true, subtree: true });

    ctx.onInvalidated(() => observer.disconnect());
  },
});
