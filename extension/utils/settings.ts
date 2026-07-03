import { storage } from "wxt/utils/storage";

export const DEFAULT_INTIFACE_ADDRESS = "ws://127.0.0.1:12345";
export const DEFAULT_DECODE_STALE_TIMEOUT_MS = 1500;
export const CHANNEL_COUNT = 9;

export type MappingMode = "simple" | "mapped";

export interface ChannelMapping {
  readonly deviceName: string;
  readonly actuatorIndex: number;
  readonly scale: number;
}

export type ChannelMap = [
  ChannelMapping | null,
  ChannelMapping | null,
  ChannelMapping | null,
  ChannelMapping | null,
  ChannelMapping | null,
  ChannelMapping | null,
  ChannelMapping | null,
  ChannelMapping | null,
  ChannelMapping | null,
];

export function createDefaultChannelMap(): ChannelMap {
  return [null, null, null, null, null, null, null, null, null];
}

export const intifaceAddress = storage.defineItem<string>("local:intifaceAddress", {
  fallback: DEFAULT_INTIFACE_ADDRESS,
});

export const autoConnect = storage.defineItem<boolean>("local:autoConnect", {
  fallback: true,
});

export const hapticsEnabled = storage.defineItem<boolean>("local:hapticsEnabled", {
  fallback: true,
});

export const mappingMode = storage.defineItem<MappingMode>("local:mappingMode", {
  fallback: "simple",
});

export const channelMap = storage.defineItem<ChannelMap>("local:channelMap", {
  fallback: createDefaultChannelMap(),
});

export const decodeStaleTimeoutMs = storage.defineItem<number>(
  "local:decodeStaleTimeoutMs",
  {
    fallback: DEFAULT_DECODE_STALE_TIMEOUT_MS,
  }
);
