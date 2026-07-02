// I would very much like to pull this dependency from node_modules. However, setting the
// conditional resolution in vite causes buttplug to pull in the node ws library and then websocket
// loading fails. So here we are, copying the inline cjs version out of @undecaf/zbar-wasm, like
// some sort of fucking barbarian.
// @ts-ignore
import { scanImageData } from '@undecaf/zbar-wasm';
import EventEmitter from 'eventemitter3';

import { boundingBoxFromPoints, type Point, type VisualDecodeResult } from "./visual/types.js";

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

  public async findQRCode(source?: Blob | ImageData): Promise<VisualDecodeResult | null> {
    const imageData = await this.imageDataFromSource(source ?? this._currentBlob);
    if (imageData === null) {
      return null;
    }

    let symbols = await scanImageData(imageData);
    if (symbols.length == 0) {
      return null;
    }

    const boundingBox = boundingBoxFromPoints(symbols[0].points as readonly Point[]);
    if (boundingBox === null) {
      return null;
    }

    const result = {
      payload: symbols[0].decode(),
      boundingBox,
    };
    // Emit so that anything in this service worker will receive an update
    this.emit(QRCodeFinder.DETECTION_EVENT, result);
    // Return so the content script will receive an update
    return result;
  }

  private async imageDataFromSource(source: Blob | ImageData | null): Promise<ImageData | null> {
    if (source === null) {
      return null;
    }

    if (typeof ImageData !== "undefined" && source instanceof ImageData) {
      return source;
    }

    const bitmap = await createImageBitmap(source);
    try {
      this._canvas.width = bitmap.width;
      this._canvas.height = bitmap.height;
      this._context.drawImage(bitmap, 0, 0);
      return this._context.getImageData(0, 0, this._canvas.width, this._canvas.height);
    } finally {
      bitmap.close();
    }
  }
}
