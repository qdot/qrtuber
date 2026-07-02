import React from "react";
import { createRoot } from "react-dom/client";

import { useCallback, useMemo, useState } from "react";

import { isFirefox } from "../shared/browser.js";
import { smokeTest } from "../shared/coreBridge.js";
import "../shared/styles.css";
import { CapturePreview } from "./CapturePreview.js";
import { StatusBar } from "./StatusBar.js";
import { useDecodeLoop } from "./useDecodeLoop.js";
import { useDisplayCapture } from "./useDisplayCapture.js";

console.log("QRTuber core smoke test", smokeTest());

function ViewerApp() {
  const {
    captureError,
    isCapturing,
    isStarting,
    startCapture,
    stopCapture,
    stream
  } = useDisplayCapture();
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const decodeState = useDecodeLoop(videoElement, stream);
  const channelValues = useMemo(
    () => decodeState.hapticsState?.toArray() ?? Array<number>(9).fill(0),
    [decodeState.hapticsState]
  );

  const handleVideoElement = useCallback((element: HTMLVideoElement | null) => {
    setVideoElement(element);
  }, []);

  return (
    <main className="app-shell viewer-shell">
      <header className="top-bar">
        <h1>QRTuber Web Viewer</h1>
        <nav className="top-nav" aria-label="Viewer navigation">
          <a className="nav-link" href="/app/generator/">
            Generator
          </a>
        </nav>
      </header>

      <section className="viewer-toolbar" aria-label="Capture controls">
        <button
          className="primary-button"
          disabled={isStarting || isCapturing}
          onClick={() => void startCapture()}
          type="button"
        >
          {isStarting ? "Starting capture" : "Start capture"}
        </button>
        <button
          className="secondary-button"
          disabled={!isCapturing}
          onClick={stopCapture}
          type="button"
        >
          Stop capture
        </button>
      </section>

      {isFirefox ? (
        <section className="viewer-notice">
          Firefox capture works best when the stream is detached to its own browser window,
          then that window is selected in the capture picker.
        </section>
      ) : null}

      <StatusBar
        captureError={captureError}
        decodeError={decodeState.decodeError}
        hapticsState={decodeState.hapticsState}
        isCapturing={isCapturing}
        isStarting={isStarting}
        lastFrame={decodeState.lastFrame}
        stats={decodeState.stats}
      />

      <CapturePreview
        boundingBox={decodeState.boundingBox}
        onVideoElement={handleVideoElement}
        stream={stream}
      />

      <section className="viewer-metrics" aria-label="Decode metrics">
        <div className="metric-grid">
          <div>
            <span className="metric-label">Attempts</span>
            <span className="metric-value">{decodeState.stats.decodeAttempts}</span>
          </div>
          <div>
            <span className="metric-label">Found</span>
            <span className="metric-value">{decodeState.stats.foundFrames}</span>
          </div>
          <div>
            <span className="metric-label">Accepted</span>
            <span className="metric-value">{decodeState.stats.acceptedFrames}</span>
          </div>
          <div>
            <span className="metric-label">Duplicates</span>
            <span className="metric-value">{decodeState.stats.duplicateFrames}</span>
          </div>
          <div>
            <span className="metric-label">Misses</span>
            <span className="metric-value">{decodeState.stats.misses}</span>
          </div>
          <div>
            <span className="metric-label">Parse errors</span>
            <span className="metric-value">{decodeState.stats.parseErrors}</span>
          </div>
        </div>

        <div className="channel-meter-grid" aria-label="Decoded haptics channels">
          {channelValues.map((value, index) => (
            <div className="channel-meter" key={index}>
              <span className="channel-meter-label">CH{index + 1}</span>
              <meter min={0} max={255} value={value} />
              <span className="channel-meter-value">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ViewerApp />
  </React.StrictMode>
);
