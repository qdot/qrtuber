import { useCallback, useEffect, useState } from "react";

import { getDisplayMediaConstraints } from "../shared/browser.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useDisplayCapture() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopCapture = useCallback(() => {
    setStream((currentStream) => {
      currentStream?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const startCapture = useCallback(async () => {
    if (navigator.mediaDevices?.getDisplayMedia === undefined) {
      setCaptureError("Display capture is not available in this browser.");
      return;
    }

    setIsStarting(true);
    setCaptureError(null);

    try {
      const nextStream = await navigator.mediaDevices.getDisplayMedia(
        getDisplayMediaConstraints()
      );
      setStream((currentStream) => {
        currentStream?.getTracks().forEach((track) => track.stop());
        return nextStream;
      });
    } catch (error) {
      setCaptureError(errorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }, []);

  useEffect(() => {
    if (stream === null) {
      return;
    }

    const handleEnded = () => {
      setStream((currentStream) => {
        if (currentStream !== stream) {
          return currentStream;
        }

        currentStream.getTracks().forEach((track) => {
          if (track.readyState !== "ended") {
            track.stop();
          }
        });
        return null;
      });
    };

    const tracks = stream.getTracks();
    tracks.forEach((track) => track.addEventListener("ended", handleEnded));

    return () => {
      tracks.forEach((track) => track.removeEventListener("ended", handleEnded));
    };
  }, [stream]);

  return {
    captureError,
    isCapturing: stream !== null,
    isStarting,
    startCapture,
    stopCapture,
    stream
  };
}
