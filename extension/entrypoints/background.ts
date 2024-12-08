/*
import { QRTuberIntifaceClient } from '@/../core/src/IntifaceClient';
import { QRCodeFinder } from '@/../core/src/QRCodeFinder';
*/

import { QRTuberIntifaceClient, QRCodeFinder } from 'qrtuber';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  let qrCodeFinder = new QRCodeFinder();
  let intifaceClient = new QRTuberIntifaceClient();

  // Tie the finder and the intiface client together
  qrCodeFinder.addListener(QRCodeFinder.DETECTION_EVENT, (args) => intifaceClient.detectionEventHandler(args));

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
          intifaceClient.activateDeviceUpdates();
          break;
        }
        case "detach": {
          intifaceClient.deactivateDeviceUpdates();
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
