import type { IntifaceConnectionState } from "./useIntiface.js";

interface IntifacePanelProps {
  address: string;
  connectionState: IntifaceConnectionState;
  deviceCount: number | null;
  error: string | null;
  onAddressChange: (address: string) => void;
  onClearError: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshDevices: () => void;
  onResetAddress: () => void;
  onStopAll: () => void;
}

export function IntifacePanel({
  address,
  connectionState,
  deviceCount,
  error,
  onAddressChange,
  onClearError,
  onConnect,
  onDisconnect,
  onRefreshDevices,
  onResetAddress,
  onStopAll
}: IntifacePanelProps) {
  const isConnected = connectionState === "connected";
  const isBusy = connectionState === "connecting" || connectionState === "disconnecting";

  return (
    <section className="intiface-panel" aria-label="Intiface output">
      <label className="intiface-address-field">
        <span>Intiface</span>
        <input
          disabled={isConnected || isBusy}
          onChange={(event) => onAddressChange(event.currentTarget.value)}
          spellCheck={false}
          type="url"
          value={address}
        />
      </label>

      <div className="intiface-actions">
        {isConnected ? (
          <button
            className="secondary-button"
            disabled={isBusy}
            onClick={onDisconnect}
            type="button"
          >
            Disconnect
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={isBusy}
            onClick={onConnect}
            type="button"
          >
            {connectionState === "connecting" ? "Connecting" : "Connect"}
          </button>
        )}
        <button
          className="secondary-button"
          disabled={!isConnected}
          onClick={onRefreshDevices}
          type="button"
        >
          Refresh
        </button>
        <button
          className="secondary-button"
          disabled={!isConnected}
          onClick={onStopAll}
          type="button"
        >
          Zero
        </button>
        <button
          className="secondary-button"
          disabled={isConnected || isBusy}
          onClick={onResetAddress}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="intiface-status">
        <span className={isConnected ? "status-value live" : "status-value"}>
          {connectionState}
        </span>
        <span className="status-value">
          {deviceCount === null ? "-" : `${deviceCount} device${deviceCount === 1 ? "" : "s"}`}
        </span>
      </div>

      {error !== null ? (
        <div className="intiface-error">
          <span>{error}</span>
          <button className="secondary-button" onClick={onClearError} type="button">
            Clear
          </button>
        </div>
      ) : null}
    </section>
  );
}
