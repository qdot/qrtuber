import { QRTuberIntifaceClient } from '@/components/intifaceClient';
import { QRCodeFinder } from '@/components/qrCodeFinder';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  let qrCodeFinder = new QRCodeFinder();  
  let intifaceClient = new QRTuberIntifaceClient();
  qrCodeFinder.addListener(QRCodeFinder.DETECTION_EVENT, (_, args) => intifaceClient.detectionEventHandler(args));
  console.log("Background updated!");
});
