import { ContentVideoHandler, type BoundingBox, type VisualDecodeResult } from "qrtuber";

import { sendToEngine } from "../../utils/engine-client.js";
import {
  isFrameDecodeResponse,
  type FrameDecodeMode,
  type FrameDecodeResponse,
  type TrackingStoppedReason,
} from "../../utils/messages.js";

type TimeoutHandle = number;
type ScheduleTimeout = (callback: () => void, delayMs: number) => TimeoutHandle;

interface CommandResponse {
  readonly ok: boolean;
  readonly error?: string;
}

const TRACKING_DELAY_MS = 100;
const SEARCHING_DELAY_MS = 500;
const MAX_CONSECUTIVE_SEND_FAILURES = 5;
const VIDEO_BLOB_URL_KEY = `blob_${"url"}`;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Expected FileReader to produce a data URL"));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Failed to read frame blob"));
    });
    reader.readAsDataURL(blob);
  });
}

function getVisibleArea(rect: DOMRect): number {
  const minX = Math.max(0, rect.left);
  const minY = Math.max(0, rect.top);
  const maxX = Math.min(window.innerWidth, rect.right);
  const maxY = Math.min(window.innerHeight, rect.bottom);
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function isVisibleVideo(video: HTMLVideoElement): boolean {
  const rect = video.getBoundingClientRect();
  const style = window.getComputedStyle(video);

  return (
    video.isConnected &&
    rect.width > 0 &&
    rect.height > 0 &&
    getVisibleArea(rect) > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) > 0
  );
}

function findLargestVisibleVideo(): HTMLVideoElement | null {
  let largestVideo: HTMLVideoElement | null = null;
  let largestArea = 0;

  for (const video of document.querySelectorAll("video")) {
    if (!isVisibleVideo(video)) {
      continue;
    }

    const area = getVisibleArea(video.getBoundingClientRect());
    if (area > largestArea) {
      largestArea = area;
      largestVideo = video;
    }
  }

  return largestVideo;
}

function getVideoBlobUrl(event: unknown): string | null {
  if (typeof event !== "object" || event === null) {
    return null;
  }

  const blobUrl = (event as Record<string, unknown>)[VIDEO_BLOB_URL_KEY];
  return typeof blobUrl === "string" ? blobUrl : null;
}

export class TrackingController {
  #scheduleTimeout: ScheduleTimeout;
  #handler: ContentVideoHandler | null = null;
  #pageAbortController: AbortController | null = null;
  #video: HTMLVideoElement | null = null;
  #timer: TimeoutHandle | null = null;
  #active = false;
  #processingFrame = false;
  #seq = 0;
  #consecutiveSendFailures = 0;
  #nextFrameUsesRoi = false;
  #sessionId = 0;

  constructor(scheduleTimeout: ScheduleTimeout) {
    this.#scheduleTimeout = scheduleTimeout;
  }

  get isTracking(): boolean {
    return this.#active;
  }

  async start(): Promise<CommandResponse> {
    await this.#stopLocal();

    const video = findLargestVisibleVideo();
    if (video === null) {
      await this.#reportStopped("no-video");
      return { ok: false, error: "No visible video found" };
    }

    const started = await sendToEngine<CommandResponse>({ type: "tracking/started" });
    if (!started.ok) {
      return started;
    }

    const handler = new ContentVideoHandler();
    const abortController = new AbortController();
    this.#sessionId += 1;
    const sessionId = this.#sessionId;
    this.#handler = handler;
    this.#pageAbortController = abortController;
    this.#active = true;
    this.#processingFrame = false;
    this.#seq = 0;
    this.#consecutiveSendFailures = 0;
    this.#nextFrameUsesRoi = false;

    handler.on("videoblob", this.#handleVideoBlob);
    this.#registerPageLifecycle(sessionId);
    this.#trackVideo(video, sessionId);
    return { ok: true };
  }

  async stop(reason: TrackingStoppedReason): Promise<CommandResponse> {
    await this.#stopLocal();
    await this.#reportStopped(reason);
    return { ok: true };
  }

  #trackVideo(video: HTMLVideoElement, sessionId: number): void {
    const handler = this.#handler;
    const abortController = this.#pageAbortController;
    if (handler === null || abortController === null) {
      return;
    }

    this.#video = video;
    video.addEventListener(
      "error",
      () => {
        if (this.#isCurrentSession(sessionId) && this.#video === video) {
          void this.stop("no-video");
        }
      },
      { signal: abortController.signal }
    );
    video.addEventListener(
      "emptied",
      () => {
        if (this.#isCurrentSession(sessionId) && this.#video === video) {
          void this.stop("no-video");
        }
      },
      { signal: abortController.signal }
    );
    handler.startTrackingVideo(video);
  }

  #ensureTrackedVideo(sessionId: number): boolean {
    if (!this.#isCurrentSession(sessionId)) {
      return false;
    }

    if (this.#video !== null && isVisibleVideo(this.#video)) {
      return true;
    }

    const video = findLargestVisibleVideo();
    if (video === null) {
      void this.stop("no-video");
      return false;
    }

    this.#trackVideo(video, sessionId);
    return true;
  }

  #registerPageLifecycle(sessionId: number): void {
    const abortController = this.#pageAbortController;
    if (abortController === null) {
      return;
    }

    window.addEventListener(
      "pagehide",
      () => {
        if (this.#isCurrentSession(sessionId)) {
          void this.stop("navigation");
        }
      },
      { signal: abortController.signal }
    );
  }

  #handleVideoBlob = (event: unknown): void => {
    if (!this.#active || this.#processingFrame) {
      return;
    }

    const blobUrl = getVideoBlobUrl(event);
    if (blobUrl === null) {
      return;
    }

    this.#processingFrame = true;
    void this.#processFrame(blobUrl, this.#sessionId);
  };

  async #processFrame(blobUrl: string, sessionId: number): Promise<void> {
    const handler = this.#handler;
    if (
      !this.#isCurrentSession(sessionId) ||
      handler === null ||
      !this.#ensureTrackedVideo(sessionId)
    ) {
      this.#processingFrame = false;
      return;
    }

    let decodeResult: VisualDecodeResult | null = null;
    let delayMs = SEARCHING_DELAY_MS;

    try {
      const region = handler.currentRegion;
      const dataUrl = await this.#readBlobUrlAsDataUrl(blobUrl);
      if (!this.#isCurrentSession(sessionId)) {
        return;
      }

      const mode: FrameDecodeMode = this.#nextFrameUsesRoi ? "roi" : "search";
      const response = await sendToEngine<FrameDecodeResponse>({
        type: "frame/decode",
        seq: this.#seq,
        dataUrl,
        mode,
        roiOrigin: this.#roiOrigin(mode, region),
      });

      if (!isFrameDecodeResponse(response)) {
        throw new Error("Malformed frame/decode response");
      }

      this.#seq += 1;
      this.#consecutiveSendFailures = 0;

      if (response.found) {
        decodeResult = {
          payload: "",
          boundingBox: response.boundingBox,
        };
        delayMs = TRACKING_DELAY_MS;
        this.#nextFrameUsesRoi = true;
      } else {
        this.#nextFrameUsesRoi = false;
      }
    } catch (error) {
      if (!this.#isCurrentSession(sessionId)) {
        return;
      }

      console.warn("QRTuber content frame send failed", error);
      this.#nextFrameUsesRoi = false;
      this.#consecutiveSendFailures += 1;

      if (this.#consecutiveSendFailures >= MAX_CONSECUTIVE_SEND_FAILURES) {
        await this.stop("no-video");
        return;
      }
    } finally {
      if (this.#sessionId === sessionId) {
        this.#processingFrame = false;
      }
    }

    if (!this.#isCurrentSession(sessionId)) {
      return;
    }

    this.#scheduleNextCapture(decodeResult, delayMs, sessionId);
  }

  async #readBlobUrlAsDataUrl(blobUrl: string): Promise<string> {
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch captured frame: ${response.status}`);
    }

    return await blobToDataUrl(await response.blob());
  }

  #roiOrigin(mode: FrameDecodeMode, region: BoundingBox | null): BoundingBox | null {
    if (mode !== "roi") {
      return null;
    }

    return region;
  }

  #scheduleNextCapture(
    result: VisualDecodeResult | null,
    delayMs: number,
    sessionId: number
  ): void {
    this.#clearTimer();
    this.#timer = this.#scheduleTimeout(() => {
      this.#timer = null;
      if (
        !this.#isCurrentSession(sessionId) ||
        this.#handler === null ||
        !this.#ensureTrackedVideo(sessionId)
      ) {
        return;
      }

      this.#handler.handleQRCodeFinderReturn(result);
    }, delayMs);
  }

  async #stopLocal(): Promise<void> {
    this.#sessionId += 1;
    this.#active = false;
    this.#processingFrame = false;
    this.#nextFrameUsesRoi = false;
    this.#consecutiveSendFailures = 0;
    this.#clearTimer();
    this.#pageAbortController?.abort();
    this.#pageAbortController = null;
    this.#video = null;

    if (this.#handler !== null) {
      this.#handler.off("videoblob", this.#handleVideoBlob);
      this.#handler.stopTrackingVideo();
      this.#handler = null;
    }
  }

  async #reportStopped(reason: TrackingStoppedReason): Promise<void> {
    try {
      await sendToEngine({ type: "tracking/stopped", reason });
    } catch (error) {
      console.warn(`QRTuber failed to report tracking stop: ${errorMessage(error)}`);
    }
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  #isCurrentSession(sessionId: number): boolean {
    return this.#active && this.#sessionId === sessionId;
  }
}
