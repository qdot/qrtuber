import type { GamepadOutputInfo } from "./useGamepadHaptics.js";

interface GamepadPanelProps {
  error: string | null;
  gamepads: readonly GamepadOutputInfo[];
  isEnabled: boolean;
  isScanning: boolean;
  isSupported: boolean;
  onClearError: () => void;
  onDisable: () => void;
  onEnable: () => void;
  onRefreshGamepads: () => void;
  onScanGamepads: () => void;
  onSelectGamepad: (index: number | null) => void;
  onStopAll: () => void;
  onTestPulse: () => void;
  selectedIndex: number | null;
}

export function GamepadPanel({
  error,
  gamepads,
  isEnabled,
  isScanning,
  isSupported,
  onClearError,
  onDisable,
  onEnable,
  onRefreshGamepads,
  onScanGamepads,
  onSelectGamepad,
  onStopAll,
  onTestPulse,
  selectedIndex
}: GamepadPanelProps) {
  const hapticGamepadCount = gamepads.filter((gamepad) => gamepad.hasHaptics).length;
  const canEnable = isSupported && gamepads.some((gamepad) => gamepad.hasHaptics);

  return (
    <section className="gamepad-panel" aria-label="Gamepad output">
      <label className="gamepad-select-field">
        <span>Gamepad</span>
        <select
          disabled={!isSupported || isEnabled || gamepads.length === 0}
          onChange={(event) => {
            const value = event.currentTarget.value;
            onSelectGamepad(value === "" ? null : Number(value));
          }}
          value={selectedIndex ?? ""}
        >
          {gamepads.length === 0 ? (
            <option value="">No gamepads</option>
          ) : (
            gamepads.map((gamepad) => (
              <option
                disabled={!gamepad.hasHaptics}
                key={gamepad.index}
                value={gamepad.index}
              >
                {gamepad.id}
                {gamepad.hasHaptics ? "" : " (no haptics)"}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="gamepad-actions">
        {isEnabled ? (
          <button className="secondary-button" onClick={onDisable} type="button">
            Disable
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={!canEnable}
            onClick={onEnable}
            type="button"
          >
            Enable
          </button>
        )}
        <button
          className="secondary-button"
          disabled={!isSupported || isScanning}
          onClick={onScanGamepads}
          type="button"
        >
          {isScanning ? "Scanning" : "Scan"}
        </button>
        <button
          className="secondary-button"
          disabled={!isSupported || isScanning}
          onClick={onRefreshGamepads}
          type="button"
        >
          Refresh
        </button>
        <button
          className="secondary-button"
          disabled={!isEnabled}
          onClick={onTestPulse}
          type="button"
        >
          Test
        </button>
        <button
          className="secondary-button"
          disabled={!isEnabled}
          onClick={onStopAll}
          type="button"
        >
          Zero
        </button>
      </div>

      <div className="gamepad-status">
        <span className={isEnabled ? "status-value live" : "status-value"}>
          {isSupported
            ? isScanning
              ? "scanning"
              : isEnabled
                ? "enabled"
                : "disabled"
            : "unsupported"}
        </span>
        <span className="status-value">
          {hapticGamepadCount}/{gamepads.length} haptic
        </span>
      </div>

      {error !== null ? (
        <div className="gamepad-error">
          <span>{error}</span>
          <button className="secondary-button" onClick={onClearError} type="button">
            Clear
          </button>
        </div>
      ) : null}
    </section>
  );
}
