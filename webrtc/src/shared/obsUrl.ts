import type { QRCodeErrorCorrectionLevel } from "qrcode";

import { clampQrSize } from "./urlConfig.js";

interface GeneratorChannel {
  readonly pattern: string;
  readonly value: number;
}

export interface GeneratorObsUrlConfig {
  readonly channels: readonly GeneratorChannel[];
  readonly errorCorrectionLevel: QRCodeErrorCorrectionLevel;
  readonly paused: boolean;
  readonly qrSize: number;
  readonly rateHz: number;
}

export interface DeviceObsUrlConfig {
  readonly deviceAddress: string;
  readonly deviceIdentifier: string;
  readonly errorCorrectionLevel: QRCodeErrorCorrectionLevel;
  readonly qrSize: number;
  readonly serverAddress: string;
}

function createOverlayUrl(): URL {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.searchParams.set("overlay", "1");
  return url;
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

function setOptionalParam(params: URLSearchParams, name: string, value: string) {
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    params.set(name, trimmed);
  }
}

export function createGeneratorObsUrl({
  channels,
  errorCorrectionLevel,
  paused,
  qrSize,
  rateHz
}: GeneratorObsUrlConfig): string {
  const url = createOverlayUrl();
  url.searchParams.set("size", String(clampQrSize(qrSize)));
  url.searchParams.set("ecc", errorCorrectionLevel);
  url.searchParams.set("rate", paused ? "paused" : String(rateHz));

  channels.forEach((channel, index) => {
    const value = clampByte(channel.value);
    if (value === 0 && channel.pattern === "off") {
      return;
    }

    url.searchParams.set(`ch${index + 1}`, `${value}:${channel.pattern}`);
  });

  return url.toString();
}

export function createDeviceObsUrl({
  deviceAddress,
  deviceIdentifier,
  errorCorrectionLevel,
  qrSize,
  serverAddress
}: DeviceObsUrlConfig): string {
  const url = createOverlayUrl();
  url.searchParams.set("connect", "1");
  url.searchParams.set("size", String(clampQrSize(qrSize)));
  url.searchParams.set("ecc", errorCorrectionLevel);
  setOptionalParam(url.searchParams, "server", serverAddress);
  setOptionalParam(url.searchParams, "device", deviceAddress);
  setOptionalParam(url.searchParams, "id", deviceIdentifier);
  return url.toString();
}
