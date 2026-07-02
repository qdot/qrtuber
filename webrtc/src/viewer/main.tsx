import React from "react";
import { createRoot } from "react-dom/client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { isFirefox } from "../shared/browser.js";
import { HapticsState } from "../shared/coreBridge.js";
import "../shared/styles.css";
import { CapturePreview } from "./CapturePreview.js";
import { ChannelMeters } from "./ChannelMeters.js";
import { EmergencyStop } from "./EmergencyStop.js";
import { IntifacePanel } from "./IntifacePanel.js";
import { StatusBar } from "./StatusBar.js";
import { useDecodeLoop } from "./useDecodeLoop.js";
import { useDisplayCapture } from "./useDisplayCapture.js";
import { useIntiface } from "./useIntiface.js";

const HAPTICS_TIMEOUT_MS = 2000;
const ZERO_CHANNELS = Array<number>(9).fill(0);
const ZERO_STATE = new HapticsState(ZERO_CHANNELS);

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
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const decodeState = useDecodeLoop(videoElement, stream);
  const {
    address,
    applyState,
    clearError,
    connect,
    connectionState,
    deviceCount,
    disconnect,
    error: intifaceError,
    refreshDevices,
    resetAddress,
    setAddress,
    stopAll
  } = useIntiface();
  const isHapticsStale =
    decodeState.stats.lastDecodeAt === null ||
    now - decodeState.stats.lastDecodeAt > HAPTICS_TIMEOUT_MS;
  const channelValues = useMemo(() => {
    if (isEmergencyStopped || isHapticsStale) {
      return ZERO_CHANNELS;
    }

    return decodeState.hapticsState?.toArray() ?? ZERO_CHANNELS;
  }, [decodeState.hapticsState, isEmergencyStopped, isHapticsStale]);

  const handleVideoElement = useCallback((element: HTMLVideoElement | null) => {
    setVideoElement(element);
  }, []);

  const handleStopCapture = useCallback(() => {
    stopCapture();
    void stopAll();
  }, [stopAll, stopCapture]);

  const handleEmergencyStop = useCallback(() => {
    setIsEmergencyStopped(true);
    void stopAll();
  }, [stopAll]);

  const handleResume = useCallback(() => {
    setIsEmergencyStopped(false);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isCapturing) {
      void stopAll();
    }
  }, [isCapturing, stopAll]);

  useEffect(() => {
    if (isEmergencyStopped || isHapticsStale) {
      void applyState(ZERO_STATE);
    }
  }, [applyState, isEmergencyStopped, isHapticsStale]);

  useEffect(() => {
    if (
      decodeState.hapticsState === null ||
      isEmergencyStopped ||
      isHapticsStale
    ) {
      return;
    }

    void applyState(decodeState.hapticsState);
  }, [
    applyState,
    decodeState.hapticsState,
    decodeState.stats.acceptedFrames,
    isEmergencyStopped,
    isHapticsStale
  ]);

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
          onClick={handleStopCapture}
          type="button"
        >
          Stop capture
        </button>
      </section>

      <section className="viewer-output-controls" aria-label="Viewer output controls">
        <IntifacePanel
          address={address}
          connectionState={connectionState}
          deviceCount={deviceCount}
          error={intifaceError}
          onAddressChange={setAddress}
          onClearError={clearError}
          onConnect={() => void connect()}
          onDisconnect={() => void disconnect()}
          onRefreshDevices={refreshDevices}
          onResetAddress={resetAddress}
          onStopAll={() => void stopAll()}
        />
        <EmergencyStop
          isStopped={isEmergencyStopped}
          onResume={handleResume}
          onStop={handleEmergencyStop}
        />
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

        <ChannelMeters
          isStale={isHapticsStale}
          isStopped={isEmergencyStopped}
          values={channelValues}
        />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ViewerApp />
  </React.StrictMode>
);
