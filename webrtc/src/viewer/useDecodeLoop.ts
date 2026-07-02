import { useEffect, useMemo, useRef, useState } from "react";

import {
  ContentVideoHandler,
  QRCodeFinder,
  SequenceTracker,
  type BoundingBox,
  type QRTuberFrame
} from "../shared/coreBridge.js";
import { parseFrameResult } from "../shared/coreBridge.js";

const DECODE_INTERVAL_MS = 100;

export interface DecodeStats {
  acceptedFrames: number;
  decodeAttempts: number;
  decodesPerSec: number;
  duplicateFrames: number;
  foundFrames: number;
  lastDecodeAt: number | null;
  misses: number;
  parseErrors: number;
}

const INITIAL_STATS: DecodeStats = {
  acceptedFrames: 0,
  decodeAttempts: 0,
  decodesPerSec: 0,
  duplicateFrames: 0,
  foundFrames: 0,
  lastDecodeAt: null,
  misses: 0,
  parseErrors: 0
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function translateBoundingBox(region: BoundingBox, box: BoundingBox): BoundingBox {
  return {
    minX: region.minX + box.minX,
    minY: region.minY + box.minY,
    maxX: region.minX + box.maxX,
    maxY: region.minY + box.maxY
  };
}

function getDecodesPerSec(samples: number[], now: number): number {
  const cutoff = now - 1000;
  while (samples.length > 0 && samples[0] < cutoff) {
    samples.shift();
  }
  return samples.length;
}

export function useDecodeLoop(videoElement: HTMLVideoElement | null, stream: MediaStream | null) {
  const [lastFrame, setLastFrame] = useState<QRTuberFrame | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [stats, setStats] = useState<DecodeStats>(INITIAL_STATS);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const acceptedSampleTimesRef = useRef<number[]>([]);
  const latestBlobUrlRef = useRef<string | null>(null);
  const isDecodingRef = useRef(false);

  useEffect(() => {
    acceptedSampleTimesRef.current = [];
    latestBlobUrlRef.current = null;
    isDecodingRef.current = false;
    setLastFrame(null);
    setBoundingBox(null);
    setStats(INITIAL_STATS);
    setDecodeError(null);

    if (stream === null || videoElement === null) {
      return;
    }

    let isActive = true;
    const handler = new ContentVideoHandler();
    const finder = new QRCodeFinder();
    const sequenceTracker = new SequenceTracker();
    const worker = new Worker(new URL("./tickWorker.ts", import.meta.url), {
      type: "module"
    });

    const handleVideoBlob = (event: { blob_url: string }) => {
      latestBlobUrlRef.current = event.blob_url;
    };

    async function decodeOnce() {
      if (!isActive || isDecodingRef.current || latestBlobUrlRef.current === null) {
        return;
      }

      const blobUrl = latestBlobUrlRef.current;
      latestBlobUrlRef.current = null;
      isDecodingRef.current = true;

      try {
        const region = handler.currentRegion;
        await finder.getBlobFromURL(blobUrl);
        const result = await finder.findQRCode();
        const fullFrameBox =
          result !== null && region !== null
            ? translateBoundingBox(region, result.boundingBox)
            : null;

        handler.handleQRCodeFinderReturn(result);

        if (!isActive) {
          return;
        }

        const now = performance.now();
        const decodesPerSec = getDecodesPerSec(acceptedSampleTimesRef.current, now);
        setStats((currentStats) => ({
          ...currentStats,
          decodeAttempts: currentStats.decodeAttempts + 1,
          decodesPerSec,
          foundFrames: currentStats.foundFrames + (result === null ? 0 : 1),
          misses: currentStats.misses + (result === null ? 1 : 0)
        }));
        setBoundingBox(fullFrameBox);

        if (result === null) {
          return;
        }

        const parsed = parseFrameResult(result.payload);
        if (!parsed.ok) {
          setDecodeError(`Frame parse failed: ${parsed.error}`);
          setStats((currentStats) => ({
            ...currentStats,
            parseErrors: currentStats.parseErrors + 1
          }));
          return;
        }

        const isNewFrame = sequenceTracker.accept(parsed.frame);
        if (!isNewFrame) {
          setStats((currentStats) => ({
            ...currentStats,
            duplicateFrames: currentStats.duplicateFrames + 1
          }));
          return;
        }

        acceptedSampleTimesRef.current.push(now);
        const nextDecodesPerSec = getDecodesPerSec(acceptedSampleTimesRef.current, now);
        setLastFrame(parsed.frame);
        setDecodeError(null);
        setStats((currentStats) => ({
          ...currentStats,
          acceptedFrames: currentStats.acceptedFrames + 1,
          decodesPerSec: nextDecodesPerSec,
          lastDecodeAt: Date.now()
        }));
      } catch (error) {
        if (!isActive) {
          return;
        }

        handler.handleQRCodeFinderReturn(null);
        setBoundingBox(null);
        setDecodeError(errorMessage(error));
      } finally {
        isDecodingRef.current = false;
      }
    }

    worker.addEventListener("message", (event: MessageEvent<{ type: string }>) => {
      if (event.data.type === "tick") {
        void decodeOnce();
      }
    });

    handler.on("videoblob", handleVideoBlob);
    handler.startTrackingVideo(videoElement);
    worker.postMessage({ type: "start", intervalMs: DECODE_INTERVAL_MS });

    return () => {
      isActive = false;
      worker.postMessage({ type: "stop" });
      worker.terminate();
      handler.off("videoblob", handleVideoBlob);
      handler.stopTrackingVideo();
      sequenceTracker.reset();
    };
  }, [stream, videoElement]);

  return useMemo(
    () => ({
      boundingBox,
      decodeError,
      hapticsState: lastFrame?.state ?? null,
      lastFrame,
      stats
    }),
    [boundingBox, decodeError, lastFrame, stats]
  );
}
