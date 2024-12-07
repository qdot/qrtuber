import { QRCodeFinder } from '@/components/qrCodeFinder';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  let qrCodeFinder = new QRCodeFinder();
  console.log("Background updated!");
});
