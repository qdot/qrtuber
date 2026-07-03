import { useCallback, useEffect, useRef, useState } from "react";

import {
  HapticsState,
  LOVENSE_WEBSOCKET_IDENTIFIER,
  createLovenseWebsocketHandshake,
  processLovenseWebsocketMessage,
  type LovenseWebsocketAction
} from "../shared/coreBridge.js";

const DEFAULT_ADDRESS = "ws://127.0.0.1:54817";
const DEVICE_ADDRESS_STORAGE_KEY = "qrtuber.webrtc.deviceAddress";
const DEVICE_IDENTIFIER_STORAGE_KEY = "qrtuber.webrtc.deviceIdentifier";
const SERVER_ADDRESS_STORAGE_KEY = "qrtuber.webrtc.deviceServerAddress";
const ZERO_STATE = new HapticsState();

export type DeviceConnectionState =
  | "connected"
  | "connecting"
  | "disconnected"
  | "disconnecting";

export interface DeviceProtocolStats {
  readonly commandCount: number;
  readonly hapticsCommandCount: number;
  readonly lastCommand: string | null;
  readonly lastHapticsAt: number | null;
  readonly lastResponse: string | null;
  readonly unknownCommandCount: number;
}

const INITIAL_STATS: DeviceProtocolStats = {
  commandCount: 0,
  hapticsCommandCount: 0,
  lastCommand: null,
  lastHapticsAt: null,
  lastResponse: null,
  unknownCommandCount: 0
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readStoredValue(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function storeValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function createDeviceAddress(): string {
  const random = new Uint8Array(6);
  crypto.getRandomValues(random);
  return Array.from(random, (value) => value.toString(16).toUpperCase().padStart(2, "0")).join("");
}

function readDeviceAddress(): string {
  const existingAddress = readStoredValue(DEVICE_ADDRESS_STORAGE_KEY, "");
  if (existingAddress.length > 0) {
    return existingAddress;
  }

  const nextAddress = createDeviceAddress();
  storeValue(DEVICE_ADDRESS_STORAGE_KEY, nextAddress);
  return nextAddress;
}

async function websocketDataToText(data: unknown): Promise<string> {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }

  if (data instanceof Blob) {
    return data.text();
  }

  return "";
}

export function useLovenseWebsocketDevice() {
  const websocketRef = useRef<WebSocket | null>(null);
  const operationIdRef = useRef(0);
  const hapticsStateRef = useRef(ZERO_STATE);
  const [address, setAddressState] = useState(() =>
    readStoredValue(SERVER_ADDRESS_STORAGE_KEY, DEFAULT_ADDRESS)
  );
  const [deviceAddress, setDeviceAddressState] = useState(readDeviceAddress);
  const [deviceIdentifier, setDeviceIdentifierState] = useState(() =>
    readStoredValue(DEVICE_IDENTIFIER_STORAGE_KEY, LOVENSE_WEBSOCKET_IDENTIFIER)
  );
  const [connectionState, setConnectionState] =
    useState<DeviceConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [frameUpdateId, setFrameUpdateId] = useState(0);
  const [hapticsState, setHapticsState] = useState(ZERO_STATE);
  const [stats, setStats] = useState<DeviceProtocolStats>(INITIAL_STATS);

  const applyHapticsState = useCallback((nextState: HapticsState) => {
    hapticsStateRef.current = nextState;
    setHapticsState(nextState);
  }, []);

  const disconnect = useCallback(() => {
    const websocket = websocketRef.current;
    operationIdRef.current += 1;
    websocketRef.current = null;

    if (websocket === null) {
      setConnectionState("disconnected");
      applyHapticsState(ZERO_STATE);
      return;
    }

    setConnectionState("disconnecting");
    websocket.close();
    setConnectionState("disconnected");
    applyHapticsState(ZERO_STATE);
  }, [applyHapticsState]);

  const connect = useCallback(() => {
    const operationId = (operationIdRef.current += 1);
    let websocket: WebSocket;
    try {
      websocket = new WebSocket(address);
    } catch (nextError) {
      setError(errorMessage(nextError));
      setConnectionState("disconnected");
      return;
    }

    websocket.binaryType = "arraybuffer";

    websocketRef.current?.close();
    websocketRef.current = websocket;
    setConnectionState("connecting");
    setError(null);
    setFrameUpdateId(0);
    setStats(INITIAL_STATS);
    applyHapticsState(ZERO_STATE);

    websocket.addEventListener("open", () => {
      if (operationIdRef.current !== operationId) {
        websocket.close();
        return;
      }

      websocket.send(
        JSON.stringify(createLovenseWebsocketHandshake(deviceAddress, deviceIdentifier))
      );
      setConnectionState("connected");
    });

    websocket.addEventListener("message", (event: MessageEvent) => {
      void websocketDataToText(event.data)
        .then((message) => {
          if (operationIdRef.current !== operationId || message.length === 0) {
            return;
          }

          const result = processLovenseWebsocketMessage(message, hapticsStateRef.current, {
            deviceAddress
          });

          for (const action of result.actions) {
            if (action.type === "respond") {
              websocket.send(action.payload);
            }
          }

          applyHapticsState(result.state);
          if (result.actions.some((action) => action.type === "haptics")) {
            setFrameUpdateId((current) => current + 1);
          }
          setStats((current) => reduceStats(current, result.actions));
        })
        .catch((nextError: unknown) => {
          if (operationIdRef.current === operationId) {
            setError(errorMessage(nextError));
          }
        });
    });

    websocket.addEventListener("error", () => {
      if (operationIdRef.current === operationId) {
        setError("Websocket connection failed");
      }
    });

    websocket.addEventListener("close", (event) => {
      if (operationIdRef.current !== operationId) {
        return;
      }

      websocketRef.current = null;
      setConnectionState("disconnected");
      applyHapticsState(ZERO_STATE);
      if (!event.wasClean && event.code !== 1000) {
        setError(`Websocket closed with code ${event.code}`);
      }
    });
  }, [address, applyHapticsState, deviceAddress, deviceIdentifier]);

  const setAddress = useCallback((nextAddress: string) => {
    setAddressState(nextAddress);
    storeValue(SERVER_ADDRESS_STORAGE_KEY, nextAddress);
  }, []);

  const resetAddress = useCallback(() => {
    setAddress(DEFAULT_ADDRESS);
  }, [setAddress]);

  const setDeviceAddress = useCallback((nextAddress: string) => {
    const normalized = nextAddress.trim().toUpperCase();
    setDeviceAddressState(normalized);
    storeValue(DEVICE_ADDRESS_STORAGE_KEY, normalized);
  }, []);

  const resetDeviceAddress = useCallback(() => {
    setDeviceAddress(createDeviceAddress());
  }, [setDeviceAddress]);

  const setDeviceIdentifier = useCallback((nextIdentifier: string) => {
    const normalized = nextIdentifier.trim();
    setDeviceIdentifierState(normalized);
    storeValue(DEVICE_IDENTIFIER_STORAGE_KEY, normalized);
  }, []);

  const resetDeviceIdentifier = useCallback(() => {
    setDeviceIdentifier(LOVENSE_WEBSOCKET_IDENTIFIER);
  }, [setDeviceIdentifier]);

  const zero = useCallback(() => {
    applyHapticsState(ZERO_STATE);
    setFrameUpdateId((current) => current + 1);
  }, [applyHapticsState]);

  useEffect(() => {
    return () => {
      operationIdRef.current += 1;
      websocketRef.current?.close();
      websocketRef.current = null;
    };
  }, []);

  return {
    address,
    clearError: () => setError(null),
    connect,
    connectionState,
    deviceAddress,
    deviceIdentifier,
    disconnect,
    error,
    frameUpdateId,
    hapticsState,
    resetAddress,
    resetDeviceAddress,
    resetDeviceIdentifier,
    setAddress,
    setDeviceAddress,
    setDeviceIdentifier,
    stats,
    zero
  };
}

function reduceStats(
  current: DeviceProtocolStats,
  actions: readonly LovenseWebsocketAction[]
): DeviceProtocolStats {
  if (actions.length === 0) {
    return current;
  }

  const hapticsActions = actions.filter((action) => action.type === "haptics");
  const responseActions = actions.filter((action) => action.type === "respond");
  const lastAction = actions[actions.length - 1];
  const lastResponse = responseActions[responseActions.length - 1];

  return {
    commandCount: current.commandCount + actions.length,
    hapticsCommandCount: current.hapticsCommandCount + hapticsActions.length,
    lastCommand: lastAction.command,
    lastHapticsAt:
      hapticsActions.length > 0 ? Date.now() : current.lastHapticsAt,
    lastResponse:
      lastResponse === undefined ? current.lastResponse : lastResponse.payload,
    unknownCommandCount:
      current.unknownCommandCount +
      actions.filter((action) => action.type === "unknown").length
  };
}
