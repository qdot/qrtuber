import {
  ButtplugBrowserWebsocketClientConnector,
  OutputType,
  type DeviceOutputCommand,
  type IButtplugClientConnector,
} from "buttplug";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ButtplugClientLike,
  type ButtplugDeviceLike,
  type ButtplugFeatureLike,
  IntifaceHapticsAdapter,
} from "../../src/adapters/IntifaceHapticsAdapter.js";
import { HapticsState } from "../../src/protocol/HapticsState.js";

class FakeFeature implements ButtplugFeatureLike {
  readonly descriptor?: string;
  readonly featureDescriptor?: string;
  readonly outputs: ReadonlyMap<OutputType, unknown>;
  readonly commands: DeviceOutputCommand[] = [];
  rejectOutput = false;

  constructor(outputTypes: OutputType[] = [OutputType.Vibrate], name?: string) {
    this.outputs = new Map(outputTypes.map((type) => [type, {}]));
    this.featureDescriptor = name;
  }

  async runOutput(command: DeviceOutputCommand): Promise<void> {
    this.commands.push(command);
    if (this.rejectOutput) {
      throw new Error("feature failed");
    }
  }

  percents(): number[] {
    return this.commands.map((command) => command.percent ?? Number.NaN);
  }
}

class FakeDevice implements ButtplugDeviceLike {
  readonly name?: string;
  readonly features: ReadonlyMap<number, ButtplugFeatureLike>;

  constructor(features: ButtplugFeatureLike[], name?: string) {
    this.name = name;
    this.features = new Map(features.map((feature, index) => [index, feature]));
  }
}

class RejectingFeaturesDevice implements ButtplugDeviceLike {
  get features(): ReadonlyMap<number, ButtplugFeatureLike> {
    throw new Error("device failed");
  }
}

class FakeClient implements ButtplugClientLike {
  connected = true;
  devices: ReadonlyMap<number, ButtplugDeviceLike> = new Map();
  connector: IButtplugClientConnector | undefined;
  readonly stopAllDevices = vi.fn(async () => undefined);

  async connect(connector: IButtplugClientConnector): Promise<void> {
    this.connector = connector;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }
}

function haptics(values: number[]): HapticsState {
  return new HapticsState(values);
}

function connectorAddress(connector: IButtplugClientConnector | undefined): string | undefined {
  return (connector as unknown as { _url?: string } | undefined)?._url;
}

describe("IntifaceHapticsAdapter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses default address and accepts an address override when connecting", async () => {
    const defaultClient = new FakeClient();
    await new IntifaceHapticsAdapter(undefined, defaultClient).connect();

    expect(defaultClient.connector).toBeInstanceOf(ButtplugBrowserWebsocketClientConnector);
    expect(connectorAddress(defaultClient.connector)).toBe("ws://127.0.0.1:12345");

    const overrideClient = new FakeClient();
    await new IntifaceHapticsAdapter({ address: "ws://localhost:9999" }, overrideClient).connect();

    expect(overrideClient.connector).toBeInstanceOf(ButtplugBrowserWebsocketClientConnector);
    expect(connectorAddress(overrideClient.connector)).toBe("ws://localhost:9999");
  });

  it("maps multi-device actuator ordinals across channels sequentially", async () => {
    const first = new FakeFeature();
    const second = new FakeFeature();
    const third = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([
      [1, new FakeDevice([first])],
      [2, new FakeDevice([second, third])],
    ]);

    await new IntifaceHapticsAdapter({}, client).applyState(haptics([10, 20, 30]));

    expect(first.percents()[0]).toBeCloseTo(10 / 255);
    expect(second.percents()[0]).toBeCloseTo(20 / 255);
    expect(third.percents()[0]).toBeCloseTo(30 / 255);
  });

  it("wraps the tenth sequential actuator to channel zero", async () => {
    const features = Array.from({ length: 10 }, () => new FakeFeature());
    const client = new FakeClient();
    client.devices = new Map([[1, new FakeDevice(features)]]);

    await new IntifaceHapticsAdapter({}, client).applyState(
      haptics([255, 10, 20, 30, 40, 50, 60, 70, 80])
    );

    expect(features[0].percents()[0]).toBeCloseTo(1);
    expect(features[8].percents()[0]).toBeCloseTo(80 / 255);
    expect(features[9].percents()[0]).toBeCloseTo(1);
  });

  it("clamps custom channel map indexes and converts bytes to percents", async () => {
    const first = new FakeFeature();
    const second = new FakeFeature();
    const third = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([[1, new FakeDevice([first, second, third])]]);

    await new IntifaceHapticsAdapter({ channelMap: [-1, 12, 4] }, client).applyState(
      haptics([51, 0, 0, 0, 204, 0, 0, 0, 255])
    );

    expect(first.percents()[0]).toBeCloseTo(51 / 255);
    expect(second.percents()[0]).toBeCloseTo(1);
    expect(third.percents()[0]).toBeCloseTo(204 / 255);
  });

  it("does nothing when not connected", async () => {
    vi.useFakeTimers();
    const feature = new FakeFeature();
    const client = new FakeClient();
    client.connected = false;
    client.devices = new Map([[1, new FakeDevice([feature])]]);

    await new IntifaceHapticsAdapter({ frameTimeoutMs: 50 }, client).applyState(haptics([255]));
    await vi.advanceTimersByTimeAsync(50);

    expect(feature.commands).toHaveLength(0);
  });

  it("skips zero-actuator devices", async () => {
    const rotateOnly = new FakeFeature([OutputType.Rotate]);
    const vibrate = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([
      [1, new FakeDevice([rotateOnly])],
      [2, new FakeDevice([vibrate])],
    ]);

    await new IntifaceHapticsAdapter({}, client).applyState(haptics([128]));

    expect(rotateOnly.commands).toHaveLength(0);
    expect(vibrate.percents()[0]).toBeCloseTo(128 / 255);
  });

  it("returns a stable vibrate device snapshot for mapping UIs", () => {
    const rotateOnly = new FakeFeature([OutputType.Rotate], "Rotate");
    const firstVibrate = new FakeFeature([OutputType.Vibrate], "Left");
    const secondVibrate = new FakeFeature([OutputType.Vibrate], "Right");
    const client = new FakeClient();
    client.devices = new Map([
      [2, new FakeDevice([rotateOnly], "No Vibes")],
      [1, new FakeDevice([firstVibrate, secondVibrate], "Test Toy")],
      [3, new RejectingFeaturesDevice()],
    ]);

    expect(new IntifaceHapticsAdapter({}, client).getDevices()).toEqual([
      {
        name: "Test Toy",
        actuators: [
          { index: 0, type: "vibrate", name: "Left" },
          { index: 1, type: "vibrate", name: "Right" },
        ],
      },
      {
        name: "No Vibes",
        actuators: [],
      },
      {
        name: "Device 3",
        actuators: [],
      },
    ]);
  });

  it("deduplicates identical consecutive states", async () => {
    const feature = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([[1, new FakeDevice([feature])]]);
    const adapter = new IntifaceHapticsAdapter({}, client);

    await adapter.applyState(haptics([255]));
    await adapter.applyState(haptics([255]));

    expect(feature.percents()).toEqual([1]);
  });

  it("re-sends an identical state when device count changes", async () => {
    const first = new FakeFeature();
    const second = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([[1, new FakeDevice([first])]]);
    const adapter = new IntifaceHapticsAdapter({}, client);

    await adapter.applyState(haptics([255, 128]));
    client.devices = new Map([
      [1, new FakeDevice([first])],
      [2, new FakeDevice([second])],
    ]);
    await adapter.applyState(haptics([255, 128]));

    expect(first.percents()).toEqual([1, 1]);
    expect(second.percents()[0]).toBeCloseTo(128 / 255);
  });

  it("re-arms the watchdog and clears the cache after firing stopAll", async () => {
    vi.useFakeTimers();
    const feature = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([[1, new FakeDevice([feature])]]);
    const adapter = new IntifaceHapticsAdapter({ frameTimeoutMs: 100 }, client);

    await adapter.applyState(haptics([255]));
    await vi.advanceTimersByTimeAsync(99);
    await adapter.applyState(haptics([255]));
    await vi.advanceTimersByTimeAsync(99);
    expect(feature.percents()).toEqual([1]);

    await vi.advanceTimersByTimeAsync(1);
    expect(feature.percents()).toEqual([1, 0]);

    await adapter.applyState(haptics([255]));
    expect(feature.percents()).toEqual([1, 0, 1]);
  });

  it("disables the watchdog when timeout is zero", async () => {
    vi.useFakeTimers();
    const feature = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([[1, new FakeDevice([feature])]]);

    await new IntifaceHapticsAdapter({ frameTimeoutMs: 0 }, client).applyState(haptics([255]));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(feature.percents()).toEqual([1]);
  });

  it("continues when a device or feature rejects", async () => {
    const rejectingFeature = new FakeFeature();
    rejectingFeature.rejectOutput = true;
    const succeedingFeature = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([
      [1, new RejectingFeaturesDevice()],
      [2, new FakeDevice([rejectingFeature, succeedingFeature])],
    ]);

    await new IntifaceHapticsAdapter({}, client).applyState(haptics([255, 128]));

    expect(rejectingFeature.percents()).toEqual([1]);
    expect(succeedingFeature.percents()[0]).toBeCloseTo(128 / 255);
  });

  it("clears the watchdog on disconnect", async () => {
    vi.useFakeTimers();
    const feature = new FakeFeature();
    const client = new FakeClient();
    client.devices = new Map([[1, new FakeDevice([feature])]]);
    const adapter = new IntifaceHapticsAdapter({ frameTimeoutMs: 50 }, client);

    await adapter.applyState(haptics([255]));
    await adapter.disconnect();
    await vi.advanceTimersByTimeAsync(50);

    expect(feature.percents()).toEqual([1]);
    expect(adapter.connected).toBe(false);
  });
});
