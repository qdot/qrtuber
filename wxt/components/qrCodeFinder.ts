import { scanImageData } from '@undecaf/zbar-wasm';

export class QRCodeFinderResult {
  constructor(public Message: string | null, public BoundingBox: number[][] | null) { }
}

export class QRCodeFinder {
  private _canvas = new OffscreenCanvas(0, 0);
  private _context = this._canvas.getContext("2d")!;
  private _currentBlob: Blob | null = null;

  constructor() {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request["blob_url"] !== undefined) {
        this.getBlobFromURL(request["blob_url"]).then(async () => {
          let result = await this.findQRCode();
          sendResponse(result);
        });
        return true;
      }
      return true;
    });
  }

  private async getBlobFromURL(url: string) {
    this._currentBlob = await fetch(url).then(r => r.blob());
  }

  private async findQRCode() {
    let bitmap = await createImageBitmap(this._currentBlob!);
    this._canvas.width = bitmap.width;
    this._canvas.height = bitmap.height;
    this._context.drawImage(bitmap, 0, 0);

    let symbols = await scanImageData(this._context.getImageData(0, 0, this._canvas.width, this._canvas.height));
    if (symbols.length == 0) {
      return new QRCodeFinderResult(null, null);
    }
    let minX: number, minY: number, maxX: number, maxY: number;
    symbols[0].points.forEach((v: {x: number, y: number}) => {
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
    let result = symbols[0].decode();
    //console.log(`Result: ${result}`);
    let lastMessage = result;
    let speedVal = parseInt(result.substring(2));
    /*
    if (lastSpeedVal != speedVal) {
      for (var device of client.devices) {
        device.vibrate(speedVal / 99);
      }
      lastSpeedVal = speedVal;
    }
      */
    //console.log(`Speedval: ${speedVal}`);
    //console.log(`${[[minX, minY], [maxX, maxY]]}`);
    return new QRCodeFinderResult( lastMessage, [[minX!, minY!], [maxX!, maxY!]]);
    //symbols.forEach(s => s.rawData = s.decode());
    //setTimeout(findQRCode, 100);
  }
}