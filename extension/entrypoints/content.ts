import { TrackingController } from "../lib/content/TrackingController.js";
import { isContentCommand } from "../utils/messages.js";

export default defineContentScript({
  matches: [
    "*://twitch.tv/*",
    "*://*.twitch.tv/*",
    "*://*.youtube.com/*",
    "*://localhost/*",
    "*://127.0.0.1/*",
  ],
  main(ctx) {
    const tracking = new TrackingController((callback, delayMs) =>
      ctx.setTimeout!(callback, delayMs)
    );

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isContentCommand(message)) {
        return undefined;
      }

      void (async () => {
        switch (message.type) {
          case "content/ping":
            sendResponse({ ok: true });
            return;
          case "content/start":
            sendResponse(await tracking.start());
            return;
          case "content/stop":
            sendResponse(await tracking.stop("user"));
            return;
        }
      })().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        sendResponse({ ok: false, error: message });
      });

      return true;
    });

    ctx.onInvalidated(() => {
      void tracking.stop("navigation");
    });
  },
});
