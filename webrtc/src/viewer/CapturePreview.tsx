import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { BoundingBox } from "../shared/coreBridge.js";

interface CapturePreviewProps {
  boundingBox: BoundingBox | null;
  onVideoElement: (videoElement: HTMLVideoElement | null) => void;
  stream: MediaStream | null;
}

interface VideoSize {
  height: number;
  width: number;
}

export function CapturePreview({ boundingBox, onVideoElement, stream }: CapturePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoSize, setVideoSize] = useState<VideoSize | null>(null);

  const setVideoRef = useCallback(
    (videoElement: HTMLVideoElement | null) => {
      videoRef.current = videoElement;
      onVideoElement(videoElement);
    },
    [onVideoElement]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }

    video.srcObject = stream;

    if (stream === null) {
      video.pause();
      setVideoSize(null);
      return;
    }

    const updateSize = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoSize({ width: video.videoWidth, height: video.videoHeight });
      }
    };

    video.addEventListener("loadedmetadata", updateSize);
    video.addEventListener("resize", updateSize);
    updateSize();
    void video.play().catch(() => {});

    return () => {
      video.removeEventListener("loadedmetadata", updateSize);
      video.removeEventListener("resize", updateSize);
      video.pause();
      video.srcObject = null;
    };
  }, [stream]);

  const overlayStyle = useMemo(() => {
    if (boundingBox === null || videoSize === null) {
      return null;
    }

    return {
      height: `${((boundingBox.maxY - boundingBox.minY) / videoSize.height) * 100}%`,
      left: `${(boundingBox.minX / videoSize.width) * 100}%`,
      top: `${(boundingBox.minY / videoSize.height) * 100}%`,
      width: `${((boundingBox.maxX - boundingBox.minX) / videoSize.width) * 100}%`
    };
  }, [boundingBox, videoSize]);

  return (
    <section className="viewer-preview-section" aria-label="Captured stream preview">
      {stream === null ? (
        <div className="viewer-preview-empty">
          <span>No capture active</span>
        </div>
      ) : null}
      <div className="viewer-preview-frame">
        <video
          ref={setVideoRef}
          className="viewer-preview-video"
          muted
          playsInline
        />
        {overlayStyle !== null ? (
          <div className="viewer-bounding-box" style={overlayStyle} aria-hidden="true" />
        ) : null}
      </div>
    </section>
  );
}
