import { HapticsState, IntifaceHapticsAdapter, QRCodeFinder } from 'qrtuber';

function legacySpeedMessageToState(args: unknown): HapticsState | null {
  if (
    typeof args !== 'object' ||
    args === null ||
    !('intiface_command' in args) ||
    !('speed' in args) ||
    args.intiface_command !== 'speed' ||
    typeof args.speed !== 'number'
  ) {
    return null;
  }

  return new HapticsState(Array(9).fill(args.speed * 255));
}

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  let qrCodeFinder = new QRCodeFinder();
  let intifaceClient = new IntifaceHapticsAdapter();

  // Tie the finder and the intiface client together
  qrCodeFinder.addListener(QRCodeFinder.DETECTION_EVENT, (args) => {
    const state = legacySpeedMessageToState(args);
    if (state !== null) {
      void intifaceClient.applyState(state);
    }
  });

  // Wire up message listeners from the content script or popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {

    //QRCodeFinder message
    if (message["blob_url"] !== undefined) {
      qrCodeFinder.getBlobFromURL(message["blob_url"]).then(() => {
        qrCodeFinder.findQRCode().then((result) => sendResponse(result));
      });
      return true;
    }

    //Intiface Client message
    if (message["intiface_command"] !== undefined) {
      switch (message.intiface_command) {
        case "attach": {
          break;
        }
        case "detach": {
          break;
        }
        case "connect": {
          intifaceClient.connect();
          break;
        }
        case "disconnect": {
          intifaceClient.disconnect();
          break;
        }
      }
      return true;
    }
    return false;
  });
  console.log("Background updated!");
});
