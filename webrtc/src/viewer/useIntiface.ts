import { useCallback, useEffect, useRef, useState } from "react";

import {
  IntifaceHapticsAdapter,
  type HapticsState
} from "../shared/coreBridge.js";

const DEFAULT_ADDRESS = "ws://127.0.0.1:12345";
const FRAME_TIMEOUT_MS = 2000;
const STORAGE_KEY = "qrtuber.webrtc.intifaceAddress";

export type IntifaceConnectionState =
  | "connected"
  | "connecting"
  | "disconnected"
  | "disconnecting";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readStoredAddress(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ADDRESS;
  } catch {
    return DEFAULT_ADDRESS;
  }
}

function storeAddress(address: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, address);
  } catch {
    return;
  }
}

export function useIntiface() {
  const adapterRef = useRef<IntifaceHapticsAdapter | null>(null);
  const operationIdRef = useRef(0);
  const [address, setAddressState] = useState(readStoredAddress);
  const [connectionState, setConnectionState] =
    useState<IntifaceConnectionState>("disconnected");
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(() => {
    const adapter = adapterRef.current;
    if (adapter === null || !adapter.connected) {
      setDeviceCount(null);
      return;
    }

    setDeviceCount(adapter.getDevices().length);
  }, []);

  const stopAll = useCallback(async () => {
    const adapter = adapterRef.current;
    if (adapter === null) {
      return;
    }

    try {
      await adapter.stopAll();
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }, []);

  const disconnect = useCallback(async () => {
    const adapter = adapterRef.current;
    if (adapter === null) {
      setConnectionState("disconnected");
      setDeviceCount(null);
      return;
    }

    const operationId = (operationIdRef.current += 1);
    setConnectionState("disconnecting");
    setError(null);

    try {
      await adapter.stopAll();
      await adapter.disconnect();
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      if (operationIdRef.current === operationId) {
        adapterRef.current = null;
        setConnectionState("disconnected");
        setDeviceCount(null);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const operationId = (operationIdRef.current += 1);
    const adapter = new IntifaceHapticsAdapter({
      address,
      frameTimeoutMs: FRAME_TIMEOUT_MS
    });

    setConnectionState("connecting");
    setError(null);

    try {
      const previousAdapter = adapterRef.current;
      if (previousAdapter !== null) {
        await previousAdapter.stopAll();
        await previousAdapter.disconnect();
      }

      await adapter.connect();

      if (operationIdRef.current !== operationId) {
        await adapter.stopAll();
        await adapter.disconnect();
        return;
      }

      adapterRef.current = adapter;
      setConnectionState("connected");
      setDeviceCount(adapter.getDevices().length);
    } catch (nextError) {
      if (operationIdRef.current === operationId) {
        adapterRef.current = null;
        setConnectionState("disconnected");
        setDeviceCount(null);
        setError(errorMessage(nextError));
      }

      try {
        await adapter.disconnect();
      } catch {
        return;
      }
    }
  }, [address]);

  const applyState = useCallback(async (hapticsState: HapticsState) => {
    const adapter = adapterRef.current;
    if (adapter === null || !adapter.connected) {
      return;
    }

    try {
      await adapter.applyState(hapticsState);
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }, []);

  const setAddress = useCallback((nextAddress: string) => {
    setAddressState(nextAddress);
    storeAddress(nextAddress);
  }, []);

  const resetAddress = useCallback(() => {
    setAddress(DEFAULT_ADDRESS);
  }, [setAddress]);

  useEffect(() => {
    return () => {
      const adapter = adapterRef.current;
      adapterRef.current = null;
      if (adapter !== null) {
        void adapter.stopAll().finally(() => {
          void adapter.disconnect();
        });
      }
    };
  }, []);

  return {
    address,
    applyState,
    clearError: () => setError(null),
    connect,
    connectionState,
    deviceCount,
    disconnect,
    error,
    refreshDevices,
    resetAddress,
    setAddress,
    stopAll
  };
}
