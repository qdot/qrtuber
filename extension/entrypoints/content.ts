import { ContentVideoHandler, type VisualDecodeResult } from "qrtuber";

export default defineContentScript({
  matches: [
    '*://twitch.tv/*',
    '*://*.twitch.tv/*',
    '*://*.youtube.com/*',
    '*://localhost/*',
    '*://127.0.0.1/*',
  ],
  main(ctx) {
    let contentHandler = new ContentVideoHandler();
    contentHandler.addListener("videoblob", (blobObj) => {
      void browser.runtime.sendMessage(blobObj)
        .then((result: VisualDecodeResult | null) => contentHandler.handleQRCodeFinderReturn(result))
        .catch((error) => {
          console.error("QRTuber background message failed", error);
          contentHandler.stopTrackingVideo();
        });
    });
    browser.runtime.onMessage.addListener((obj) => {
      if (obj["content_command"] === undefined) {
        return false;
      }
      switch (obj.content_command) {
        case "start": {
          contentHandler.startTrackingVideo();
          break;
        }
        case "stop": {
          contentHandler.stopTrackingVideo();
          break;
        }
      }
      return true;
    });
  },
});
