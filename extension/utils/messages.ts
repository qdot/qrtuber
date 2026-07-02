import type { BoundingBox, VisualDecodeResult } from "qrtuber";

import { isQRTuberStatus, type QRTuberStatus } from "./status.js";

export type FrameDecodeMode = "search" | "roi";
export type TrackingStoppedReason = "user" | "no-video" | "navigation";

export interface FrameDecodeRequest {
  readonly type: "frame/decode";
  readonly seq: number;
  readonly dataUrl: string;
  readonly mode: FrameDecodeMode;
  readonly roiOrigin: BoundingBox | null;
}

export interface TrackingStartedRequest {
  readonly type: "tracking/started";
}

export interface TrackingStoppedRequest {
  readonly type: "tracking/stopped";
  readonly reason: TrackingStoppedReason;
}

export interface IntifaceConnectRequest {
  readonly type: "intiface/connect";
}

export interface IntifaceDisconnectRequest {
  readonly type: "intiface/disconnect";
}

export interface IntifaceDevicesGetRequest {
  readonly type: "intiface/devices/get";
}

export interface HapticsSetEnabledRequest {
  readonly type: "haptics/set-enabled";
  readonly enabled: boolean;
}

export interface StatusGetRequest {
  readonly type: "status/get";
}

export type EngineRequest =
  | FrameDecodeRequest
  | TrackingStartedRequest
  | TrackingStoppedRequest
  | IntifaceConnectRequest
  | IntifaceDisconnectRequest
  | IntifaceDevicesGetRequest
  | HapticsSetEnabledRequest
  | StatusGetRequest;

export interface EnsureEngineRequest {
  readonly type: "engine/ensure";
}

export type FrameDecodeResponse =
  | {
      readonly found: true;
      readonly boundingBox: BoundingBox;
    }
  | {
      readonly found: false;
      readonly error?: string;
    };

export interface DeviceActuator {
  readonly index: number;
  readonly type: "vibrate";
  readonly name?: string;
}

export interface DeviceInfo {
  readonly name: string;
  readonly actuators: readonly DeviceActuator[];
}

export type ContentCommand =
  | {
      readonly type: "content/ping";
    }
  | {
      readonly type: "content/start";
    }
  | {
      readonly type: "content/stop";
    };

export interface StatusBroadcast {
  readonly type: "status/update";
  readonly status: QRTuberStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isFrameDecodeMode(value: unknown): value is FrameDecodeMode {
  return value === "search" || value === "roi";
}

function isTrackingStoppedReason(value: unknown): value is TrackingStoppedReason {
  return value === "user" || value === "no-video" || value === "navigation";
}

export function isBoundingBox(value: unknown): value is BoundingBox {
  return (
    isRecord(value) &&
    typeof value.minX === "number" &&
    Number.isFinite(value.minX) &&
    typeof value.minY === "number" &&
    Number.isFinite(value.minY) &&
    typeof value.maxX === "number" &&
    Number.isFinite(value.maxX) &&
    typeof value.maxY === "number" &&
    Number.isFinite(value.maxY)
  );
}

export function isVisualDecodeResult(value: unknown): value is VisualDecodeResult {
  return (
    isRecord(value) &&
    typeof value.payload === "string" &&
    isBoundingBox(value.boundingBox)
  );
}

export function isFrameDecodeRequest(value: unknown): value is FrameDecodeRequest {
  return (
    isRecord(value) &&
    value.type === "frame/decode" &&
    isSafeNonNegativeInteger(value.seq) &&
    isNonEmptyString(value.dataUrl) &&
    isFrameDecodeMode(value.mode) &&
    (value.roiOrigin === null || isBoundingBox(value.roiOrigin))
  );
}

export function isTrackingStartedRequest(
  value: unknown
): value is TrackingStartedRequest {
  return isRecord(value) && value.type === "tracking/started";
}

export function isTrackingStoppedRequest(
  value: unknown
): value is TrackingStoppedRequest {
  return (
    isRecord(value) &&
    value.type === "tracking/stopped" &&
    isTrackingStoppedReason(value.reason)
  );
}

export function isHapticsSetEnabledRequest(
  value: unknown
): value is HapticsSetEnabledRequest {
  return (
    isRecord(value) &&
    value.type === "haptics/set-enabled" &&
    typeof value.enabled === "boolean"
  );
}

export function isEngineRequest(value: unknown): value is EngineRequest {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.type) {
    case "frame/decode":
      return isFrameDecodeRequest(value);
    case "tracking/started":
      return isTrackingStartedRequest(value);
    case "tracking/stopped":
      return isTrackingStoppedRequest(value);
    case "intiface/connect":
    case "intiface/disconnect":
    case "intiface/devices/get":
    case "status/get":
      return true;
    case "haptics/set-enabled":
      return isHapticsSetEnabledRequest(value);
    default:
      return false;
  }
}

export function isEnsureEngineRequest(value: unknown): value is EnsureEngineRequest {
  return isRecord(value) && value.type === "engine/ensure";
}

export function isContentCommand(value: unknown): value is ContentCommand {
  return (
    isRecord(value) &&
    (value.type === "content/ping" ||
      value.type === "content/start" ||
      value.type === "content/stop")
  );
}

export function isFrameDecodeResponse(value: unknown): value is FrameDecodeResponse {
  if (!isRecord(value) || typeof value.found !== "boolean") {
    return false;
  }

  if (value.found) {
    return isBoundingBox(value.boundingBox);
  }

  return value.error === undefined || typeof value.error === "string";
}

export function isDeviceActuator(value: unknown): value is DeviceActuator {
  return (
    isRecord(value) &&
    isSafeNonNegativeInteger(value.index) &&
    value.type === "vibrate" &&
    (value.name === undefined || typeof value.name === "string")
  );
}

export function isDeviceInfo(value: unknown): value is DeviceInfo {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    Array.isArray(value.actuators) &&
    value.actuators.every(isDeviceActuator)
  );
}

export function isStatusBroadcast(value: unknown): value is StatusBroadcast {
  return (
    isRecord(value) &&
    value.type === "status/update" &&
    isQRTuberStatus(value.status)
  );
}
