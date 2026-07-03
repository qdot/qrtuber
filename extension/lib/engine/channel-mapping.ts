import { HapticsState } from "qrtuber";

import type { DeviceInfo } from "../../utils/messages.js";
import type { ChannelMap, MappingMode } from "../../utils/settings.js";
import { CHANNEL_COUNT } from "../../utils/settings.js";

interface IndexedActuator {
  readonly ordinal: number;
  readonly deviceName: string;
  readonly actuatorIndex: number;
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

function actuatorOrdinals(devices: readonly DeviceInfo[]): IndexedActuator[] {
  const actuators: IndexedActuator[] = [];

  for (const device of devices) {
    for (const actuator of device.actuators) {
      if (actuator.type !== "vibrate") {
        continue;
      }

      actuators.push({
        ordinal: actuators.length,
        deviceName: device.name,
        actuatorIndex: actuator.index,
      });
    }
  }

  return actuators;
}

export function resolveStateForAdapter(
  state: HapticsState,
  map: ChannelMap,
  devices: readonly DeviceInfo[],
  mode: MappingMode
): HapticsState {
  if (mode === "simple") {
    return new HapticsState(Array.from({ length: CHANNEL_COUNT }, () => state.get(0)));
  }

  const values = Array.from({ length: CHANNEL_COUNT }, () => 0);
  const actuators = actuatorOrdinals(devices);

  for (let channelIndex = 0; channelIndex < CHANNEL_COUNT; channelIndex += 1) {
    const target = map[channelIndex];
    if (target === null) {
      continue;
    }

    const actuator = actuators.find(
      (candidate) =>
        candidate.deviceName === target.deviceName &&
        candidate.actuatorIndex === target.actuatorIndex
    );
    if (actuator === undefined || actuator.ordinal >= CHANNEL_COUNT) {
      continue;
    }

    values[actuator.ordinal] = clampByte(state.get(channelIndex) * target.scale);
  }

  return new HapticsState(values);
}
