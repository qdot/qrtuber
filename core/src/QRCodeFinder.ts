// I would very much like to pull this dependency from node_modules. However, setting the
// conditional resolution in vite causes buttplug to pull in the node ws library and then websocket
// loading fails. So here we are, copying the inline cjs version out of @undecaf/zbar-wasm, like
// some sort of fucking barbarian.
// @ts-ignore
import { scanImageData } from '@undecaf/zbar-wasm';
import EventEmitter from 'eventemitter3';

export class QRCodeFinderResult {
  constructor(public Message: object | null, public BoundingBox: number[][] | null) { }
}

export class QRCodeFinder extends EventEmitter {
  public static readonly DETECTION_EVENT = "detection";
  private _canvas = new OffscreenCanvas(0, 0);
  private _context = this._canvas.getContext("2d")!;
  private _currentBlob: Blob | null = null;

  constructor() {
    super();
  }

  public async getBlobFromURL(url: string) {
    this._currentBlob = await fetch(url).then(r => r.blob());
  }

  public async findQRCode() {
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
    // TODO We shouldn't parse here, we should just pass whatever is in the QRCode out
    let speedVal = parseInt(result.substring(2));
    let message = {
      intiface_command: "speed",
      speed: speedVal / 99
    };
    let ret = new QRCodeFinderResult( message, [[minX!, minY!], [maxX!, maxY!]]);
    // Emit so that anything in this service worker will receive an update
    this.emit(QRCodeFinder.DETECTION_EVENT, message);
    // Return so the content script will receive an update
    return ret;
  }
}