export const DEFAULT_QR_DARK_COLOR = "#000000";
export const DEFAULT_QR_LIGHT_COLOR = "#ffffff";
export const MIN_QR_CONTRAST_RATIO = 4.5;

export interface QrColorConfig {
  readonly darkColor: string;
  readonly lightColor: string;
}

export interface QrContrastAssessment {
  readonly contrastRatio: number;
  readonly hasEnoughContrast: boolean;
  readonly hasExpectedPolarity: boolean;
  readonly messages: readonly string[];
}

interface RgbColor {
  readonly b: number;
  readonly g: number;
  readonly r: number;
}

const HEX_COLOR_REGEX = /^#?[0-9a-f]{6}$/i;
const SHORT_HEX_COLOR_REGEX = /^#?[0-9a-f]{3}$/i;

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  if (HEX_COLOR_REGEX.test(trimmed)) {
    return `#${trimmed.replace("#", "").toLowerCase()}`;
  }

  if (SHORT_HEX_COLOR_REGEX.test(trimmed)) {
    const shortHex = trimmed.replace("#", "").toLowerCase();
    return `#${shortHex.split("").map((digit) => `${digit}${digit}`).join("")}`;
  }

  return fallback;
}

export function colorParamValue(color: string, fallback: string): string {
  return normalizeHexColor(color, fallback).slice(1);
}

export function assessQrContrast({
  darkColor,
  lightColor
}: QrColorConfig): QrContrastAssessment {
  const normalizedDark = normalizeHexColor(darkColor, DEFAULT_QR_DARK_COLOR);
  const normalizedLight = normalizeHexColor(lightColor, DEFAULT_QR_LIGHT_COLOR);
  const darkLuminance = relativeLuminance(hexToRgb(normalizedDark));
  const lightLuminance = relativeLuminance(hexToRgb(normalizedLight));
  const contrastRatio = contrastRatioForLuminance(darkLuminance, lightLuminance);
  const hasEnoughContrast = contrastRatio >= MIN_QR_CONTRAST_RATIO;
  const hasExpectedPolarity = darkLuminance < lightLuminance;
  const messages: string[] = [];

  if (!hasExpectedPolarity) {
    messages.push("QR marks should be darker than the background.");
  }

  if (!hasEnoughContrast) {
    messages.push(
      `Contrast is ${contrastRatio.toFixed(1)}:1; use at least ${MIN_QR_CONTRAST_RATIO}:1.`
    );
  }

  return {
    contrastRatio,
    hasEnoughContrast,
    hasExpectedPolarity,
    messages
  };
}

function hexToRgb(color: string): RgbColor {
  const hex = normalizeHexColor(color, DEFAULT_QR_DARK_COLOR).slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function channelToLinear(value: number): number {
  const normalized = value / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }

  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ b, g, r }: RgbColor): number {
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

function contrastRatioForLuminance(first: number, second: number): number {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
