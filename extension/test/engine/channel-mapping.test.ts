import { describe, expect, it } from "vitest";
import { HapticsState } from "qrtuber";

import {
  resolveOutputs,
  resolveStateForAdapter,
} from "../../lib/engine/channel-mapping.js";
import type { DeviceInfo } from "../../utils/messages.js";
import { createDefaultChannelMap, type ChannelMap } from "../../utils/settings.js";

const devices: DeviceInfo[] = [
  {
    name: "Alpha",
    actuators: [
      { index: 0, type: "vibrate", name: "Left" },
      { index: 2, type: "vibrate", name: "Right" },
    ],
  },
  {
    name: "Beta",
    actuators: [{ index: 1, type: "vibrate", name: "Center" }],
  },
];

function mappedChannels(): ChannelMap {
  const map = createDefaultChannelMap();
  map[0] = { deviceName: "Alpha", actuatorIndex: 2, scale: 0.5 };
  map[1] = { deviceName: "Missing", actuatorIndex: 0, scale: 1 };
  map[2] = { deviceName: "Beta", actuatorIndex: 1, scale: 2 };
  return map;
}

describe("channel mapping", () => {
  it("maps simple mode channel zero to every resolved vibrator", () => {
    const state = new HapticsState([64, 128, 255]);

    expect(resolveOutputs(state, createDefaultChannelMap(), devices, "simple")).toEqual([
      { deviceName: "Alpha", actuatorIndex: 0, value: 64 },
      { deviceName: "Alpha", actuatorIndex: 2, value: 64 },
      { deviceName: "Beta", actuatorIndex: 1, value: 64 },
    ]);
    expect(
      resolveStateForAdapter(state, createDefaultChannelMap(), devices, "simple").toArray()
    ).toEqual([64, 64, 64, 64, 64, 64, 64, 64, 64]);
  });

  it("maps configured channels to adapter ordinals and drops unresolved targets", () => {
    const state = new HapticsState([100, 200, 180]);

    expect(resolveOutputs(state, mappedChannels(), devices, "mapped")).toEqual([
      { deviceName: "Alpha", actuatorIndex: 2, value: 50 },
      { deviceName: "Beta", actuatorIndex: 1, value: 255 },
    ]);
    expect(resolveStateForAdapter(state, mappedChannels(), devices, "mapped").toArray()).toEqual([
      0,
      50,
      255,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);
  });

  it("clamps non-finite and out-of-range scaled values", () => {
    const map = createDefaultChannelMap();
    map[0] = { deviceName: "Alpha", actuatorIndex: 0, scale: Number.NaN };
    map[1] = { deviceName: "Alpha", actuatorIndex: 2, scale: -1 };

    expect(resolveOutputs(new HapticsState([255, 255]), map, devices, "mapped")).toEqual([
      { deviceName: "Alpha", actuatorIndex: 0, value: 0 },
      { deviceName: "Alpha", actuatorIndex: 2, value: 0 },
    ]);
  });
});
