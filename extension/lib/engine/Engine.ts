import {
  HapticsState,
  IntifaceHapticsAdapter,
  type IntifaceDeviceInfo,
  parseFrame,
  QRCodeFinder,
} from "qrtuber";

import {
  isEngineRequest,
  type DeviceInfo,
  type EngineRequest,
  type FrameDecodeRequest,
  type FrameDecodeResponse,
} from "../../utils/messages.js";
import {
  broadcastSafe,
} from "../../utils/engine-client.js";
import {
  channelMap,
  decodeStaleTimeoutMs,
  intifaceAddress,
  mappingMode,
  type ChannelMap,
  type MappingMode,
} from "../../utils/settings.js";
import {
  createInitialStatus,
  type LastDecodeStatus,
  type QRTuberStatus,
  type TrackingState,
} from "../../utils/status.js";
import { resolveStateForAdapter } from "./channel-mapping.js";
import { DecodeGate } from "./decode-gate.js";

type RuntimeSender = Parameters<typeof browser.runtime.onMessage.addListener>[0] extends (
  message: unknown,
  sender: infer Sender,
  sendResponse: (...args: unknown[]) => void
) => unknown
  ? Sender
  : { tab?: { id?: number } };

type SendResponse = (response?: unknown) => void;

const ENGINE_REQUEST_TYPES = new Set([
  "frame/decode",
  "tracking/started",
  "tracking/stopped",
  "intiface/connect",
  "intiface/disconnect",
  "intiface/devices/get",
  "haptics/set-enabled",
  "status/get",
]);

const STATUS_BROADCAST_INTERVAL_MS = 250;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEngineRequestType(value: unknown): boolean {
  return isRecord(value) && ENGINE_REQUEST_TYPES.has(String(value.type));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class Engine {
  #status = createInitialStatus();
  #adapter = new IntifaceHapticsAdapter();
  #finder = new QRCodeFinder();
  #decodeGate = new DecodeGate();
  #devices: DeviceInfo[] = [];
  #initialisePromise: Promise<void> | null = null;
  #staleTimer: ReturnType<typeof setTimeout> | null = null;
  #staleTimeoutMs = decodeStaleTimeoutMs.fallback;
  #channelMap: ChannelMap = channelMap.fallback;
  #mappingMode: MappingMode = mappingMode.fallback;
  #statusBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
  #lastStatusBroadcastAt = 0;
  #outputStopped = true;

  handleRuntimeMessage(
    message: unknown,
    sender: RuntimeSender,
    sendResponse: SendResponse
  ): boolean {
    if (!isEngineRequestType(message)) {
      return false;
    }

    if (!isEngineRequest(message)) {
      this.#setError("Malformed engine request");
      sendResponse({ ok: false, error: this.#status.lastError });
      return true;
    }

    void this.#handleRequest(message, sender)
      .then((response) => sendResponse(response))
      .catch((error) => {
        const message = errorMessage(error);
        this.#setError(message);
        sendResponse({ ok: false, error: message });
      });

    return true;
  }

  getStatus(): QRTuberStatus {
    return this.#status;
  }

  async initialise(): Promise<void> {
    if (this.#initialisePromise !== null) {
      return this.#initialisePromise;
    }

    this.#initialisePromise = this.#initialise();
    return this.#initialisePromise;
  }

  async #initialise(): Promise<void> {
    const [address, staleTimeout, map, mode] = await Promise.all([
      intifaceAddress.getValue(),
      decodeStaleTimeoutMs.getValue(),
      channelMap.getValue(),
      mappingMode.getValue(),
    ]);

    this.#staleTimeoutMs = staleTimeout;
    this.#channelMap = map;
    this.#mappingMode = mode;
    this.#replaceAdapter(address);
    this.#setStatus({
      intiface: {
        ...this.#status.intiface,
        address,
      },
    });

    intifaceAddress.watch((newAddress) => {
      void this.#handleAddressChanged(newAddress).catch((error) => {
        this.#setError(errorMessage(error));
      });
    });
    decodeStaleTimeoutMs.watch((newTimeout) => {
      this.#staleTimeoutMs = newTimeout;
      this.#armStaleTimer(this.#status.tracking.lastDecode);
    });
    channelMap.watch((newMap) => {
      this.#channelMap = newMap;
    });
    mappingMode.watch((newMode) => {
      this.#mappingMode = newMode;
    });
  }

  async #handleRequest(request: EngineRequest, sender: RuntimeSender): Promise<unknown> {
    await this.initialise();

    try {
      switch (request.type) {
        case "frame/decode":
          return await this.#decodeFrame(request, sender);
        case "tracking/started":
          return this.#startTracking(sender);
        case "tracking/stopped":
          await this.#stopTracking(request.reason);
          return { ok: true };
        case "intiface/connect":
          await this.#connect();
          return { ok: true };
        case "intiface/disconnect":
          await this.#disconnect();
          return { ok: true };
        case "intiface/devices/get":
          this.#refreshDevices();
          return this.#devices;
        case "haptics/set-enabled":
          await this.#setHapticsEnabled(request.enabled);
          return { ok: true };
        case "status/get":
          return this.#status;
      }
    } catch (error) {
      const message = errorMessage(error);
      this.#setError(message);
      return { ok: false, error: message };
    }
  }

  async #decodeFrame(
    request: FrameDecodeRequest,
    sender: RuntimeSender
  ): Promise<FrameDecodeResponse> {
    if (!this.#isActiveTrackingSender(sender)) {
      return {
        found: false,
        error: "Tracking is already owned by another tab",
      };
    }

    const response = await fetch(request.dataUrl);
    const blob = await response.blob();
    const visualResult = await this.#finder.findQRCode(blob);

    if (visualResult === null) {
      this.#updateTrackingState(request.mode === "roi" ? "tracking" : "searching");
      return { found: false };
    }

    const frame = parseFrame(visualResult.payload);
    if (frame === null) {
      return {
        found: false,
        error: "QR payload is not a QRTuber frame",
      };
    }

    const accepted = this.#decodeGate.accept(frame);
    if (accepted !== null) {
      this.#refreshDevices();
      this.#setStatus({
        tracking: {
          ...this.#status.tracking,
          state: "tracking",
          lastDecode: accepted.lastDecode,
        },
        lastError: null,
      });
      this.#armStaleTimer(accepted.lastDecode);

      const mappedState = resolveStateForAdapter(
        accepted.frame.state,
        this.#channelMap,
        this.#devices,
        this.#mappingMode
      );

      if (this.#status.hapticsEnabled) {
        await this.#adapter.applyState(mappedState);
        this.#outputStopped = mappedState.isAllZero();
      } else if (!this.#outputStopped) {
        await this.#stopOutput();
      }
    }

    return {
      found: true,
      boundingBox: visualResult.boundingBox,
    };
  }

  #startTracking(sender: RuntimeSender): { ok: true } | { ok: false; error: string } {
    const tabId = sender.tab?.id ?? null;
    const currentTabId = this.#status.tracking.tabId;

    if (
      this.#status.tracking.state !== "idle" &&
      this.#status.tracking.state !== "no-video" &&
      (currentTabId === null || tabId === null || currentTabId !== tabId)
    ) {
      const error = "Tracking is already owned by another tab";
      this.#setError(error);
      return { ok: false, error };
    }

    this.#decodeGate.reset();
    this.#setStatus({
      tracking: {
        state: "searching",
        tabId,
        lastDecode: null,
      },
      lastError: null,
    });

    return { ok: true };
  }

  async #stopTracking(reason: "user" | "no-video" | "navigation"): Promise<void> {
    this.#clearStaleTimer();
    this.#decodeGate.reset();
    await this.#stopOutput();
    this.#setStatus({
      tracking: {
        state: reason === "no-video" ? "no-video" : "idle",
        tabId: null,
        lastDecode: null,
      },
    });
  }

  async #connect(): Promise<void> {
    if (this.#adapter.connected) {
      this.#setStatus({
        intiface: {
          ...this.#status.intiface,
          state: "connected",
          error: null,
        },
        lastError: null,
      });
      return;
    }

    this.#setStatus({
      intiface: {
        ...this.#status.intiface,
        state: "connecting",
        error: null,
      },
    });

    try {
      await this.#adapter.connect();
      this.#refreshDevices();
      this.#setStatus({
        intiface: {
          ...this.#status.intiface,
          state: "connected",
          deviceCount: this.#devices.length,
          error: null,
        },
        lastError: null,
      });

      if (!this.#status.hapticsEnabled) {
        await this.#stopOutput();
      }
    } catch (error) {
      const message = errorMessage(error);
      this.#setStatus({
        intiface: {
          ...this.#status.intiface,
          state: "error",
          error: message,
        },
        lastError: message,
      });
      throw error;
    }
  }

  async #disconnect(): Promise<void> {
    this.#setStatus({
      intiface: {
        ...this.#status.intiface,
        state: "disconnecting",
      },
    });

    await this.#stopOutput();
    await this.#adapter.disconnect();
    this.#devices = [];
    this.#setStatus({
      intiface: {
        ...this.#status.intiface,
        state: "disconnected",
        deviceCount: 0,
        error: null,
      },
      lastError: null,
    });
  }

  async #setHapticsEnabled(enabled: boolean): Promise<void> {
    if (!enabled) {
      await this.#stopOutput();
    }

    this.#setStatus({
      hapticsEnabled: enabled,
      lastError: null,
    });
  }

  async #handleAddressChanged(address: string): Promise<void> {
    const wasConnected = this.#adapter.connected;

    if (wasConnected) {
      await this.#disconnect();
    }

    this.#replaceAdapter(address);
    this.#setStatus({
      intiface: {
        ...this.#status.intiface,
        address,
      },
    });

    if (wasConnected) {
      await this.#connect();
    }
  }

  #replaceAdapter(address: string): void {
    this.#adapter = new IntifaceHapticsAdapter({ address });
  }

  #refreshDevices(): void {
    this.#devices = this.#adapter.getDevices().map((device: IntifaceDeviceInfo) => ({
      name: device.name,
      actuators: device.actuators.map((actuator) => ({
        index: actuator.index,
        type: actuator.type,
        name: actuator.name,
      })),
    }));
    this.#setStatus({
      intiface: {
        ...this.#status.intiface,
        deviceCount: this.#devices.length,
      },
    });
  }

  #isActiveTrackingSender(sender: RuntimeSender): boolean {
    const activeTabId = this.#status.tracking.tabId;
    if (activeTabId === null) {
      return true;
    }

    return sender.tab?.id === activeTabId;
  }

  #updateTrackingState(state: TrackingState): void {
    if (this.#status.tracking.state === state) {
      return;
    }

    this.#setStatus({
      tracking: {
        ...this.#status.tracking,
        state,
      },
    });
  }

  #armStaleTimer(lastDecode: LastDecodeStatus | null): void {
    this.#clearStaleTimer();

    if (lastDecode === null || this.#staleTimeoutMs <= 0) {
      return;
    }

    const dueInMs = Math.max(0, lastDecode.at + this.#staleTimeoutMs - Date.now());
    this.#staleTimer = setTimeout(() => {
      void this.#handleDecodeStale(lastDecode.at).catch((error) => {
        this.#setError(errorMessage(error));
      });
    }, dueInMs);
  }

  #clearStaleTimer(): void {
    if (this.#staleTimer === null) {
      return;
    }

    clearTimeout(this.#staleTimer);
    this.#staleTimer = null;
  }

  async #handleDecodeStale(expectedDecodeAt: number): Promise<void> {
    if (this.#status.tracking.lastDecode?.at !== expectedDecodeAt) {
      return;
    }

    await this.#stopOutput();
    this.#setStatus({
      tracking: {
        ...this.#status.tracking,
        state: "searching",
      },
    });
  }

  async #stopOutput(): Promise<void> {
    await this.#adapter.stopAll();
    this.#outputStopped = true;
  }

  #setError(message: string): void {
    this.#setStatus({
      lastError: message,
    });
  }

  #setStatus(patch: Partial<QRTuberStatus>): void {
    this.#status = {
      ...this.#status,
      ...patch,
      intiface: {
        ...this.#status.intiface,
        ...patch.intiface,
      },
      tracking: {
        ...this.#status.tracking,
        ...patch.tracking,
      },
    };
    this.#queueStatusBroadcast();
  }

  #queueStatusBroadcast(): void {
    const elapsedMs = Date.now() - this.#lastStatusBroadcastAt;
    if (elapsedMs >= STATUS_BROADCAST_INTERVAL_MS) {
      this.#broadcastStatus();
      return;
    }

    if (this.#statusBroadcastTimer !== null) {
      return;
    }

    this.#statusBroadcastTimer = setTimeout(() => {
      this.#statusBroadcastTimer = null;
      this.#broadcastStatus();
    }, STATUS_BROADCAST_INTERVAL_MS - elapsedMs);
  }

  #broadcastStatus(): void {
    this.#lastStatusBroadcastAt = Date.now();
    broadcastSafe({
      type: "status/update",
      status: this.#status,
    });
  }
}
