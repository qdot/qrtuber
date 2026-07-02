import { QR_ALPHANUMERIC_REGEX } from "./charset.js";
import { HapticsState } from "./HapticsState.js";
import {
  MAX_FRAME_LENGTH,
  MAX_SEQ,
  PROTOCOL_VERSION,
  SESSION_REGEX,
  type FrameParseResult,
  type QRTuberFrame
} from "./frames.js";

const DECIMAL_SEQ_REGEX = /^[0-9]+$/;
const EXTENSION_KEY_REGEX = /^[A-Z]$/;

function isValidSeq(seqText: string): boolean {
  if (!DECIMAL_SEQ_REGEX.test(seqText)) {
    return false;
  }

  return BigInt(seqText) <= BigInt(MAX_SEQ);
}

function hasValidExtensions(parts: string[]): boolean {
  if (parts.length % 2 !== 0) {
    return false;
  }

  for (let index = 0; index < parts.length; index += 2) {
    const key = parts[index];
    const value = parts[index + 1];

    if (!EXTENSION_KEY_REGEX.test(key) || value.length === 0) {
      return false;
    }
  }

  return true;
}

export function parseFrameResult(text: string): FrameParseResult {
  try {
    if (typeof text !== "string") {
      return { ok: false, error: "BAD_STRUCTURE" };
    }

    if (text.length === 0) {
      return { ok: false, error: "EMPTY" };
    }

    if (text.length > MAX_FRAME_LENGTH) {
      return { ok: false, error: "TOO_LONG" };
    }

    if (!QR_ALPHANUMERIC_REGEX.test(text)) {
      return { ok: false, error: "NOT_ALPHANUMERIC" };
    }

    const parts = text.split(":");
    if (parts.length < 5) {
      return { ok: false, error: "BAD_STRUCTURE" };
    }

    const [version, session, seqText, type, payload, ...extensions] = parts;

    if (version !== PROTOCOL_VERSION) {
      return { ok: false, error: "BAD_VERSION" };
    }

    if (!SESSION_REGEX.test(session)) {
      return { ok: false, error: "BAD_SESSION" };
    }

    if (!isValidSeq(seqText)) {
      return { ok: false, error: "BAD_SEQ" };
    }

    if (type !== "H") {
      return { ok: false, error: "UNKNOWN_TYPE" };
    }

    const state = HapticsState.fromHex(payload);
    if (state === null) {
      return { ok: false, error: "BAD_PAYLOAD" };
    }

    if (!hasValidExtensions(extensions)) {
      return { ok: false, error: "BAD_EXTENSION" };
    }

    return {
      ok: true,
      frame: {
        type: "H",
        session,
        seq: Number(seqText),
        state
      }
    };
  } catch {
    return { ok: false, error: "BAD_STRUCTURE" };
  }
}

export function parseFrame(text: string): QRTuberFrame | null {
  const result = parseFrameResult(text);
  return result.ok ? result.frame : null;
}
