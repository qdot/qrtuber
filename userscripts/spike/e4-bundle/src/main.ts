import { HapticsState, parseFrame, SequenceTracker } from "qrtuber";

const probeFrame = "QT1:A7F2:18422:H:00FF4080A010203040";
const tracker = new SequenceTracker();
const parsed = parseFrame(probeFrame);
const stateHex = parsed === null ? new HapticsState().toHex() : parsed.state.toHex();

const panel = document.createElement("section");
panel.id = "qrtuber-e4-bundle-probe";
panel.style.cssText = [
  "position:fixed",
  "z-index:2147483647",
  "right:12px",
  "bottom:12px",
  "background:#111",
  "color:#f6f6f6",
  "font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  "border:1px solid #666",
  "border-radius:6px",
  "padding:10px",
].join(";");
panel.textContent =
  parsed === null
    ? "QRTuber core import failed"
    : `QRTuber core import ok: ${stateHex} accepted=${tracker.accept(parsed)}`;
document.documentElement.append(panel);
