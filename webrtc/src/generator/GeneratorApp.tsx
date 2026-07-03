import { useMemo, useState } from "react";
import type { QRCodeErrorCorrectionLevel } from "qrcode";

import { CopyObsUrlButton } from "../shared/CopyObsUrlButton.js";
import { createGeneratorObsUrl } from "../shared/obsUrl.js";
import { QrColorControls } from "../shared/QrColorControls.js";
import { ThemeControl } from "../shared/ThemeControl.js";
import {
  clampQrSize,
  queryParams,
  readQrUrlConfig,
  readQueryFlag
} from "../shared/urlConfig.js";
import {
  ChannelControls
} from "./ChannelControls.js";
import {
  ERROR_CORRECTION_LEVELS,
  QRCanvas,
  QR_SIZE_PRESETS
} from "./QRCanvas.js";
import {
  CHANNEL_COUNT,
  createDefaultChannels,
  PATTERN_NAMES,
  type ChannelConfig,
  type PatternName
} from "./patterns.js";
import { RATE_OPTIONS, type RateHz, useFrameClock } from "./useFrameClock.js";

const FRAME_REGEX = /^QT1:[0-9A-F]{4}:\d+:H:[0-9A-F]{18}$/;

interface GeneratorUrlConfig {
  readonly channels: ChannelConfig[];
  readonly paused: boolean;
  readonly rateHz: RateHz;
}

function clampCustomSize(value: number): number {
  return clampQrSize(value);
}

export function GeneratorApp() {
  const urlConfig = useMemo(() => {
    const params = queryParams();
    return {
      generator: readGeneratorUrlConfig(params),
      qr: readQrUrlConfig(params)
    };
  }, []);
  const [channels, setChannels] = useState<ChannelConfig[]>(urlConfig.generator.channels);
  const [qrSize, setQrSize] = useState(urlConfig.qr.qrSize);
  const [customSize, setCustomSize] = useState(urlConfig.qr.qrSize);
  const [darkColor, setDarkColor] = useState(urlConfig.qr.darkColor);
  const [lightColor, setLightColor] = useState(urlConfig.qr.lightColor);
  const [errorCorrectionLevel, setErrorCorrectionLevel] =
    useState<QRCodeErrorCorrectionLevel>(urlConfig.qr.errorCorrectionLevel);
  const {
    frame,
    newSession,
    paused,
    rateHz,
    session,
    setPaused,
    setRateHz
  } = useFrameClock(channels, {
    initialPaused: urlConfig.generator.paused,
    initialRateHz: urlConfig.generator.rateHz
  });

  const overlayMode = urlConfig.qr.overlayMode;
  const showFrameDetails = !overlayMode || urlConfig.qr.showDetails;
  const videoMode = urlConfig.qr.videoMode;
  const frameLooksValid = FRAME_REGEX.test(frame.encoded);
  const obsUrl = useMemo(
    () =>
      createGeneratorObsUrl({
        channels,
        darkColor,
        errorCorrectionLevel,
        lightColor,
        paused,
        qrSize,
        rateHz
      }),
    [channels, darkColor, errorCorrectionLevel, lightColor, paused, qrSize, rateHz]
  );

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
              <div className="section-heading">
                <h2 id="qr-settings-title">QR</h2>
                <CopyObsUrlButton url={obsUrl} />
              </div>
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
                <QrColorControls
                  darkColor={darkColor}
                  lightColor={lightColor}
                  onDarkColorChange={setDarkColor}
                  onLightColorChange={setLightColor}
                />
              </div>
            </section>
          </aside>
        )}

        <section className="qr-panel" aria-label="Generated frame">
          <QRCanvas
            darkColor={darkColor}
            encoded={frame.encoded}
            errorCorrectionLevel={errorCorrectionLevel}
            lightColor={lightColor}
            size={qrSize}
            videoMode={videoMode}
          />
          {showFrameDetails ? (
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
          ) : null}
        </section>
      </div>
    </main>
  );
}

function readGeneratorUrlConfig(params: URLSearchParams): GeneratorUrlConfig {
  return {
    channels: readGeneratorChannels(params),
    paused:
      readQueryFlag(params, "paused") || params.get("rate")?.toLowerCase() === "paused",
    rateHz: readGeneratorRate(params)
  };
}

function readGeneratorRate(params: URLSearchParams): RateHz {
  const rate = Number(params.get("rate"));
  return RATE_OPTIONS.includes(rate as RateHz) ? (rate as RateHz) : 3;
}

function readGeneratorChannels(params: URLSearchParams): ChannelConfig[] {
  const channels = createDefaultChannels();

  for (let index = 0; index < CHANNEL_COUNT; index += 1) {
    const channel = readGeneratorChannel(params, index);
    if (channel !== null) {
      channels[index] = channel;
    }
  }

  return channels;
}

function readGeneratorChannel(
  params: URLSearchParams,
  index: number
): ChannelConfig | null {
  const value = params.get(`ch${index + 1}`) ?? params.get(`channel${index + 1}`);
  if (value === null || value.trim().length === 0) {
    return null;
  }

  const parts = value.split(":").map((part) => part.trim()).filter(Boolean);
  const numericPart = parts.find((part) => Number.isFinite(Number(part)));
  const patternPart = parts.map((part) => part.toLowerCase()).find(isPatternName);
  const numericValue = Number(numericPart);
  const byteValue = Number.isFinite(numericValue)
    ? Math.min(255, Math.max(0, Math.round(numericValue)))
    : patternPart === undefined || patternPart === "off"
      ? 0
      : 255;

  return {
    value: byteValue,
    pattern: patternPart ?? (byteValue === 0 ? "off" : "constant")
  };
}

function isPatternName(value: string): value is PatternName {
  return PATTERN_NAMES.includes(value as PatternName);
}
