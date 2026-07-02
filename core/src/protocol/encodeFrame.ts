import {
  MAX_FRAME_LENGTH,
  MAX_SEQ,
  PROTOCOL_VERSION,
  SESSION_REGEX,
  type QRTuberFrame
} from "./frames.js";
import { HapticsState } from "./HapticsState.js";

export function encodeFrame(frame: QRTuberFrame): string {
  if (frame === null || typeof frame !== "object") {
    throw new TypeError("Frame must be an object");
  }

  if (frame.type !== "H") {
    throw new TypeError("Unsupported frame type");
  }

  if (!SESSION_REGEX.test(frame.session)) {
    throw new RangeError("Session must match /^[0-9A-Z]{1,8}$/");
  }

  if (!Number.isInteger(frame.seq) || frame.seq < 0 || frame.seq > MAX_SEQ) {
    throw new RangeError("Sequence must be an unsigned 32-bit integer");
  }

  if (!(frame.state instanceof HapticsState)) {
    throw new TypeError("Haptics frame state must be a HapticsState");
  }

  const encoded = `${PROTOCOL_VERSION}:${frame.session}:${frame.seq}:H:${frame.state.toHex()}`;
  if (encoded.length > MAX_FRAME_LENGTH) {
    throw new RangeError("Encoded frame exceeds maximum frame length");
  }

  return encoded;
}
