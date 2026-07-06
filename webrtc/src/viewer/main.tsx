import React from "react";
import { createRoot } from "react-dom/client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { isFirefox } from "../shared/browser.js";
import { HapticsState } from "../shared/coreBridge.js";
import "../shared/styles.css";
import { ThemeControl } from "../shared/ThemeControl.js";
import { CapturePreview } from "./CapturePreview.js";
import { ChannelMeters } from "./ChannelMeters.js";
import { EmergencyStop } from "./EmergencyStop.js";
import { GamepadPanel } from "./GamepadPanel.js";
import { IntifacePanel } from "./IntifacePanel.js";
import { StatusBar } from "./StatusBar.js";
import { DEFAULT_DECODE_RATE_HZ, useDecodeLoop } from "./useDecodeLoop.js";
import { useDisplayCapture } from "./useDisplayCapture.js";
import { useGamepadHaptics } from "./useGamepadHaptics.js";
import { useIntiface } from "./useIntiface.js";

const HAPTICS_TIMEOUT_MS = 2000;
const DECODE_RATE_OPTIONS_HZ = [5, 10, 15, 20, 30] as const;
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
  const [decodeRateHz, setDecodeRateHz] = useState(DEFAULT_DECODE_RATE_HZ);
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const decodeState = useDecodeLoop(videoElement, stream, decodeRateHz);
  const {
    address,
    applyState: applyIntifaceState,
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
  const {
    applyState: applyGamepadState,
    clearError: clearGamepadError,
    disable: disableGamepad,
    enable: enableGamepad,
    error: gamepadError,
    gamepads,
    isEnabled: isGamepadEnabled,
    isScanning: isGamepadScanning,
    isSupported: isGamepadSupported,
    refreshGamepads,
    scanGamepads,
    selectGamepad,
    selectedIndex: selectedGamepadIndex,
    stopAll: stopAllGamepads,
    testPulse: testGamepadPulse
  } = useGamepadHaptics();
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
    void stopAllGamepads();
  }, [stopAll, stopAllGamepads, stopCapture]);

  const handleEmergencyStop = useCallback(() => {
    setIsEmergencyStopped(true);
    void stopAll();
    void stopAllGamepads();
  }, [stopAll, stopAllGamepads]);

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
      void stopAllGamepads();
    }
  }, [isCapturing, stopAll, stopAllGamepads]);

  useEffect(() => {
    if (isEmergencyStopped || isHapticsStale) {
      void applyIntifaceState(ZERO_STATE);
      void applyGamepadState(ZERO_STATE);
    }
  }, [applyGamepadState, applyIntifaceState, isEmergencyStopped, isHapticsStale]);

  useEffect(() => {
    if (
      decodeState.hapticsState === null ||
      isEmergencyStopped ||
      isHapticsStale
    ) {
      return;
    }

    void applyIntifaceState(decodeState.hapticsState);
    void applyGamepadState(decodeState.hapticsState);
  }, [
    applyGamepadState,
    applyIntifaceState,
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
          <a className="nav-link" href="/app/device/">
            Device
          </a>
          <ThemeControl />
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
        <label className="viewer-toolbar-field">
          <span>Check rate</span>
          <select
            onChange={(event) => setDecodeRateHz(Number(event.currentTarget.value))}
            value={decodeRateHz}
          >
            {DECODE_RATE_OPTIONS_HZ.map((rateHz) => (
              <option key={rateHz} value={rateHz}>
                {rateHz} Hz
              </option>
            ))}
          </select>
        </label>
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
        <GamepadPanel
          error={gamepadError}
          gamepads={gamepads}
          isEnabled={isGamepadEnabled}
          isScanning={isGamepadScanning}
          isSupported={isGamepadSupported}
          onClearError={clearGamepadError}
          onDisable={() => void disableGamepad()}
          onEnable={enableGamepad}
          onRefreshGamepads={refreshGamepads}
          onScanGamepads={scanGamepads}
          onSelectGamepad={selectGamepad}
          onStopAll={() => void stopAllGamepads()}
          onTestPulse={() => void testGamepadPulse()}
          selectedIndex={selectedGamepadIndex}
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
