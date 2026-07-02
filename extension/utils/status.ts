const DEFAULT_INTIFACE_ADDRESS = "ws://127.0.0.1:12345";

export type IntifaceConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "error";

export type TrackingState = "idle" | "searching" | "tracking" | "no-video";

export interface LastDecodeStatus {
  readonly session: string;
  readonly seq: number;
  readonly at: number;
}

export interface QRTuberStatus {
  readonly intiface: {
    readonly state: IntifaceConnectionState;
    readonly deviceCount: number;
    readonly address: string;
    readonly error: string | null;
  };
  readonly tracking: {
    readonly state: TrackingState;
    readonly tabId: number | null;
    readonly lastDecode: LastDecodeStatus | null;
  };
  readonly hapticsEnabled: boolean;
  readonly lastError: string | null;
}

export function createInitialStatus(address = DEFAULT_INTIFACE_ADDRESS): QRTuberStatus {
  return {
    intiface: {
      state: "disconnected",
      deviceCount: 0,
      address,
      error: null,
    },
    tracking: {
      state: "idle",
      tabId: null,
      lastDecode: null,
    },
    hapticsEnabled: true,
    lastError: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isIntifaceConnectionState(value: unknown): value is IntifaceConnectionState {
  return (
    value === "disconnected" ||
    value === "connecting" ||
    value === "connected" ||
    value === "disconnecting" ||
    value === "error"
  );
}

function isTrackingState(value: unknown): value is TrackingState {
  return (
    value === "idle" ||
    value === "searching" ||
    value === "tracking" ||
    value === "no-video"
  );
}

function isLastDecodeStatus(value: unknown): value is LastDecodeStatus {
  return (
    isRecord(value) &&
    typeof value.session === "string" &&
    isSafeNonNegativeInteger(value.seq) &&
    isFiniteNumber(value.at)
  );
}

export function isQRTuberStatus(value: unknown): value is QRTuberStatus {
  if (!isRecord(value) || !isRecord(value.intiface) || !isRecord(value.tracking)) {
    return false;
  }

  const { intiface, tracking } = value;
  const lastDecode = tracking.lastDecode;

  return (
    isIntifaceConnectionState(intiface.state) &&
    isSafeNonNegativeInteger(intiface.deviceCount) &&
    typeof intiface.address === "string" &&
    isNullableString(intiface.error) &&
    isTrackingState(tracking.state) &&
    (tracking.tabId === null || Number.isSafeInteger(tracking.tabId)) &&
    (lastDecode === null || isLastDecodeStatus(lastDecode)) &&
    typeof value.hapticsEnabled === "boolean" &&
    isNullableString(value.lastError)
  );
}
