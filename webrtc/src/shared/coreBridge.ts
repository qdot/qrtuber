export {
  HapticsState,
  IntifaceHapticsAdapter,
  QRCodeFinder,
  SequenceTracker,
  encodeFrame,
  parseFrame,
  parseFrameResult,
  type QRTuberFrame,
  type VisualDecodeResult
} from "qrtuber";

import { parseFrame } from "qrtuber";

export function smokeTest() {
  return parseFrame("QT1:A7F2:18422:H:00FF4080A010203040");
}
