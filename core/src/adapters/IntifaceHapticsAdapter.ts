import {
  ButtplugBrowserWebsocketClientConnector,
  ButtplugClient,
  DeviceOutput,
  OutputType,
  type DeviceOutputCommand,
  type IButtplugClientConnector,
} from "buttplug";

import { HapticsState } from "../protocol/HapticsState.js";

const CHANNEL_COUNT = 9;
const DEFAULT_ADDRESS = "ws://127.0.0.1:12345";
const DEFAULT_CLIENT_NAME = "QRTuber";
const DEFAULT_FRAME_TIMEOUT_MS = 2000;

export type ChannelMap =
  | readonly (number | null | undefined)[]
  | ReadonlyMap<number, number>
  | Readonly<Record<number, number | null | undefined>>;

export interface IntifaceHapticsAdapterOptions {
  readonly address?: string;
  readonly clientName?: string;
  readonly channelMap?: ChannelMap;
  readonly frameTimeoutMs?: number;
}

export interface ButtplugFeatureLike {
  readonly descriptor?: string;
  readonly featureDescriptor?: string;
  readonly outputs: ReadonlyMap<OutputType, unknown>;
  runOutput(command: DeviceOutputCommand): Promise<void>;
}

export interface ButtplugDeviceLike {
  readonly name?: string;
  readonly displayName?: string;
  readonly features: ReadonlyMap<number, ButtplugFeatureLike>;
  stop?: () => Promise<void>;
}

export interface ButtplugClientLike {
  readonly connected: boolean;
  readonly devices: ReadonlyMap<number, ButtplugDeviceLike>;
  connect(connector: IButtplugClientConnector): Promise<void>;
  disconnect(): Promise<void>;
  stopAllDevices?: () => Promise<void>;
}

interface ResolvedOptions {
  readonly address: string;
  readonly clientName: string;
  readonly channelMap?: ChannelMap;
  readonly frameTimeoutMs: number;
}

export interface IntifaceActuatorInfo {
  readonly index: number;
  readonly type: "vibrate";
  readonly name?: string;
}

export interface IntifaceDeviceInfo {
  readonly name: string;
  readonly actuators: readonly IntifaceActuatorInfo[];
}

export class IntifaceHapticsAdapter {
  readonly #client: ButtplugClientLike;
  readonly #options: ResolvedOptions;
  #lastStateHex: string | undefined;
  #lastTopologySignature: string | undefined;
  #watchdog: ReturnType<typeof setTimeout> | undefined;

  constructor(options: IntifaceHapticsAdapterOptions = {}, client?: ButtplugClientLike) {
    this.#options = {
      address: options.address ?? DEFAULT_ADDRESS,
      clientName: options.clientName ?? DEFAULT_CLIENT_NAME,
      channelMap: options.channelMap,
      frameTimeoutMs: options.frameTimeoutMs ?? DEFAULT_FRAME_TIMEOUT_MS,
    };
    this.#client = client ?? new ButtplugClient(this.#options.clientName);
  }

  get connected(): boolean {
    return this.#client.connected;
  }

  async connect(): Promise<void> {
    await this.#client.connect(
      new ButtplugBrowserWebsocketClientConnector(this.#options.address)
    );
    this.#clearCachedState();
  }

  async disconnect(): Promise<void> {
    this.#clearWatchdog();
    this.#clearCachedState();
    if (!this.connected) {
      return;
    }

    await this.#client.disconnect();
  }

  async applyState(state: HapticsState): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.#armWatchdog();

    const stateHex = state.toHex();
    const topologySignature = this.#topologySignature();
    if (stateHex === this.#lastStateHex && topologySignature === this.#lastTopologySignature) {
      return;
    }

    this.#lastStateHex = stateHex;
    this.#lastTopologySignature = topologySignature;

    let actuatorOrdinal = 0;
    for (const device of this.#devices()) {
      let features: ButtplugFeatureLike[];
      try {
        features = this.#vibrateFeatures(device);
      } catch {
        continue;
      }

      if (features.length === 0) {
        continue;
      }

      for (const feature of features) {
        const channelIndex = this.#channelForActuator(actuatorOrdinal);
        actuatorOrdinal += 1;

        try {
          await feature.runOutput(DeviceOutput.Vibrate.percent(state.get(channelIndex) / 255));
        } catch {
          continue;
        }
      }
    }
  }

  async stopAll(): Promise<void> {
    this.#clearWatchdog();
    this.#clearCachedState();

    for (const device of this.#devices()) {
      let features: ButtplugFeatureLike[];
      try {
        features = this.#vibrateFeatures(device);
      } catch {
        continue;
      }

      for (const feature of features) {
        try {
          await feature.runOutput(DeviceOutput.Vibrate.percent(0));
        } catch {
          continue;
        }
      }
    }

    try {
      await this.#client.stopAllDevices?.();
    } catch {
      return;
    }
  }

  getDevices(): IntifaceDeviceInfo[] {
    return Array.from(this.#client.devices.entries())
      .sort(([left], [right]) => left - right)
      .map(([deviceIndex, device]) => {
        let actuators: IntifaceActuatorInfo[];
        try {
          actuators = Array.from(device.features.entries())
            .sort(([left], [right]) => left - right)
            .filter(([, feature]) => {
              try {
                return feature.outputs.has(OutputType.Vibrate);
              } catch {
                return false;
              }
            })
            .map(([featureIndex, feature]) => ({
              index: featureIndex,
              type: "vibrate" as const,
              name: feature.featureDescriptor ?? feature.descriptor,
            }));
        } catch {
          actuators = [];
        }

        return {
          name: device.displayName ?? device.name ?? `Device ${deviceIndex}`,
          actuators,
        };
      });
  }

  #devices(): ButtplugDeviceLike[] {
    return Array.from(this.#client.devices.entries())
      .sort(([left], [right]) => left - right)
      .map(([, device]) => device);
  }

  #vibrateFeatures(device: ButtplugDeviceLike): ButtplugFeatureLike[] {
    const features: ButtplugFeatureLike[] = [];

    for (const [, feature] of Array.from(device.features.entries()).sort(
      ([left], [right]) => left - right
    )) {
      try {
        if (feature.outputs.has(OutputType.Vibrate)) {
          features.push(feature);
        }
      } catch {
        continue;
      }
    }

    return features;
  }

  #channelForActuator(actuatorOrdinal: number): number {
    const mapped = this.#mappedChannel(actuatorOrdinal);
    if (mapped === undefined || mapped === null) {
      return actuatorOrdinal % CHANNEL_COUNT;
    }

    return Math.min(CHANNEL_COUNT - 1, Math.max(0, Math.trunc(mapped)));
  }

  #mappedChannel(actuatorOrdinal: number): number | null | undefined {
    const channelMap = this.#options.channelMap;
    if (channelMap === undefined) {
      return undefined;
    }

    if (channelMap instanceof Map) {
      return channelMap.get(actuatorOrdinal);
    }

    if (Array.isArray(channelMap)) {
      return channelMap[actuatorOrdinal];
    }

    return (channelMap as Readonly<Record<number, number | null | undefined>>)[actuatorOrdinal];
  }

  #topologySignature(): string {
    return Array.from(this.#client.devices.entries())
      .sort(([left], [right]) => left - right)
      .map(([deviceIndex, device]) => {
        try {
          const featureSignature = Array.from(device.features.entries())
            .sort(([left], [right]) => left - right)
            .map(([featureIndex, feature]) => {
              try {
                return `${featureIndex}:${feature.outputs.has(OutputType.Vibrate) ? "v" : "-"}`;
              } catch {
                return `${featureIndex}:error`;
              }
            })
            .join(",");

          return `${deviceIndex}[${featureSignature}]`;
        } catch {
          return `${deviceIndex}[error]`;
        }
      })
      .join("|");
  }

  #armWatchdog(): void {
    this.#clearWatchdog();
    if (this.#options.frameTimeoutMs <= 0) {
      return;
    }

    this.#watchdog = setTimeout(() => {
      void this.stopAll();
    }, this.#options.frameTimeoutMs);
  }

  #clearWatchdog(): void {
    if (this.#watchdog === undefined) {
      return;
    }

    clearTimeout(this.#watchdog);
    this.#watchdog = undefined;
  }

  #clearCachedState(): void {
    this.#lastStateHex = undefined;
    this.#lastTopologySignature = undefined;
  }
}
