import { HapticsState } from "./HapticsState.js";

export const PROTOCOL_VERSION = "QT1";
export const MAX_SEQ = 4294967295;
export const MAX_FRAME_LENGTH = 256;
export const SESSION_REGEX = /^[0-9A-Z]{1,8}$/;

export interface HapticsFrame {
  type: "H";
  session: string;
  seq: number;
  state: HapticsState;
}

export type QRTuberFrame = HapticsFrame;

export type FrameParseError =
  | "EMPTY"
  | "TOO_LONG"
  | "NOT_ALPHANUMERIC"
  | "BAD_STRUCTURE"
  | "BAD_VERSION"
  | "BAD_SESSION"
  | "BAD_SEQ"
  | "UNKNOWN_TYPE"
  | "BAD_PAYLOAD"
  | "BAD_EXTENSION";

export type FrameParseResult =
  | { ok: true; frame: QRTuberFrame }
  | { ok: false; error: FrameParseError };
