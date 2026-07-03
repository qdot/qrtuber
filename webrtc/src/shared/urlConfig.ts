import type { QRCodeErrorCorrectionLevel } from "qrcode";

import {
  DEFAULT_QR_DARK_COLOR,
  DEFAULT_QR_LIGHT_COLOR,
  normalizeHexColor
} from "./qrColors.js";

export const DEFAULT_QR_SIZE = 300;
export const MAX_QR_SIZE = 800;
export const MIN_QR_SIZE = 128;

const ERROR_CORRECTION_LEVELS = ["L", "M", "Q", "H"] as const;

export interface QrUrlConfig {
  readonly darkColor: string;
  readonly errorCorrectionLevel: QRCodeErrorCorrectionLevel;
  readonly lightColor: string;
  readonly overlayMode: boolean;
  readonly qrSize: number;
  readonly showDetails: boolean;
  readonly videoMode: boolean;
}

export interface DeviceUrlConfig {
  readonly autoConnect: boolean;
  readonly deviceAddress?: string;
  readonly deviceIdentifier?: string;
  readonly serverAddress?: string;
}

export function queryParams(search = window.location.search): URLSearchParams {
  return new URLSearchParams(search);
}

export function readQueryFlag(params: URLSearchParams, name: string): boolean {
  const value = params.get(name);
  if (value === null) {
    return false;
  }

  const normalized = value.toLowerCase();
  return (
    normalized === "" ||
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes"
  );
}

export function clampQrSize(value: number, fallback = DEFAULT_QR_SIZE): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, Math.round(value)));
}

export function readQrUrlConfig(params: URLSearchParams): QrUrlConfig {
  return {
    darkColor: readHexColorParam(
      params,
      ["dark", "foreground", "fg"],
      DEFAULT_QR_DARK_COLOR
    ),
    errorCorrectionLevel: readErrorCorrectionLevel(params),
    lightColor: readHexColorParam(
      params,
      ["light", "background", "bg"],
      DEFAULT_QR_LIGHT_COLOR
    ),
    overlayMode: readQueryFlag(params, "overlay"),
    qrSize: readQrSize(params),
    showDetails: readQueryFlag(params, "details"),
    videoMode: readQueryFlag(params, "video")
  };
}

export function readDeviceUrlConfig(params: URLSearchParams): DeviceUrlConfig {
  return {
    autoConnect: readQueryFlag(params, "connect"),
    deviceAddress: readOptionalParam(params, "device"),
    deviceIdentifier: readOptionalParam(params, "id"),
    serverAddress: readWebsocketUrlParam(params, "server")
  };
}

function readQrSize(params: URLSearchParams): number {
  const value = params.get("size") ?? params.get("qrSize");
  return clampQrSize(Number(value), DEFAULT_QR_SIZE);
}

function readErrorCorrectionLevel(params: URLSearchParams): QRCodeErrorCorrectionLevel {
  const value = (params.get("ecc") ?? params.get("ec") ?? "M").toUpperCase();
  return ERROR_CORRECTION_LEVELS.includes(value as (typeof ERROR_CORRECTION_LEVELS)[number])
    ? (value as QRCodeErrorCorrectionLevel)
    : "M";
}

function readHexColorParam(
  params: URLSearchParams,
  names: readonly string[],
  fallback: string
): string {
  for (const name of names) {
    const value = params.get(name);
    if (value !== null) {
      return normalizeHexColor(value, fallback);
    }
  }

  return fallback;
}

function readOptionalParam(params: URLSearchParams, name: string): string | undefined {
  const value = params.get(name)?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

function readWebsocketUrlParam(
  params: URLSearchParams,
  name: string
): string | undefined {
  const value = readOptionalParam(params, name);
  if (value === undefined) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "ws:" || url.protocol === "wss:" ? value : undefined;
  } catch {
    return undefined;
  }
}
