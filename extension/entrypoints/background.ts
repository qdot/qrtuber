import {
  IntifaceHapticsAdapter,
  parseFrame,
  QRCodeFinder,
  SequenceTracker,
  type VisualDecodeResult,
} from 'qrtuber';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  let qrCodeFinder = new QRCodeFinder();
  let intifaceClient = new IntifaceHapticsAdapter();
  let sequenceTracker = new SequenceTracker();

  async function applyPayload(payload: string) {
    const frame = parseFrame(payload);
    if (frame === null || !sequenceTracker.accept(frame)) {
      return;
    }

    await intifaceClient.applyState(frame.state);
  }

  qrCodeFinder.addListener(QRCodeFinder.DETECTION_EVENT, (result: VisualDecodeResult) => {
    void applyPayload(result.payload);
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message["blob_url"] !== undefined) {
      qrCodeFinder.getBlobFromURL(message["blob_url"])
        .then(() => qrCodeFinder.findQRCode())
        .then((result) => sendResponse(result))
        .catch((error) => {
          console.error("QR decode failed", error);
          sendResponse(null);
        });
      return true;
    }

    if (message["intiface_command"] !== undefined) {
      switch (message.intiface_command) {
        case "connect": {
          void intifaceClient.connect();
          break;
        }
        case "disconnect": {
          sequenceTracker.reset();
          void intifaceClient.disconnect();
          break;
        }
      }
      return true;
    }

    return false;
  });
  console.log("Background updated!");
});
