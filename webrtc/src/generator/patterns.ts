export const CHANNEL_COUNT = 9;

export const PATTERN_NAMES = ["constant", "sine", "pulse", "ramp", "off"] as const;

export type PatternName = (typeof PATTERN_NAMES)[number];

export interface ChannelConfig {
  value: number;
  pattern: PatternName;
}

type PatternSampler = (tMs: number, channel: ChannelConfig) => number;

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

function phaseForChannel(channelIndex: number): number {
  return (channelIndex % CHANNEL_COUNT) / CHANNEL_COUNT;
}

export const patternSamplers: Record<PatternName, PatternSampler> = {
  constant: (_tMs, channel) => clampByte(channel.value),
  sine: (tMs, channel) => {
    const wave = (Math.sin((tMs / 1000) * Math.PI * 2) + 1) / 2;
    return clampByte(wave * channel.value);
  },
  pulse: (tMs, channel) => {
    const periodMs = 1000;
    return tMs % periodMs < periodMs / 2 ? clampByte(channel.value) : 0;
  },
  ramp: (tMs, channel) => {
    const periodMs = 2000;
    return clampByte(((tMs % periodMs) / periodMs) * channel.value);
  },
  off: () => 0
};

export function samplePattern(tMs: number, channel: ChannelConfig, channelIndex: number): number {
  const sampler = patternSamplers[channel.pattern];

  if (channel.pattern === "sine") {
    const phase = phaseForChannel(channelIndex);
    const wave = (Math.sin((tMs / 1000 + phase) * Math.PI * 2) + 1) / 2;
    return clampByte(wave * channel.value);
  }

  return sampler(tMs, channel);
}

export function createDefaultChannels(): ChannelConfig[] {
  return Array.from({ length: CHANNEL_COUNT }, () => ({
    value: 0,
    pattern: "off" as const
  }));
}
