import { describe, expect, it } from "vitest";

import {
  isContentCommand,
  isDeviceInfo,
  isEngineRequest,
  isEnsureEngineRequest,
  isFrameDecodeResponse,
  isStatusBroadcast,
} from "../../utils/messages.js";
import { createInitialStatus } from "../../utils/status.js";

const box = { minX: 1, minY: 2, maxX: 3, maxY: 4 };

describe("message validators", () => {
  it("accepts valid engine requests and rejects malformed boundaries", () => {
    expect(
      isEngineRequest({
        type: "frame/decode",
        seq: 1,
        dataUrl: "data:image/png;base64,AA==",
        mode: "roi",
        roiOrigin: box,
      })
    ).toBe(true);
    expect(
      isEngineRequest({
        type: "frame/decode",
        seq: -1,
        dataUrl: "data:image/png;base64,AA==",
        mode: "roi",
      })
    ).toBe(false);
    expect(
      isEngineRequest({
        type: "frame/decode",
        seq: 1,
        dataUrl: "blob:https://example.test/frame",
        mode: "roi",
      })
    ).toBe(false);
    expect(
      isEngineRequest({
        type: "frame/decode",
        seq: 1,
        dataUrl: "https://example.test/frame.png",
        mode: "roi",
      })
    ).toBe(false);
    expect(isEngineRequest({ type: "haptics/set-enabled", enabled: true })).toBe(true);
    expect(isEngineRequest({ type: "haptics/set-enabled", enabled: "yes" })).toBe(false);
    expect(isEngineRequest({ type: "status/get" })).toBe(true);
  });

  it("validates content, ensure, decode response, device, and status messages", () => {
    expect(isContentCommand({ type: "content/start" })).toBe(true);
    expect(isContentCommand({ type: "content/attach" })).toBe(false);
    expect(isEnsureEngineRequest({ type: "engine/ensure" })).toBe(true);

    expect(isFrameDecodeResponse({ found: true, boundingBox: box })).toBe(true);
    expect(isFrameDecodeResponse({ found: false, error: "no qr" })).toBe(true);
    expect(isFrameDecodeResponse({ found: true })).toBe(false);

    expect(
      isDeviceInfo({
        name: "Toy",
        actuators: [{ index: 0, type: "vibrate", name: "Motor" }],
      })
    ).toBe(true);
    expect(isDeviceInfo({ name: "", actuators: [] })).toBe(false);

    expect(
      isStatusBroadcast({
        type: "status/update",
        status: createInitialStatus(),
      })
    ).toBe(true);
    expect(isStatusBroadcast({ type: "status/update", status: { intiface: {} } })).toBe(false);
  });
});
