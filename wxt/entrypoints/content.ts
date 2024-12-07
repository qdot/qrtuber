import { ContentVideoHandler } from "@/components/contentVideoHandler";

export default defineContentScript({
  //matches: ['*://twitch.tv/*', '*://google.com/*', '*://youtube.com/*'],
  matches: ['*://*/*'],
  main(ctx) {
    let contentHandler = new ContentVideoHandler();
    browser.runtime.onMessage.addListener((obj) => {
      console.log("Got popup message!");
      contentHandler.startTrackingVideo();
    });
  },
});
