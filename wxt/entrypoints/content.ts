let videoElem: HTMLVideoElement | null;// = document.getElementById("video");
let canvas: OffscreenCanvas;// = document.querySelector("canvas");
let context: OffscreenCanvasRenderingContext2D;// = canvas.getContext("2d");
let lastBlobURL;

export default defineContentScript({
  //matches: ['*://twitch.tv/*', '*://google.com/*', '*://youtube.com/*'],
  // Set "registration" to runtime so this file isn't listed in manifest
  matches: ['*://*/*'],
  main(ctx) {
    let timeSent = Date.now();
    let lastUpdate = null;
    const updateImageData = async () => {
      timeSent = Date.now();
      context.clearRect(0, 0, canvas.width, canvas.height);
      //context.drawImage(videoElem, pointBoundary[0][0] - 10, pointBoundary[0][1] - 10, pointBoundary[1][0] - pointBoundary[0][0] + 20, pointBoundary[1][1] - pointBoundary[0][1] + 20, 0, 0, pointBoundary[1][0] - pointBoundary[0][0] + 20, pointBoundary[1][1] - pointBoundary[0][1] + 20);
      context.drawImage(videoElem!, 0, 0, canvas.width, canvas.height);
      let data = await canvas.convertToBlob();
      let dataurl = URL.createObjectURL(data);
      // Send out to background
      lastBlobURL = dataurl;
      browser.runtime.sendMessage({ blob_url: dataurl });
    }
    browser.runtime.onMessage.addListener((obj) => {
      //if (obj["canvas"] !== undefined) {
      console.log(`Got canvas back, updating and bouncing canvas: ${obj.message}`);
      URL.revokeObjectURL(lastBlobURL);
      let currentTime = Date.now();
      console.log(`Time to process ${currentTime - timeSent}`)
      //canvas = obj["canvas"];
      updateImageData();
      //}
    });
    console.log('Hello content.');
    console.log(ctx);
    videoElem = document.querySelector("video");
    if (videoElem !== undefined) {
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
  },
});
