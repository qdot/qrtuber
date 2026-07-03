import { useMemo, useState } from "react";
import type { QRCodeErrorCorrectionLevel } from "qrcode";

import { ThemeControl } from "../shared/ThemeControl.js";
import {
  ChannelControls
} from "./ChannelControls.js";
import {
  ERROR_CORRECTION_LEVELS,
  QRCanvas,
  QR_SIZE_PRESETS
} from "./QRCanvas.js";
import {
  createDefaultChannels,
  type ChannelConfig
} from "./patterns.js";
import { RATE_OPTIONS, type RateHz, useFrameClock } from "./useFrameClock.js";

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

export function GeneratorApp() {
  const [channels, setChannels] = useState<ChannelConfig[]>(createDefaultChannels);
  const [qrSize, setQrSize] = useState(300);
  const [customSize, setCustomSize] = useState(300);
  const [errorCorrectionLevel, setErrorCorrectionLevel] =
    useState<QRCodeErrorCorrectionLevel>("M");
  const {
    frame,
    newSession,
    paused,
    rateHz,
    session,
    setPaused,
    setRateHz
  } = useFrameClock(channels);

  const overlayMode = useMemo(() => getQueryFlag("overlay"), []);
  const videoMode = useMemo(() => getQueryFlag("video"), []);
  const frameLooksValid = FRAME_REGEX.test(frame.encoded);

  function updateChannel(index: number, nextChannel: ChannelConfig) {
    setChannels((current) =>
      current.map((channel, channelIndex) =>
        channelIndex === index ? nextChannel : channel
      )
    );
  }

  function zeroChannels() {
    setChannels(
      Array.from({ length: channels.length }, () => ({
        value: 0,
        pattern: "off" as const
      }))
    );
  }

  return (
    <main className={`app-shell generator-shell${overlayMode ? " overlay-mode" : ""}`}>
      {overlayMode ? null : (
        <header className="top-bar">
          <h1>QRTuber Generator</h1>
          <nav className="top-nav" aria-label="Generator navigation">
            <a className="nav-link" href="/app/">
              Viewer
            </a>
            <a className="nav-link" href="/app/device/">
              Device
            </a>
            <ThemeControl />
          </nav>
        </header>
      )}

      <div className="generator-layout">
        {overlayMode ? null : (
          <aside className="generator-controls" aria-label="Generator controls">
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
                  <span>Rate</span>
                  <select
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      if (value === "paused") {
                        setPaused(true);
                        return;
                      }

                      setRateHz(Number(value) as RateHz);
                      setPaused(false);
                    }}
                    value={paused ? "paused" : String(rateHz)}
                  >
                    {RATE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} Hz
                      </option>
                    ))}
                    <option value="paused">Paused</option>
                  </select>
                </label>
              </div>
            </section>

            <ChannelControls
              channels={channels}
              currentValues={frame.values}
              onAllZero={zeroChannels}
              onChannelChange={updateChannel}
            />

            <section className="generator-section" aria-labelledby="qr-settings-title">
              <h2 id="qr-settings-title">QR</h2>
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

        <section className="qr-panel" aria-label="Generated frame">
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
        </section>
      </div>
    </main>
  );
}
