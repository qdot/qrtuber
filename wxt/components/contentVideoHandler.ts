import { QRCodeFinderResult } from "./qrCodeFinder";

const debug = false;

function debugLog(logstr: String) {
  if (debug) {
    console.log(debugLog);
  }
}

export class ContentVideoHandler {
  private videoElem: HTMLVideoElement | null = null;
  private canvas: OffscreenCanvas = new OffscreenCanvas(0, 0);
  private context: OffscreenCanvasRenderingContext2D = this.canvas.getContext("2d")!;
  private lastBlobURL: string | null = null;
  private hasFoundQRCode = false;
  private trackingBoundingBox: number[][] = [[0, 0], [0, 0]];
  private trackingBoundingBoxBorderSize: number = 10;
  private trackingInterval = 100;

  constructor() {
  }

  public get isTrackingVideo() { return this.videoElem !== null; }

  public startTrackingVideo() {
    this.findVideoElement();
    if (this.videoElem !== null) {
      this.updateImageData();
    }
  }

  public stopTrackingVideo() {
    this.videoElem = null;
  }

  private setupVideoCanvas() {
    if (this.hasFoundQRCode) {
      // If we have a QRCode, set up our canvas
      this.canvas.width = this.trackingBoundingBox[1][0] - this.trackingBoundingBox[0][0] + (this.trackingBoundingBoxBorderSize * 2);
      this.canvas.height = this.trackingBoundingBox[1][1] - this.trackingBoundingBox[0][1] + (this.trackingBoundingBoxBorderSize * 2);
      console.log(`Updating canvas to bounding box size ${this.canvas.width} ${this.canvas.height}`);
    } else if (this.videoElem !== null) {
      this.canvas.width = this.videoElem.videoWidth;
      this.canvas.height = this.videoElem.videoHeight;
      this.trackingBoundingBox = [[0, 0], [this.videoElem.videoWidth, this.videoElem.videoHeight]];
      console.log(`Updating canvas to video width size ${this.videoElem.videoWidth} ${this.videoElem.videoHeight}`);
    }
  }

  private findVideoElement() {
    let videoElem = document.querySelector("video");
    if (videoElem !== null) {
      // If the video resizes, restart tracking
      videoElem.addEventListener('resize', (e) => {
        this.hasFoundQRCode = false;
        this.setupVideoCanvas();
      });
      this.videoElem = videoElem;
      if (videoElem["videoWidth"] !== undefined && videoElem.videoWidth > 0) {
        this.setupVideoCanvas();
      } else {
        console.log("Waiting for metadata");
        videoElem!.addEventListener("loadedmetadata", () => {
          this.setupVideoCanvas();
        });
      }
    } else {
      console.log('Cannot find video content on page.');
    }
  }

  private handleQRCodeFinderReturn(result: QRCodeFinderResult) {
    if (this.lastBlobURL !== null) URL.revokeObjectURL(this.lastBlobURL);
    if (result !== undefined && result.Message !== null && result.BoundingBox !== null) {
      if (!this.hasFoundQRCode) {
        this.trackingBoundingBox = result.BoundingBox;
        this.hasFoundQRCode = true;
        // Reset canvas to only be size of tracked position
        this.setupVideoCanvas();
      }
      this.updateImageData();
    } else {
      console.log("No QRCode found, resetting bounding box to full video size");
      this.hasFoundQRCode = false;
      this.setupVideoCanvas();
      this.updateImageData();
    }
  }

  private updateImageData = async () => {
    if (this.context == null || this.canvas == null || this.videoElem == null) {
      console.log("Canvas or context is invalid, cannot update image data");
      return;
    }
    let startTime = Date.now();
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.hasFoundQRCode) {
      this.context.drawImage(
        this.videoElem,
        this.trackingBoundingBox[0][0] - this.trackingBoundingBoxBorderSize,
        this.trackingBoundingBox[0][1] - this.trackingBoundingBoxBorderSize,
        this.trackingBoundingBox[1][0] - this.trackingBoundingBox[0][0] + (this.trackingBoundingBoxBorderSize * 2),
        this.trackingBoundingBox[1][1] - this.trackingBoundingBox[0][1] + (this.trackingBoundingBoxBorderSize * 2),
        0,
        0,
        this.trackingBoundingBox[1][0] - this.trackingBoundingBox[0][0] + (this.trackingBoundingBoxBorderSize * 2),
        this.trackingBoundingBox[1][1] - this.trackingBoundingBox[0][1] + (this.trackingBoundingBoxBorderSize * 2));
    } else {
      this.context.drawImage(this.videoElem!, 0, 0, this.canvas.width, this.canvas.height);
    }
    let data = await this.canvas.convertToBlob();
    let dataurl = URL.createObjectURL(data);
    // Send out to background
    this.lastBlobURL = dataurl;
    let result = await browser.runtime.sendMessage({ blob_url: dataurl });

    //console.log(`Processing Time ${Date.now() - startTime}`);
    this.handleQRCodeFinderReturn(result);
  }
}