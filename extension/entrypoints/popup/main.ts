import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { ensureEngine, sendToEngine } from "../../utils/engine-client.js";
import { isStatusBroadcast, type ContentCommand } from "../../utils/messages.js";
import {
  createInitialStatus,
  isQRTuberStatus,
  type IntifaceConnectionState,
  type QRTuberStatus,
  type TrackingState,
} from "../../utils/status.js";
import "./style.css";

type CommandResponse = {
  readonly ok: boolean;
  readonly error?: string;
};

type ActiveTabState = {
  readonly tabId: number | null;
  readonly hasContentScript: boolean;
  readonly checking: boolean;
  readonly injecting: boolean;
  readonly error: string | null;
};

type RuntimeMessageListener = Parameters<
  typeof browser.runtime.onMessage.addListener
>[0];

const CONTENT_SCRIPT_FILE = "/content-scripts/content.js";
const AGE_GREEN_MS = 1000;
const AGE_AMBER_MS = 3000;
const h = React.createElement;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isCommandResponse(value: unknown): value is CommandResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { ok?: unknown }).ok === "boolean" &&
    ((value as { error?: unknown }).error === undefined ||
      typeof (value as { error?: unknown }).error === "string")
  );
}

async function sendContentCommand(
  tabId: number,
  command: ContentCommand
): Promise<CommandResponse> {
  const response = await browser.tabs.sendMessage(tabId, command);
  if (!isCommandResponse(response)) {
    throw new Error("Malformed content script response");
  }

  if (!response.ok) {
    throw new Error(response.error ?? "Content script command failed");
  }

  return response;
}

function formatTrackingState(state: TrackingState): string {
  switch (state) {
    case "idle":
      return "Idle";
    case "searching":
      return "Searching";
    case "tracking":
      return "Tracking";
    case "no-video":
      return "No video";
  }
}

function formatIntifaceState(state: IntifaceConnectionState): string {
  switch (state) {
    case "disconnected":
      return "Disconnected";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "disconnecting":
      return "Disconnecting";
    case "error":
      return "Error";
  }
}

function useEngineStatus(): {
  readonly status: QRTuberStatus;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<QRTuberStatus>(() => createInitialStatus());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await ensureEngine();
      const response = await sendToEngine({ type: "status/get" });
      if (!isQRTuberStatus(response)) {
        throw new Error("Malformed engine status response");
      }

      setStatus(response);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const listener: RuntimeMessageListener = (message) => {
      if (isStatusBroadcast(message)) {
        setStatus(message.status);
      }

      return undefined;
    };

    browser.runtime.onMessage.addListener(listener);
    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, [refresh]);

  return { status, loading, error, refresh };
}

function useActiveTab(): ActiveTabState & {
  readonly refresh: () => Promise<void>;
  readonly enableContentScript: () => Promise<void>;
} {
  const [state, setState] = useState<ActiveTabState>({
    tabId: null,
    hasContentScript: false,
    checking: true,
    injecting: false,
    error: null,
  });

  const pingTab = useCallback(async (tabId: number): Promise<boolean> => {
    try {
      await sendContentCommand(tabId, { type: "content/ping" });
      return true;
    } catch {
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, checking: true, error: null }));
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id ?? null;

    if (tabId === null) {
      setState({
        tabId: null,
        hasContentScript: false,
        checking: false,
        injecting: false,
        error: "No active tab",
      });
      return;
    }

    const hasContentScript = await pingTab(tabId);
    setState({
      tabId,
      hasContentScript,
      checking: false,
      injecting: false,
      error: null,
    });
  }, [pingTab]);

  const enableContentScript = useCallback(async () => {
    const tabId = state.tabId;
    if (tabId === null) {
      return;
    }

    setState((current) => ({ ...current, injecting: true, error: null }));
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [CONTENT_SCRIPT_FILE],
      });

      const hasContentScript = await pingTab(tabId);
      if (!hasContentScript) {
        throw new Error("Injected content script did not respond");
      }

      setState({
        tabId,
        hasContentScript: true,
        checking: false,
        injecting: false,
        error: null,
      });
    } catch (caught) {
      setState({
        tabId,
        hasContentScript: false,
        checking: false,
        injecting: false,
        error: errorMessage(caught),
      });
    }
  }, [pingTab, state.tabId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
    enableContentScript,
  };
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  readonly message: string | null;
  readonly onDismiss: () => void;
}): React.ReactElement | null {
  if (message === null) {
    return null;
  }

  return h(
    "section",
    { className: "error-banner", role: "alert" },
    h("span", null, message),
    h(
      "button",
      {
        type: "button",
        className: "icon-button",
        "aria-label": "Dismiss error",
        onClick: onDismiss,
      },
      "x"
    )
  );
}

function ConnectionCard({
  status,
  busy,
  onConnect,
  onDisconnect,
}: {
  readonly status: QRTuberStatus;
  readonly busy: boolean;
  readonly onConnect: () => void;
  readonly onDisconnect: () => void;
}): React.ReactElement {
  const state = status.intiface.state;
  const connected = state === "connected";
  const working = state === "connecting" || state === "disconnecting" || busy;

  return h(
    "section",
    { className: "panel" },
    h(
      "div",
      { className: "panel-header" },
      h(
        "div",
        null,
        h("h2", null, "Intiface"),
        h(
          "div",
          { className: "status-line" },
          h("span", { className: `status-dot status-${state}` }),
          h("span", null, formatIntifaceState(state))
        )
      ),
      h(
        "button",
        {
          type: "button",
          className: "icon-button",
          "aria-label": "Open options",
          title: "Open options",
          onClick: () => void browser.runtime.openOptionsPage(),
        },
        "⚙"
      )
    ),
    h(
      "dl",
      { className: "metrics" },
      h("div", null, h("dt", null, "Devices"), h("dd", null, status.intiface.deviceCount)),
      h(
        "div",
        null,
        h("dt", null, "Address"),
        h("dd", { className: "address" }, status.intiface.address)
      )
    ),
    h(
      "div",
      { className: "button-row" },
      h(
        "button",
        {
          type: "button",
          className: "primary-button",
          disabled: working || connected,
          onClick: onConnect,
        },
        "Connect"
      ),
      h(
        "button",
        {
          type: "button",
          disabled: working || state === "disconnected",
          onClick: onDisconnect,
        },
        "Disconnect"
      )
    )
  );
}

function DecodeIndicator({
  status,
  now,
}: {
  readonly status: QRTuberStatus;
  readonly now: number;
}): React.ReactElement {
  const lastDecode = status.tracking.lastDecode;
  if (lastDecode === null) {
    return h(
      "div",
      { className: "decode-indicator decode-none" },
      h("span", null, "No decode")
    );
  }

  const ageMs = Math.max(0, now - lastDecode.at);
  const ageClass =
    ageMs < AGE_GREEN_MS
      ? "decode-fresh"
      : ageMs < AGE_AMBER_MS
        ? "decode-warn"
        : "decode-stale";
  const ageLabel =
    ageMs >= AGE_AMBER_MS ? "stale" : `${(ageMs / 1000).toFixed(1)}s`;

  return h(
    "div",
    { className: `decode-indicator ${ageClass}` },
    h("span", null, `${lastDecode.session} / ${lastDecode.seq}`),
    h("strong", null, ageLabel)
  );
}

function TrackingCard({
  status,
  activeTab,
  busy,
  onStart,
  onStop,
  onSetHaptics,
}: {
  readonly status: QRTuberStatus;
  readonly activeTab: ActiveTabState & {
    readonly enableContentScript: () => Promise<void>;
  };
  readonly busy: boolean;
  readonly onStart: () => void;
  readonly onStop: () => void;
  readonly onSetHaptics: (enabled: boolean) => void;
}): React.ReactElement {
  const isTracking =
    status.tracking.state === "searching" || status.tracking.state === "tracking";
  const canSendToTab =
    activeTab.tabId !== null && activeTab.hasContentScript && !activeTab.checking;
  const canStopTracking =
    isTracking && (canSendToTab || status.tracking.tabId !== null);
  const trackingOtherTab =
    status.tracking.tabId !== null &&
    activeTab.tabId !== null &&
    status.tracking.tabId !== activeTab.tabId &&
    isTracking;

  return h(
    "section",
    { className: "panel" },
    h(
      "div",
      { className: "panel-header" },
      h(
        "div",
        null,
        h("h2", null, "Tracking"),
        h(
          "div",
          { className: "status-line" },
          h(
            "span",
            { className: `tracking-pill tracking-${status.tracking.state}` },
            formatTrackingState(status.tracking.state)
          ),
          trackingOtherTab
            ? h("span", { className: "muted" }, `tab ${status.tracking.tabId}`)
            : null
        )
      ),
      h(
        "label",
        { className: "switch", title: "Master haptics" },
        h("span", null, "Haptics"),
        h("input", {
          type: "checkbox",
          checked: status.hapticsEnabled,
          disabled: busy,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            onSetHaptics(event.currentTarget.checked),
        })
      )
    ),
    !activeTab.hasContentScript && !activeTab.checking
      ? h(
          "button",
          {
            type: "button",
            className: "enable-button",
            disabled: activeTab.injecting || activeTab.tabId === null,
            onClick: () => void activeTab.enableContentScript(),
          },
          activeTab.injecting ? "Enabling..." : "Enable on this page"
        )
      : null,
    h(
      "div",
      { className: "button-row" },
      h(
        "button",
        {
          type: "button",
          className: "primary-button",
          disabled: busy || !canSendToTab || isTracking,
          onClick: onStart,
        },
        "Start"
      ),
      h(
        "button",
        {
          type: "button",
          disabled: busy || !canStopTracking,
          onClick: onStop,
        },
        "Stop"
      )
    )
  );
}

function App(): React.ReactElement {
  const { status, loading, error: statusError, refresh } = useEngineStatus();
  const activeTab = useActiveTab();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dismissedBannerMessage, setDismissedBannerMessage] = useState<string | null>(
    null
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, []);

  const engineError = status.lastError ?? status.intiface.error;
  const rawBannerMessage = localError ?? activeTab.error ?? statusError ?? engineError;
  const bannerMessage =
    rawBannerMessage !== null && rawBannerMessage !== dismissedBannerMessage
      ? rawBannerMessage
      : null;

  const runAction = useCallback(
    async (label: string, action: () => Promise<unknown>) => {
      setBusyAction(label);
      setLocalError(null);
      setDismissedBannerMessage(null);
      try {
        await action();
        await refresh();
      } catch (caught) {
        setLocalError(errorMessage(caught));
      } finally {
        setBusyAction(null);
      }
    },
    [refresh]
  );

  const activeTabId = activeTab.tabId;
  const trackingTabId = status.tracking.tabId;
  const startTracking = useCallback(() => {
    if (activeTabId === null) {
      setLocalError("No active tab");
      return;
    }

    void runAction("start", () =>
      sendContentCommand(activeTabId, { type: "content/start" })
    );
  }, [activeTabId, runAction]);

  const stopTracking = useCallback(() => {
    const targetTabId = trackingTabId ?? activeTabId;
    if (targetTabId === null) {
      setLocalError("No active tab");
      return;
    }

    void runAction("stop", () =>
      sendContentCommand(targetTabId, { type: "content/stop" })
    );
  }, [activeTabId, runAction, trackingTabId]);

  const busy = loading || busyAction !== null;
  const busyLabel = useMemo(() => {
    if (loading) {
      return "Loading";
    }

    return busyAction === null ? null : `${busyAction}...`;
  }, [busyAction, loading]);

  return h(
    "main",
    { className: "popup-shell" },
    h(
      "header",
      { className: "app-header" },
      h("div", null, h("h1", null, "QRTuber"), h("p", null, busyLabel ?? "Ready")),
      h(
        "button",
        {
          type: "button",
          className: "icon-button",
          "aria-label": "Refresh status",
          title: "Refresh status",
          onClick: () => void refresh(),
        },
        "R"
      )
    ),
    h(ErrorBanner, {
      message: bannerMessage,
      onDismiss: () => {
        if (rawBannerMessage !== null) {
          setDismissedBannerMessage(rawBannerMessage);
        }
      },
    }),
    h(ConnectionCard, {
      status,
      busy,
      onConnect: () =>
        void runAction("connect", () => sendToEngine({ type: "intiface/connect" })),
      onDisconnect: () =>
        void runAction("disconnect", () =>
          sendToEngine({ type: "intiface/disconnect" })
        ),
    }),
    h(TrackingCard, {
      status,
      activeTab,
      busy,
      onStart: startTracking,
      onStop: stopTracking,
      onSetHaptics: (enabled: boolean) =>
        void runAction("haptics", () =>
          sendToEngine({ type: "haptics/set-enabled", enabled })
        ),
    }),
    h(DecodeIndicator, { status, now })
  );
}

createRoot(document.getElementById("app")!).render(
  h(React.StrictMode, null, h(App))
);
