import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import "./style.css";
import { sendToEngine } from "../../utils/engine-client.js";
import type { DeviceInfo } from "../../utils/messages.js";
import {
  CHANNEL_COUNT,
  autoConnect,
  channelMap,
  createDefaultChannelMap,
  decodeStaleTimeoutMs,
  intifaceAddress,
  mappingMode,
  type ChannelMap,
  type ChannelMapping,
  type MappingMode,
} from "../../utils/settings.js";

const ADDRESS_PATTERN = /^wss?:\/\//;
const h = React.createElement;

type DeviceLoadState = "idle" | "loading" | "ready" | "unavailable";

interface AddressSettings {
  readonly address: string;
  readonly autoConnect: boolean;
  readonly staleTimeoutMs: number;
}

function clampScale(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
}

function normaliseChannelMap(value: ChannelMap): ChannelMap {
  const defaults = createDefaultChannelMap();

  for (let index = 0; index < CHANNEL_COUNT; index += 1) {
    const mapping = value[index];
    defaults[index] =
      mapping === null
        ? null
        : {
            deviceName: mapping.deviceName,
            actuatorIndex: mapping.actuatorIndex,
            scale: clampScale(mapping.scale),
          };
  }

  return defaults;
}

function statusText(state: DeviceLoadState, devices: readonly DeviceInfo[]): string {
  if (state === "loading") {
    return "Refreshing devices...";
  }

  if (state === "unavailable") {
    return "Needs Intiface connection";
  }

  if (devices.length === 0) {
    return "No devices resolved";
  }

  return `${devices.length} device${devices.length === 1 ? "" : "s"} resolved`;
}

function findDevice(
  devices: readonly DeviceInfo[],
  deviceName: string
): DeviceInfo | undefined {
  return devices.find((device) => device.name === deviceName);
}

function mappingIsResolved(
  mapping: ChannelMapping | null,
  devices: readonly DeviceInfo[]
): boolean {
  if (mapping === null) {
    return true;
  }

  return (
    findDevice(devices, mapping.deviceName)?.actuators.some(
      (actuator) => actuator.index === mapping.actuatorIndex
    ) ?? false
  );
}

function replaceChannelMapping(
  map: ChannelMap,
  channelIndex: number,
  mapping: ChannelMapping | null
): ChannelMap {
  const next = [...map] as ChannelMap;
  next[channelIndex] = mapping;
  return next;
}

function AddressForm(): React.ReactElement {
  const [settings, setSettings] = useState<AddressSettings>({
    address: "",
    autoConnect: true,
    staleTimeoutMs: 1500,
  });
  const [loadState, setLoadState] = useState<"loading" | "ready">("loading");
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      intifaceAddress.getValue(),
      autoConnect.getValue(),
      decodeStaleTimeoutMs.getValue(),
    ])
      .then(([address, connectOnStart, staleTimeoutMs]) => {
        if (cancelled) {
          return;
        }

        setSettings({
          address,
          autoConnect: connectOnStart,
          staleTimeoutMs,
        });
        setLoadState("ready");
      })
      .catch((caught) => {
        if (cancelled) {
          return;
        }

        setError(caught instanceof Error ? caught.message : String(caught));
        setLoadState("ready");
        setSaveState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addressValid = ADDRESS_PATTERN.test(settings.address.trim());
  const staleTimeoutValid =
    Number.isSafeInteger(settings.staleTimeoutMs) && settings.staleTimeoutMs >= 0;

  async function saveSettings(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaveState("idle");

    if (!addressValid) {
      setError("Address must start with ws:// or wss://");
      setSaveState("error");
      return;
    }

    if (!staleTimeoutValid) {
      setError("Decode stale timeout must be a non-negative integer");
      setSaveState("error");
      return;
    }

    try {
      await Promise.all([
        intifaceAddress.setValue(settings.address.trim()),
        autoConnect.setValue(settings.autoConnect),
        decodeStaleTimeoutMs.setValue(settings.staleTimeoutMs),
      ]);
      setError(null);
      setSaveState("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaveState("error");
    }
  }

  return h(
    "section",
    { className: "panel", "aria-labelledby": "intiface-heading" },
    h(
      "div",
      { className: "panel-header" },
      h("h2", { id: "intiface-heading" }, "Intiface"),
      h("span", { className: `status-pill ${saveState}` }, loadState)
    ),
    h(
      "form",
      {
        className: "settings-grid",
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => void saveSettings(event),
      },
      h(
        "label",
        { className: "field span-2" },
        h("span", null, "Address"),
        h("input", {
          "aria-invalid": !addressValid,
          disabled: loadState === "loading",
          inputMode: "url",
          type: "text",
          value: settings.address,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            setSettings((current) => ({
              ...current,
              address: event.target.value,
            }));
            setSaveState("idle");
          },
        })
      ),
      h(
        "label",
        { className: "field checkbox-field" },
        h("input", {
          checked: settings.autoConnect,
          disabled: loadState === "loading",
          type: "checkbox",
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            setSettings((current) => ({
              ...current,
              autoConnect: event.target.checked,
            }));
            setSaveState("idle");
          },
        }),
        h("span", null, "Auto-connect")
      ),
      h(
        "label",
        { className: "field" },
        h("span", null, "Decode stale timeout"),
        h("input", {
          "aria-invalid": !staleTimeoutValid,
          disabled: loadState === "loading",
          min: "0",
          step: "1",
          type: "number",
          value: settings.staleTimeoutMs,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            setSettings((current) => ({
              ...current,
              staleTimeoutMs: event.target.valueAsNumber,
            }));
            setSaveState("idle");
          },
        })
      ),
      h(
        "div",
        { className: "form-actions span-2" },
        h("button", { disabled: loadState === "loading", type: "submit" }, "Save"),
        saveState === "saved" ? h("span", { className: "save-note" }, "Saved") : null,
        error !== null ? h("span", { className: "error-note" }, error) : null
      )
    )
  );
}

function ChannelMapTable(): React.ReactElement {
  const [mode, setMode] = useState<MappingMode>("simple");
  const [map, setMap] = useState<ChannelMap>(() => createDefaultChannelMap());
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [deviceState, setDeviceState] = useState<DeviceLoadState>("idle");
  const [saveState, setSaveState] = useState<"loading" | "saved" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    setDeviceState("loading");

    try {
      const response = await sendToEngine<DeviceInfo[]>({
        type: "intiface/devices/get",
      });

      if (!Array.isArray(response)) {
        setDevices([]);
        setDeviceState("unavailable");
        return;
      }

      setDevices(response);
      setDeviceState("ready");
    } catch {
      setDevices([]);
      setDeviceState("unavailable");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([mappingMode.getValue(), channelMap.getValue()])
      .then(([storedMode, storedMap]) => {
        if (cancelled) {
          return;
        }

        setMode(storedMode);
        setMap(normaliseChannelMap(storedMap));
        setSaveState("saved");
      })
      .catch((caught) => {
        if (cancelled) {
          return;
        }

        setError(caught instanceof Error ? caught.message : String(caught));
        setSaveState("error");
      });

    void refreshDevices();

    return () => {
      cancelled = true;
    };
  }, [refreshDevices]);

  const deviceOptions = useMemo(() => {
    const names = new Set(devices.map((device) => device.name));
    for (const mapping of map) {
      if (mapping !== null) {
        names.add(mapping.deviceName);
      }
    }

    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }, [devices, map]);

  async function persistMode(nextMode: MappingMode): Promise<void> {
    setMode(nextMode);
    setSaveState("loading");

    try {
      await mappingMode.setValue(nextMode);
      setError(null);
      setSaveState("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaveState("error");
    }
  }

  async function persistMap(nextMap: ChannelMap): Promise<void> {
    setMap(nextMap);
    setSaveState("loading");

    try {
      await channelMap.setValue(nextMap);
      setError(null);
      setSaveState("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaveState("error");
    }
  }

  function updateMapping(
    channelIndex: number,
    nextMapping: ChannelMapping | null
  ): void {
    void persistMap(replaceChannelMapping(map, channelIndex, nextMapping));
  }

  return h(
    "section",
    { className: "panel", "aria-labelledby": "mapping-heading" },
    h(
      "div",
      { className: "panel-header" },
      h("h2", { id: "mapping-heading" }, "Channel Mapping"),
      h(
        "div",
        { className: "header-actions" },
        h(
          "span",
          { className: `status-pill ${deviceState}` },
          statusText(deviceState, devices)
        ),
        h(
          "button",
          {
            disabled: deviceState === "loading",
            type: "button",
            onClick: () => void refreshDevices(),
          },
          "Refresh"
        )
      )
    ),
    h(
      "div",
      { className: "mode-row", role: "radiogroup", "aria-label": "Mapping mode" },
      h(
        "label",
        null,
        h("input", {
          checked: mode === "simple",
          name: "mappingMode",
          type: "radio",
          value: "simple",
          onChange: () => void persistMode("simple"),
        }),
        h("span", null, "Simple")
      ),
      h(
        "label",
        null,
        h("input", {
          checked: mode === "mapped",
          name: "mappingMode",
          type: "radio",
          value: "mapped",
          onChange: () => void persistMode("mapped"),
        }),
        h("span", null, "Mapped")
      ),
      h("span", { className: `save-state ${saveState}` }, saveState)
    ),
    error !== null ? h("div", { className: "error-note block" }, error) : null,
    mode === "mapped"
      ? h(
          "div",
          { className: "table-wrap" },
          h(
            "table",
            null,
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                h("th", { scope: "col" }, "Channel"),
                h("th", { scope: "col" }, "Device"),
                h("th", { scope: "col" }, "Actuator"),
                h("th", { scope: "col" }, "Scale"),
                h("th", { scope: "col" }, "State")
              )
            ),
            h(
              "tbody",
              null,
              map.map((mapping, channelIndex) =>
                h(ChannelMapRow, {
                  deviceOptions,
                  devices,
                  key: channelIndex,
                  mapping,
                  channelIndex,
                  onChange: (nextMapping: ChannelMapping | null) =>
                    updateMapping(channelIndex, nextMapping),
                })
              )
            )
          )
        )
      : h("div", { className: "simple-note" }, "Channel 0 drives all resolved vibrators.")
  );
}

interface ChannelMapRowProps {
  readonly channelIndex: number;
  readonly deviceOptions: readonly string[];
  readonly devices: readonly DeviceInfo[];
  readonly mapping: ChannelMapping | null;
  readonly onChange: (mapping: ChannelMapping | null) => void;
}

function ChannelMapRow({
  channelIndex,
  deviceOptions,
  devices,
  mapping,
  onChange,
}: ChannelMapRowProps): React.ReactElement {
  const channelLabel = `CH${channelIndex + 1}`;
  const selectedDevice =
    mapping === null ? undefined : findDevice(devices, mapping.deviceName);
  const actuatorOptions = selectedDevice?.actuators ?? [];
  const scale = mapping?.scale ?? 1;
  const resolved = mappingIsResolved(mapping, devices);

  function changeDevice(deviceName: string): void {
    if (deviceName === "") {
      onChange(null);
      return;
    }

    const device = findDevice(devices, deviceName);
    onChange({
      deviceName,
      actuatorIndex: device?.actuators[0]?.index ?? mapping?.actuatorIndex ?? 0,
      scale,
    });
  }

  function changeActuator(actuatorIndex: number): void {
    if (mapping === null) {
      return;
    }

    onChange({
      ...mapping,
      actuatorIndex,
    });
  }

  function changeScale(nextScale: number): void {
    if (mapping === null) {
      return;
    }

    onChange({
      ...mapping,
      scale: clampScale(nextScale),
    });
  }

  return h(
    "tr",
    null,
    h("th", { scope: "row" }, channelLabel),
    h(
      "td",
      null,
      h(
        "select",
        {
          "aria-label": `${channelLabel} device`,
          value: mapping?.deviceName ?? "",
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            changeDevice(event.target.value),
        },
        h("option", { value: "" }, "Unmapped"),
        deviceOptions.map((deviceName) =>
          h(
            "option",
            { key: deviceName, value: deviceName },
            deviceName,
            findDevice(devices, deviceName) === undefined ? " (unresolved)" : ""
          )
        )
      )
    ),
    h(
      "td",
      null,
      h(
        "select",
        {
          "aria-label": `${channelLabel} actuator`,
          disabled: mapping === null,
          value: mapping?.actuatorIndex ?? "",
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            changeActuator(Number(event.target.value)),
        },
        mapping === null ? h("option", { value: "" }, "-") : null,
        mapping !== null && actuatorOptions.length === 0
          ? h(
              "option",
              { value: mapping.actuatorIndex },
              `Actuator ${mapping.actuatorIndex} (unresolved)`
            )
          : null,
        actuatorOptions.map((actuator) =>
          h(
            "option",
            { key: actuator.index, value: actuator.index },
            actuator.name ?? `Actuator ${actuator.index}`
          )
        )
      )
    ),
    h(
      "td",
      null,
      h(
        "div",
        { className: "scale-cell" },
        h("input", {
          "aria-label": `${channelLabel} scale`,
          disabled: mapping === null,
          max: "1",
          min: "0",
          step: "0.05",
          type: "range",
          value: scale,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            changeScale(Number(event.target.value)),
        }),
        h("output", null, scale.toFixed(2))
      )
    ),
    h(
      "td",
      null,
      h(
        "span",
        { className: resolved ? "resolved" : "unresolved" },
        mapping === null ? "Unmapped" : resolved ? "Resolved" : "Unresolved"
      )
    )
  );
}

function OptionsApp(): React.ReactElement {
  return h(
    "main",
    null,
    h("header", { className: "page-header" }, h("h1", null, "QRTuber Options")),
    h(AddressForm),
    h(ChannelMapTable)
  );
}

createRoot(document.getElementById("root")!).render(
  h(React.StrictMode, null, h(OptionsApp))
);
