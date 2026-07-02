export const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");

type DisplaySurfaceHint = "include" | "exclude";

type ExtendedDisplayVideoConstraints = MediaTrackConstraints & {
  selfBrowserSurface?: DisplaySurfaceHint;
  surfaceSwitching?: DisplaySurfaceHint;
};

export function getDisplayMediaConstraints(): DisplayMediaStreamOptions {
  const video: ExtendedDisplayVideoConstraints = {
    frameRate: { ideal: 30, max: 60 }
  };

  if (!isFirefox) {
    video.selfBrowserSurface = "exclude";
    video.surfaceSwitching = "include";
  }

  return {
    audio: false,
    video
  };
}
