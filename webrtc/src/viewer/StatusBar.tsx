import type { HapticsState, QRTuberFrame } from "../shared/coreBridge.js";

import type { DecodeStats } from "./useDecodeLoop.js";

interface StatusBarProps {
  captureError: string | null;
  decodeError: string | null;
  hapticsState: HapticsState | null;
  isCapturing: boolean;
  isStarting: boolean;
  lastFrame: QRTuberFrame | null;
  stats: DecodeStats;
}

function formatAge(lastDecodeAt: number | null): string {
  if (lastDecodeAt === null) {
    return "never";
  }

  const ageMs = Math.max(0, Date.now() - lastDecodeAt);
  if (ageMs < 1000) {
    return `${ageMs} ms`;
  }

  return `${(ageMs / 1000).toFixed(1)} s`;
}

export function StatusBar({
  captureError,
  decodeError,
  hapticsState,
  isCapturing,
  isStarting,
  lastFrame,
  stats
}: StatusBarProps) {
  const captureStatus = isStarting ? "Starting" : isCapturing ? "Capturing" : "Idle";
  const error = captureError ?? decodeError;

  return (
    <section className="viewer-status-bar" aria-label="Viewer status">
      <div className="status-item">
        <span className="status-label">Capture</span>
        <span className={isCapturing ? "status-value live" : "status-value"}>
          {captureStatus}
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">Session</span>
        <span className="status-value">{lastFrame?.session ?? "-"}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Seq</span>
        <span className="status-value">{lastFrame?.seq ?? "-"}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Accepted/s</span>
        <span className="status-value">{stats.decodesPerSec}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Last decode</span>
        <span className="status-value">{formatAge(stats.lastDecodeAt)}</span>
      </div>
      <div className="status-item wide">
        <span className="status-label">Haptics</span>
        <span className="status-value monospace">{hapticsState?.toHex() ?? "-"}</span>
      </div>
      {error !== null ? (
        <div className="status-item error wide">
          <span className="status-label">Error</span>
          <span className="status-value">{error}</span>
        </div>
      ) : null}
    </section>
  );
}
