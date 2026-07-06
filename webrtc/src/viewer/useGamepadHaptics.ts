import { useCallback, useEffect, useRef, useState } from "react";

import type { HapticsState } from "../shared/coreBridge.js";

const GAMEPAD_EFFECT_DURATION_MS = 500;
const GAMEPAD_SCAN_DURATION_MS = 10000;
const GAMEPAD_SCAN_INTERVAL_MS = 250;
const TEST_PULSE_DURATION_MS = 220;

export interface GamepadOutputInfo {
  readonly hasHaptics: boolean;
  readonly id: string;
  readonly index: number;
}

type MaybeHapticGamepad = Gamepad & {
  readonly vibrationActuator?: GamepadHapticActuator | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isGamepadApiSupported(): boolean {
  return typeof navigator.getGamepads === "function";
}

function actuatorForGamepad(gamepad: Gamepad | null): GamepadHapticActuator | null {
  const actuator = (gamepad as MaybeHapticGamepad | null)?.vibrationActuator;
  if (
    actuator === null ||
    actuator === undefined ||
    typeof actuator.playEffect !== "function" ||
    typeof actuator.reset !== "function"
  ) {
    return null;
  }

  return actuator;
}

function readConnectedGamepads(): Gamepad[] {
  if (!isGamepadApiSupported()) {
    return [];
  }

  try {
    return navigator.getGamepads().filter((gamepad): gamepad is Gamepad =>
      gamepad !== null && gamepad.connected
    );
  } catch {
    return [];
  }
}

function toGamepadInfo(gamepad: Gamepad): GamepadOutputInfo {
  return {
    hasHaptics: actuatorForGamepad(gamepad) !== null,
    id: gamepad.id.trim().length > 0 ? gamepad.id : `Gamepad ${gamepad.index}`,
    index: gamepad.index
  };
}

function selectedOrFirstIndex(
  currentIndex: number | null,
  gamepads: readonly GamepadOutputInfo[]
): number | null {
  if (currentIndex !== null && gamepads.some((gamepad) => gamepad.index === currentIndex)) {
    return currentIndex;
  }

  return gamepads.find((gamepad) => gamepad.hasHaptics)?.index ?? gamepads[0]?.index ?? null;
}

function dualRumbleFromState(state: HapticsState): {
  readonly strongMagnitude: number;
  readonly weakMagnitude: number;
} {
  const values = state.toArray();
  const normalized = values.map((value) => value / 255);

  return {
    weakMagnitude: Math.max(
      normalized[0] ?? 0,
      normalized[1] ?? 0,
      normalized[3] ?? 0,
      normalized[5] ?? 0,
      normalized[7] ?? 0
    ),
    strongMagnitude: Math.max(
      normalized[0] ?? 0,
      normalized[2] ?? 0,
      normalized[4] ?? 0,
      normalized[6] ?? 0,
      normalized[8] ?? 0
    )
  };
}

export function useGamepadHaptics() {
  const enabledRef = useRef(false);
  const scanIntervalRef = useRef<number | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);
  const selectedIndexRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gamepads, setGamepads] = useState<GamepadOutputInfo[]>([]);
  const [isEnabled, setIsEnabledState] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedIndex, setSelectedIndexState] = useState<number | null>(null);

  const isSupported = isGamepadApiSupported();

  const setEnabled = useCallback((nextEnabled: boolean) => {
    enabledRef.current = nextEnabled;
    setIsEnabledState(nextEnabled);
  }, []);

  const setSelectedIndex = useCallback((nextIndex: number | null) => {
    selectedIndexRef.current = nextIndex;
    setSelectedIndexState(nextIndex);
  }, []);

  const stopScan = useCallback(() => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (scanTimeoutRef.current !== null) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    setIsScanning(false);
  }, []);

  const refreshGamepads = useCallback(() => {
    if (!isGamepadApiSupported()) {
      setGamepads([]);
      setSelectedIndex(null);
      setEnabled(false);
      return [];
    }

    const nextGamepads = readConnectedGamepads().map(toGamepadInfo);
    const nextSelectedIndex = selectedOrFirstIndex(selectedIndexRef.current, nextGamepads);

    setGamepads(nextGamepads);
    setSelectedIndex(nextSelectedIndex);

    if (
      enabledRef.current &&
      nextGamepads.find((gamepad) => gamepad.index === nextSelectedIndex)?.hasHaptics !== true
    ) {
      setEnabled(false);
      setError("Selected gamepad is not available for haptics.");
    }

    return nextGamepads;
  }, [setEnabled, setSelectedIndex]);

  const scanGamepads = useCallback(() => {
    setError(null);

    if (!isGamepadApiSupported()) {
      setGamepads([]);
      setSelectedIndex(null);
      setEnabled(false);
      setError("Gamepad API is not available in this browser.");
      return;
    }

    const initialGamepads = refreshGamepads();
    if (initialGamepads.length > 0) {
      stopScan();
      return;
    }

    if (scanIntervalRef.current !== null) {
      return;
    }

    setIsScanning(true);
    scanIntervalRef.current = window.setInterval(() => {
      const nextGamepads = refreshGamepads();
      if (nextGamepads.length > 0) {
        stopScan();
      }
    }, GAMEPAD_SCAN_INTERVAL_MS);
    scanTimeoutRef.current = window.setTimeout(() => {
      stopScan();
      if (readConnectedGamepads().length === 0) {
        setError("No gamepad detected. Press a controller button and scan again.");
      }
    }, GAMEPAD_SCAN_DURATION_MS);
  }, [refreshGamepads, setEnabled, setSelectedIndex, stopScan]);

  const selectedGamepad = useCallback((): Gamepad | null => {
    const index = selectedIndexRef.current;
    if (index === null) {
      return null;
    }

    return readConnectedGamepads().find((gamepad) => gamepad.index === index) ?? null;
  }, []);

  const stopAll = useCallback(async () => {
    const actuator = actuatorForGamepad(selectedGamepad());
    if (actuator === null) {
      return;
    }

    try {
      await actuator.reset();
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }, [selectedGamepad]);

  const enable = useCallback(() => {
    setError(null);

    if (!isGamepadApiSupported()) {
      setEnabled(false);
      setError("Gamepad API is not available in this browser.");
      return;
    }

    const nextGamepads = refreshGamepads();
    const selectedInfo =
      nextGamepads.find((gamepad) => gamepad.index === selectedIndexRef.current) ??
      nextGamepads.find((gamepad) => gamepad.hasHaptics) ??
      null;

    if (selectedInfo === null) {
      setEnabled(false);
      scanGamepads();
      return;
    }

    setSelectedIndex(selectedInfo.index);

    if (!selectedInfo.hasHaptics) {
      setEnabled(false);
      setError("Selected gamepad does not expose haptics.");
      return;
    }

    setEnabled(true);
  }, [refreshGamepads, scanGamepads, setEnabled, setSelectedIndex]);

  const disable = useCallback(async () => {
    setEnabled(false);
    await stopAll();
  }, [setEnabled, stopAll]);

  const selectGamepad = useCallback((index: number | null) => {
    setSelectedIndex(index);
    setError(null);
  }, [setSelectedIndex]);

  const applyState = useCallback(async (state: HapticsState) => {
    if (!enabledRef.current) {
      return;
    }

    const actuator = actuatorForGamepad(selectedGamepad());
    if (actuator === null) {
      setEnabled(false);
      setError("Selected gamepad is not available for haptics.");
      refreshGamepads();
      return;
    }

    try {
      if (state.isAllZero()) {
        await actuator.reset();
        return;
      }

      const { strongMagnitude, weakMagnitude } = dualRumbleFromState(state);
      if (strongMagnitude === 0 && weakMagnitude === 0) {
        await actuator.reset();
        return;
      }

      await actuator.playEffect("dual-rumble", {
        duration: GAMEPAD_EFFECT_DURATION_MS,
        startDelay: 0,
        strongMagnitude,
        weakMagnitude
      });
    } catch (nextError) {
      setEnabled(false);
      setError(errorMessage(nextError));
    }
  }, [refreshGamepads, selectedGamepad, setEnabled]);

  const testPulse = useCallback(async () => {
    const actuator = actuatorForGamepad(selectedGamepad());
    if (actuator === null) {
      setError("Selected gamepad is not available for haptics.");
      scanGamepads();
      return;
    }

    try {
      await actuator.playEffect("dual-rumble", {
        duration: TEST_PULSE_DURATION_MS,
        startDelay: 0,
        strongMagnitude: 0.65,
        weakMagnitude: 0.4
      });
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }, [scanGamepads, selectedGamepad]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    refreshGamepads();

    const handleGamepadChange = () => {
      const nextGamepads = refreshGamepads();
      if (nextGamepads.length > 0) {
        stopScan();
      }
    };

    window.addEventListener("gamepadconnected", handleGamepadChange);
    window.addEventListener("gamepaddisconnected", handleGamepadChange);

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadChange);
      window.removeEventListener("gamepaddisconnected", handleGamepadChange);
    };
  }, [isSupported, refreshGamepads, stopScan]);

  useEffect(() => {
    return () => {
      enabledRef.current = false;
      stopScan();
      void stopAll();
    };
  }, [stopAll, stopScan]);

  return {
    applyState,
    clearError: () => setError(null),
    disable,
    enable,
    error,
    gamepads,
    isEnabled,
    isScanning,
    isSupported,
    refreshGamepads,
    scanGamepads,
    selectGamepad,
    selectedIndex,
    stopAll,
    testPulse
  };
}
