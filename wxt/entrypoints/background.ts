import { ButtplugClient, ButtplugBrowserWebsocketClientConnector } from 'buttplug';
import { scanImageData } from './main.cjs';//'@undecaf/zbar-wasm';

let client = new ButtplugClient("Extension Client");
let blob;
let pointBoundary = [[0, 0], [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]];
let tabid: number;
let codeFound = false;
let lastSpeedVal = 0;
let lastMessage;

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  client.connect(new ButtplugBrowserWebsocketClientConnector("http://127.0.0.1:12345")).then(() => console.log("Client connected"));
  console.log("Background updated!");
  //scanImageData(undefined);
});

browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log(sender.tab ?
    "from a content script:" + sender.tab.url :
    "from the extension");
  console.log(request);
  if (request["blob_url"] !== undefined) {
    console.log("got url");
    blob = await fetch(request["blob_url"]).then(r => r.blob());
    console.log(blob);
    await findQRCode();
    console.log("Sent back canvas");
  }
});

const findQRCode = async () => {
  //let context = canvas.getContext("2d"!);
  //let imageData = context?.getImageData(0, 0, canvas.width, canvas.height); //context.getImageData(0, 0, (pointBoundary[1][0] - pointBoundary[0][0]), (pointBoundary[1][1] - pointBoundary[0][1]));
  let canvas = new OffscreenCanvas(1920, 1080);
  let context = canvas.getContext("2d");
  let bitmap = await createImageBitmap(blob);
  context?.drawImage(bitmap, 0, 0);

  let symbols = await scanImageData(context?.getImageData(0, 0, 1920, 1080));
  if (symbols.length == 0) {
    console.log("Reset");
    // Reset size and find new code elsewhere.
    pointBoundary = [[0, 0], [videoWidth, videoHeight]];
    codeFound = false;
  } else {
    if (!codeFound) {
      let minX, minY, maxX, maxY;
      symbols[0].points.forEach((v) => {
        if (minX === undefined || v.x < minX) {
          minX = v.x
        }
        if (maxX === undefined || v.x > maxX) {
          maxX = v.x;
        }
        if (minY === undefined || v.y < minY) {
          minY = v.y;
        }
        if (maxY === undefined || v.y > maxY) {
          maxY = v.y;
        }
      });
      pointBoundary = [[minX, minY], [maxX, maxY]];
      codeFound = true;
    }
    let result = symbols[0].decode();
    console.log(`Result: ${result}`);
    lastMessage = result;
    let speedVal = parseInt(result.substring(2));
    if (lastSpeedVal != speedVal) {
      for (var device of client.devices) {
        device.vibrate(speedVal / 99);
      }
      lastSpeedVal = speedVal;
    }
    console.log(`Speedval: ${speedVal}`);

    if ()
    //symbols.forEach(s => s.rawData = s.decode());
  }
  //setTimeout(findQRCode, 100);
}
