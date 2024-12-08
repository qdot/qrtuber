import { ContentVideoHandler } from "@/../core/src/ContentVideoHandler";

export default defineContentScript({
  //matches: ['*://twitch.tv/*', '*://google.com/*', '*://youtube.com/*'],
  matches: ['*://*/*'],
  main(ctx) {
    let contentHandler = new ContentVideoHandler();
    contentHandler.addListener("videoblob", (blobObj) => {
      browser.runtime.sendMessage(blobObj).then((result) => contentHandler.handleQRCodeFinderReturn(result))
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
    //console.log(`Processing Time ${Date.now() - startTime}`);
  },
});
