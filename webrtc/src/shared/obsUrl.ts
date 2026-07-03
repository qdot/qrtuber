import type { QRCodeErrorCorrectionLevel } from "qrcode";

import {
  colorParamValue,
  DEFAULT_QR_DARK_COLOR,
  DEFAULT_QR_LIGHT_COLOR
} from "./qrColors.js";
import { clampQrSize } from "./urlConfig.js";

interface GeneratorChannel {
  readonly pattern: string;
  readonly value: number;
}

export interface GeneratorObsUrlConfig {
  readonly channels: readonly GeneratorChannel[];
  readonly darkColor: string;
  readonly errorCorrectionLevel: QRCodeErrorCorrectionLevel;
  readonly lightColor: string;
  readonly paused: boolean;
  readonly qrSize: number;
  readonly rateHz: number;
}

export interface DeviceObsUrlConfig {
  readonly darkColor: string;
  readonly deviceAddress: string;
  readonly deviceIdentifier: string;
  readonly errorCorrectionLevel: QRCodeErrorCorrectionLevel;
  readonly lightColor: string;
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
  darkColor,
  errorCorrectionLevel,
  lightColor,
  paused,
  qrSize,
  rateHz
}: GeneratorObsUrlConfig): string {
  const url = createOverlayUrl();
  url.searchParams.set("size", String(clampQrSize(qrSize)));
  url.searchParams.set("ecc", errorCorrectionLevel);
  url.searchParams.set("dark", colorParamValue(darkColor, DEFAULT_QR_DARK_COLOR));
  url.searchParams.set("light", colorParamValue(lightColor, DEFAULT_QR_LIGHT_COLOR));
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
  darkColor,
  deviceAddress,
  deviceIdentifier,
  errorCorrectionLevel,
  lightColor,
  qrSize,
  serverAddress
}: DeviceObsUrlConfig): string {
  const url = createOverlayUrl();
  url.searchParams.set("connect", "1");
  url.searchParams.set("size", String(clampQrSize(qrSize)));
  url.searchParams.set("ecc", errorCorrectionLevel);
  url.searchParams.set("dark", colorParamValue(darkColor, DEFAULT_QR_DARK_COLOR));
  url.searchParams.set("light", colorParamValue(lightColor, DEFAULT_QR_LIGHT_COLOR));
  setOptionalParam(url.searchParams, "server", serverAddress);
  setOptionalParam(url.searchParams, "device", deviceAddress);
  setOptionalParam(url.searchParams, "id", deviceIdentifier);
  return url.toString();
}
