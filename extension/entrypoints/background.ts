import { Engine } from "../lib/engine/Engine.js";
import { isEnsureEngineRequest } from "../utils/messages.js";

const OFFSCREEN_URL = "/offscreen.html";
const OFFSCREEN_JUSTIFICATION =
  "Runs WebAssembly QR decoding and maintains the local Intiface device WebSocket";

export default defineBackground(() => {
  const inlineEngine = import.meta.env.FIREFOX ? new Engine() : null;
  let ensurePromise: Promise<void> | null = null;

  if (inlineEngine !== null) {
    void inlineEngine.initialise().catch(() => {});
  }

  async function hasOffscreenDocument(): Promise<boolean> {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
    });

    return contexts.length > 0;
  }

  async function ensureChromeEngine(): Promise<void> {
    if (await hasOffscreenDocument()) {
      return;
    }

    ensurePromise ??= chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ["WORKERS" as chrome.offscreen.Reason],
        justification: OFFSCREEN_JUSTIFICATION,
      })
      .finally(() => {
        ensurePromise = null;
      });

    await ensurePromise;
  }

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isEnsureEngineRequest(message)) {
      if (import.meta.env.FIREFOX) {
        sendResponse({ ok: true });
        return true;
      }

      void ensureChromeEngine()
        .then(() => sendResponse({ ok: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ ok: false, error: message });
        });
      return true;
    }

    if (import.meta.env.FIREFOX && inlineEngine !== null) {
      if (inlineEngine.handleRuntimeMessage(message, sender, sendResponse)) {
        return true;
      }
    }

    return undefined;
  });
});
