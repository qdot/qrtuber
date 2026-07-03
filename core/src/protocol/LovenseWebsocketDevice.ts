import { HapticsState } from "./HapticsState.js";

export const LOVENSE_WEBSOCKET_IDENTIFIER = "qrtuber-lovense";
export const LOVENSE_HUSH_IDENTIFIER = "Z";
export const LOVENSE_WEBSOCKET_VERSION = 0;

const DEFAULT_BATTERY_LEVEL = 90;
const DEFAULT_FIRMWARE_VERSION = 10;
const LOVENSE_MAX_SPEED = 20;

export interface LovenseWebsocketHandshake {
  readonly identifier: string;
  readonly address: string;
  readonly version: number;
}

export interface LovenseWebsocketProtocolOptions {
  readonly batteryLevel?: number;
  readonly deviceAddress: string;
  readonly firmwareVersion?: number;
  readonly modelIdentifier?: string;
}

export type LovenseWebsocketAction =
  | {
      readonly command: string;
      readonly payload: string;
      readonly type: "respond";
    }
  | {
      readonly channelIndex: number;
      readonly command: string;
      readonly speed: number;
      readonly state: HapticsState;
      readonly type: "haptics";
    }
  | {
      readonly command: string;
      readonly type: "unknown";
    };

export interface LovenseWebsocketMessageResult {
  readonly actions: readonly LovenseWebsocketAction[];
  readonly state: HapticsState;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function speedToByte(speed: number): number {
  return clampInteger((clampInteger(speed, 0, LOVENSE_MAX_SPEED) / LOVENSE_MAX_SPEED) * 255, 0, 255);
}

function hapticsWithChannel(currentState: HapticsState, channelIndex: number, value: number): HapticsState {
  const nextValues = currentState.toArray();
  if (channelIndex >= 0 && channelIndex < nextValues.length) {
    nextValues[channelIndex] = value;
  }

  return new HapticsState(nextValues);
}

function splitCommands(message: string): string[] {
  const commands = message.match(/[^;]+;/g) ?? [];
  const consumed = commands.join("");
  const remainder = message.slice(consumed.length).trim();

  if (remainder.length > 0) {
    return [...commands, remainder];
  }

  return commands;
}

export function createLovenseWebsocketHandshake(
  address: string,
  identifier = LOVENSE_WEBSOCKET_IDENTIFIER
): LovenseWebsocketHandshake {
  return {
    identifier,
    address,
    version: LOVENSE_WEBSOCKET_VERSION
  };
}

export function createLovenseDeviceTypeResponse({
  deviceAddress,
  firmwareVersion = DEFAULT_FIRMWARE_VERSION,
  modelIdentifier = LOVENSE_HUSH_IDENTIFIER
}: LovenseWebsocketProtocolOptions): string {
  return `${modelIdentifier}:${deviceAddress}:${clampInteger(firmwareVersion, 0, 9999)}`;
}

export function processLovenseWebsocketMessage(
  message: string,
  currentState: HapticsState,
  options: LovenseWebsocketProtocolOptions
): LovenseWebsocketMessageResult {
  let nextState = currentState;
  const actions: LovenseWebsocketAction[] = [];

  for (const command of splitCommands(message)) {
    if (command === "DeviceType;") {
      actions.push({
        command,
        payload: createLovenseDeviceTypeResponse(options),
        type: "respond"
      });
      continue;
    }

    if (command === "Battery;") {
      actions.push({
        command,
        payload: `${clampInteger(options.batteryLevel ?? DEFAULT_BATTERY_LEVEL, 0, 100)};`,
        type: "respond"
      });
      continue;
    }

    const vibrateMatch = /^Vibrate(?<index>[1-9][0-9]*)?:(?<speed>[0-9]+);$/.exec(command);
    if (vibrateMatch?.groups !== undefined) {
      const speed = clampInteger(Number(vibrateMatch.groups.speed), 0, LOVENSE_MAX_SPEED);
      const channelIndex =
        vibrateMatch.groups.index === undefined ? 0 : Number(vibrateMatch.groups.index) - 1;
      nextState = hapticsWithChannel(nextState, channelIndex, speedToByte(speed));
      actions.push({
        channelIndex,
        command,
        speed,
        state: nextState,
        type: "haptics"
      });
      continue;
    }

    actions.push({
      command,
      type: "unknown"
    });
  }

  return {
    actions,
    state: nextState
  };
}
