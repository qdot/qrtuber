
const debug = false;

function debugLog(logstr: String) {
  if (debug) {
    console.log(debugLog);
  }
}

class ContentVideoHandler {
  private videoElem: HTMLVideoElement | null = null;// = document.getElementById("video");
  private canvas: OffscreenCanvas;// = document.querySelector("canvas");
  private context: OffscreenCanvasRenderingContext2D;// = canvas.getContext("2d");
  private lastBlobURL: URL | null = null;
  private hasFoundQRCode = false;
  private trackingBoundingBox: number[] = [0,0,0,0];
  private trackingBoundingBoxBorderSize: number = 10;
  private trackingInterval = 100;
  
  constructor() {
  }

  public get isTrackingVideo() { return this.videoElem !== null; }

  public stopTrackingVideo() {
    this.videoElem = null;
  }

  private findVideoElement() {
    let videoElem = document.querySelector("video");
    if (videoElem !== null) {
      videoElem.addEventListener('resize', (e) => {
        console.log([
          e.target.videoWidth,
          e.target.videoHeight
        ]);
      });
      console.log(`FOUND VIDEO CONTENT ${videoElem!.videoWidth}`);
      if (videoElem!["videoWidth"] !== undefined && videoElem!.videoWidth > 0) {
        canvas = new OffscreenCanvas(videoElem!.videoWidth, videoElem!.videoHeight);
        console.log(`Creating canvas with ${videoElem!.videoWidth} ${videoElem!.videoHeight}`);
        context = canvas.getContext("2d")!;
        updateImageData();
      } else {
        console.log("Waiting for metadata");
        videoElem!.addEventListener("loadedmetadata", () => {
          canvas = new OffscreenCanvas(1920, 1080); //videoElem!.videoWidth, videoElem!.videoHeight);
          console.log(`Creating canvas with ${videoElem!.videoWidth} ${videoElem!.videoHeight}`);
          context = canvas.getContext("2d")!;
          updateImageData();
        });
      }
    } else {
      console.log('CANNOT FIND VIDEO CONTENT');
    }
  }

  private handleVideoElementResolutionUpdate() {

  }

  private updateImageData = async () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (this.hasFoundQRCode) {
      context.drawImage(videoElem, trackingBoundingBox[0][0] - trackingBoundingBoxBorderSize, trackingBoundingBox[0][1] - trackingBoundingBoxBorderSize, pointBoundary[1][0] - pointBoundary[0][0] + trackingBoundingBoxBorderSize, pointBoundary[1][1] - pointBoundary[0][1] + trackingBoundingBoxBorderSize, 0, 0, pointBoundary[1][0] - pointBoundary[0][0] + trackingBoundingBoxBorderSize, pointBoundary[1][1] - pointBoundary[0][1] + trackingBoundingBoxBorderSize);
    } else {
      context.drawImage(videoElem!, 0, 0, canvas.width, canvas.height);
    }
    let data = await canvas.convertToBlob();
    let dataurl = URL.createObjectURL(data);
    // Send out to background
    lastBlobURL = dataurl;
    browser.runtime.sendMessage({ blob_url: dataurl });
  }
}