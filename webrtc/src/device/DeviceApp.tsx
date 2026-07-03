import { useEffect, useMemo, useRef, useState } from "react";
import type { QRCodeErrorCorrectionLevel } from "qrcode";

import {
  ChannelMeters
} from "../viewer/ChannelMeters.js";
import {
  ERROR_CORRECTION_LEVELS,
  QRCanvas,
  QR_SIZE_PRESETS
} from "../generator/QRCanvas.js";
import { useDeviceFrameClock } from "./useDeviceFrameClock.js";
import { useLovenseWebsocketDevice } from "./useLovenseWebsocketDevice.js";

const FRAME_REGEX = /^QT1:[0-9A-F]{4}:\d+:H:[0-9A-F]{18}$/;

function getQueryFlag(name: string): boolean {
  return new URLSearchParams(window.location.search).get(name) === "1";
}

function clampCustomSize(value: number): number {
  if (!Number.isFinite(value)) {
    return 300;
  }

  return Math.min(800, Math.max(128, Math.round(value)));
}

function formatElapsed(timestamp: number | null, now: number): string {
  if (timestamp === null) {
    return "-";
  }

  const elapsedMs = now - timestamp;
  if (elapsedMs < 1000) {
    return `${elapsedMs} ms`;
  }

  return `${(elapsedMs / 1000).toFixed(1)} s`;
}

export function DeviceApp() {
  const [qrSize, setQrSize] = useState(300);
  const [customSize, setCustomSize] = useState(300);
  const [errorCorrectionLevel, setErrorCorrectionLevel] =
    useState<QRCodeErrorCorrectionLevel>("M");
  const [now, setNow] = useState(() => Date.now());
  const autoConnectAttemptedRef = useRef(false);
  const device = useLovenseWebsocketDevice();
  const {
    frame,
    newSession,
    session
  } = useDeviceFrameClock(device.hapticsState, device.frameUpdateId);
  const overlayMode = useMemo(() => getQueryFlag("overlay"), []);
  const autoConnectMode = useMemo(() => overlayMode || getQueryFlag("connect"), [overlayMode]);
  const videoMode = useMemo(() => getQueryFlag("video"), []);
  const isConnected = device.connectionState === "connected";
  const isBusy =
    device.connectionState === "connecting" ||
    device.connectionState === "disconnecting";
  const frameLooksValid = FRAME_REGEX.test(frame.encoded);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (
      !autoConnectMode ||
      autoConnectAttemptedRef.current ||
      device.connectionState !== "disconnected" ||
      device.deviceIdentifier.trim().length === 0 ||
      device.deviceAddress.trim().length === 0
    ) {
      return;
    }

    autoConnectAttemptedRef.current = true;
    device.connect();
  }, [
    autoConnectMode,
    device.connectionState,
    device.deviceAddress,
    device.deviceIdentifier,
    device.connect
  ]);

  return (
    <main className={`app-shell device-shell${overlayMode ? " overlay-mode" : ""}`}>
      {overlayMode ? null : (
        <header className="top-bar">
          <h1>QRTuber Device</h1>
          <nav className="top-nav" aria-label="Device navigation">
            <a className="nav-link" href="/app/">
              Viewer
            </a>
            <a className="nav-link" href="/app/generator/">
              Generator
            </a>
          </nav>
        </header>
      )}

      <div className="device-layout">
        {overlayMode ? null : (
          <aside className="device-controls" aria-label="Device controls">
            <section className="generator-section" aria-labelledby="connection-title">
              <div className="section-heading">
                <h2 id="connection-title">Connection</h2>
                <span className={isConnected ? "status-value live" : "status-value"}>
                  {device.connectionState}
                </span>
              </div>

              <div className="device-field-grid">
                <label>
                  <span>Server</span>
                  <input
                    disabled={isConnected || isBusy}
                    onChange={(event) => device.setAddress(event.currentTarget.value)}
                    spellCheck={false}
                    type="url"
                    value={device.address}
                  />
                </label>
                <label>
                  <span>Identifier</span>
                  <input
                    disabled={isConnected || isBusy}
                    onChange={(event) => device.setDeviceIdentifier(event.currentTarget.value)}
                    spellCheck={false}
                    value={device.deviceIdentifier}
                  />
                </label>
                <label>
                  <span>Device address</span>
                  <input
                    disabled={isConnected || isBusy}
                    onChange={(event) => device.setDeviceAddress(event.currentTarget.value)}
                    spellCheck={false}
                    value={device.deviceAddress}
                  />
                </label>
              </div>

              <div className="device-actions">
                {isConnected ? (
                  <button
                    className="secondary-button"
                    disabled={isBusy}
                    onClick={device.disconnect}
                    type="button"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    disabled={
                      isBusy ||
                      device.deviceIdentifier.trim().length === 0 ||
                      device.deviceAddress.trim().length === 0
                    }
                    onClick={device.connect}
                    type="button"
                  >
                    {device.connectionState === "connecting" ? "Connecting" : "Connect"}
                  </button>
                )}
                <button
                  className="secondary-button"
                  disabled={isConnected || isBusy}
                  onClick={device.resetAddress}
                  type="button"
                >
                  Reset Server
                </button>
                <button
                  className="secondary-button"
                  disabled={isConnected || isBusy}
                  onClick={device.resetDeviceIdentifier}
                  type="button"
                >
                  Reset ID
                </button>
                <button
                  className="secondary-button"
                  disabled={isConnected || isBusy}
                  onClick={device.resetDeviceAddress}
                  type="button"
                >
                  New Address
                </button>
                <button className="secondary-button" onClick={device.zero} type="button">
                  Zero QR
                </button>
              </div>

              {device.error === null ? null : (
                <div className="intiface-error">
                  <span>{device.error}</span>
                  <button className="secondary-button" onClick={device.clearError} type="button">
                    Clear
                  </button>
                </div>
              )}
            </section>

            <section className="generator-section" aria-labelledby="clock-title">
              <div className="section-heading">
                <h2 id="clock-title">Clock</h2>
                <button className="secondary-button" type="button" onClick={newSession}>
                  New Session
                </button>
              </div>

              <div className="control-grid">
                <label>
                  <span>Session</span>
                  <input readOnly value={session} />
                </label>
                <label>
                  <span>Frames</span>
                  <input readOnly value={frame.seq} />
                </label>
              </div>
            </section>

            <section className="generator-section" aria-labelledby="device-qr-settings-title">
              <h2 id="device-qr-settings-title">QR</h2>
              <div className="control-grid">
                <label>
                  <span>Size</span>
                  <select
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      if (value === "custom") {
                        setQrSize(clampCustomSize(customSize));
                        return;
                      }

                      setQrSize(Number(value));
                    }}
                    value={QR_SIZE_PRESETS.includes(qrSize as (typeof QR_SIZE_PRESETS)[number]) ? String(qrSize) : "custom"}
                  >
                    {QR_SIZE_PRESETS.map((sizePreset) => (
                      <option key={sizePreset} value={sizePreset}>
                        {sizePreset}px
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label>
                  <span>Custom px</span>
                  <input
                    inputMode="numeric"
                    max={800}
                    min={128}
                    onBlur={() => setQrSize(clampCustomSize(customSize))}
                    onChange={(event) => setCustomSize(Number(event.currentTarget.value))}
                    type="number"
                    value={customSize}
                  />
                </label>
                <label>
                  <span>ECC</span>
                  <select
                    onChange={(event) =>
                      setErrorCorrectionLevel(
                        event.currentTarget.value as QRCodeErrorCorrectionLevel
                      )
                    }
                    value={errorCorrectionLevel}
                  >
                    {ERROR_CORRECTION_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          </aside>
        )}

        <section className="device-output" aria-label="Generated device frame">
          <div className="qr-panel">
            <QRCanvas
              encoded={frame.encoded}
              errorCorrectionLevel={errorCorrectionLevel}
              size={qrSize}
              videoMode={videoMode}
            />
            <div className="frame-details">
              <p className="monospace frame-string">{frame.encoded}</p>
              <dl className="frame-meta">
                <div>
                  <dt>Frame</dt>
                  <dd>{frame.seq}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>{frameLooksValid ? "QT1 H" : "invalid"}</dd>
                </div>
              </dl>
            </div>
          </div>

          {overlayMode ? null : (
            <section className="device-metrics" aria-label="Device metrics">
              <div className="metric-grid">
                <div>
                  <span className="metric-label">Commands</span>
                  <span className="metric-value">{device.stats.commandCount}</span>
                </div>
                <div>
                  <span className="metric-label">Haptics</span>
                  <span className="metric-value">{device.stats.hapticsCommandCount}</span>
                </div>
                <div>
                  <span className="metric-label">Unknown</span>
                  <span className="metric-value">{device.stats.unknownCommandCount}</span>
                </div>
                <div>
                  <span className="metric-label">Last haptic</span>
                  <span className="metric-value">
                    {formatElapsed(device.stats.lastHapticsAt, now)}
                  </span>
                </div>
                <div>
                  <span className="metric-label">Last command</span>
                  <span className="metric-value">{device.stats.lastCommand ?? "-"}</span>
                </div>
                <div>
                  <span className="metric-label">Last response</span>
                  <span className="metric-value">{device.stats.lastResponse ?? "-"}</span>
                </div>
              </div>

              <ChannelMeters
                isStale={!isConnected}
                isStopped={false}
                values={device.hapticsState.toArray()}
              />
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
