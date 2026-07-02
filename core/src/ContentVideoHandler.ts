import EventEmitter from "eventemitter3";

import type { BoundingBox, VisualDecodeResult } from "./visual/types.js";

export class ContentVideoHandler extends EventEmitter {
  private videoElem: HTMLVideoElement | null = null;
  private canvas: OffscreenCanvas = new OffscreenCanvas(0, 0);
  private context: OffscreenCanvasRenderingContext2D = this.canvas.getContext("2d")!;
  private lastBlobURL: string | null = null;
  private trackingBoundingBox: BoundingBox | null = null;
  private trackingBoundingBoxBorderSize: number = 10;
  private videoListenerAbortController: AbortController | null = null;

  constructor() {
    super();
  }

  public get isTrackingVideo() { return this.videoElem !== null; }

  public get currentRegion(): BoundingBox | null {
    if (this.videoElem === null || this.videoElem.videoWidth <= 0 || this.videoElem.videoHeight <= 0) {
      return null;
    }

    if (this.trackingBoundingBox === null) {
      return {
        minX: 0,
        minY: 0,
        maxX: this.videoElem.videoWidth,
        maxY: this.videoElem.videoHeight,
      };
    }

    return {
      minX: Math.max(0, this.trackingBoundingBox.minX - this.trackingBoundingBoxBorderSize),
      minY: Math.max(0, this.trackingBoundingBox.minY - this.trackingBoundingBoxBorderSize),
      maxX: Math.min(this.videoElem.videoWidth, this.trackingBoundingBox.maxX + this.trackingBoundingBoxBorderSize),
      maxY: Math.min(this.videoElem.videoHeight, this.trackingBoundingBox.maxY + this.trackingBoundingBoxBorderSize),
    };
  }

  public startTrackingVideo(video?: HTMLVideoElement) {
    this.stopTrackingVideo();
    this.findVideoElement(video ?? document.querySelector("video"));
    if (this.videoElem !== null && this.videoElem.videoWidth > 0 && this.videoElem.videoHeight > 0) {
      this.setupVideoCanvas();
      void this.updateImageData();
    }
  }

  public stopTrackingVideo() {
    this.videoListenerAbortController?.abort();
    this.videoListenerAbortController = null;
    this.videoElem = null;
    this.trackingBoundingBox = null;
    this.canvas.width = 0;
    this.canvas.height = 0;

    if (this.lastBlobURL !== null) {
      URL.revokeObjectURL(this.lastBlobURL);
      this.lastBlobURL = null;
    }
  }

  private setupVideoCanvas() {
    const region = this.currentRegion;
    if (region === null) {
      return;
    }

    this.canvas.width = Math.max(1, region.maxX - region.minX);
    this.canvas.height = Math.max(1, region.maxY - region.minY);
  }

  private findVideoElement(videoElem: HTMLVideoElement | null) {
    if (videoElem === null) {
      return;
    }

    this.videoElem = videoElem;
    this.videoListenerAbortController = new AbortController();
    const { signal } = this.videoListenerAbortController;

    videoElem.addEventListener('resize', () => {
      this.trackingBoundingBox = null;
      this.setupVideoCanvas();
    }, { signal });

    if (videoElem.videoWidth > 0 && videoElem.videoHeight > 0) {
      this.setupVideoCanvas();
      return;
    }

    videoElem.addEventListener("loadedmetadata", () => {
      this.setupVideoCanvas();
      void this.updateImageData();
    }, { once: true, signal });
  }

  public handleQRCodeFinderReturn(result: VisualDecodeResult | null) {
    if (this.lastBlobURL !== null) {
      URL.revokeObjectURL(this.lastBlobURL);
      this.lastBlobURL = null;
    }

    if (this.videoElem === null) {
      return;
    }

    if (result !== null) {
      const region = this.currentRegion;
      if (region === null) {
        return;
      }

      this.trackingBoundingBox = {
        minX: region.minX + result.boundingBox.minX,
        minY: region.minY + result.boundingBox.minY,
        maxX: region.minX + result.boundingBox.maxX,
        maxY: region.minY + result.boundingBox.maxY,
      };
      this.setupVideoCanvas();
      void this.updateImageData();
      return;
    }

    this.trackingBoundingBox = null;
    this.setupVideoCanvas();
    void this.updateImageData();
  }

  private updateImageData = async () => {
    if (this.context == null || this.canvas == null || this.videoElem == null) {
      return;
    }

    const region = this.currentRegion;
    if (region === null) {
      return;
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(
      this.videoElem,
      region.minX,
      region.minY,
      region.maxX - region.minX,
      region.maxY - region.minY,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    let data = await this.canvas.convertToBlob();
    if (this.videoElem === null) {
      return;
    }

    let dataurl = URL.createObjectURL(data);
    this.lastBlobURL = dataurl;
    this.emit("videoblob", { blob_url: dataurl });
  }
}
