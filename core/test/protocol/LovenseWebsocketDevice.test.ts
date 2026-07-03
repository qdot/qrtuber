import { describe, expect, it } from "vitest";
import {
  HapticsState,
  createLovenseDeviceTypeResponse,
  createLovenseWebsocketHandshake,
  processLovenseWebsocketMessage
} from "../../src/index.js";

describe("Lovense websocket device helpers", () => {
  it("creates the WSDM handshake expected by Intiface Central", () => {
    expect(createLovenseWebsocketHandshake("8A3D9FAC2A45")).toEqual({
      identifier: "qrtuber-lovense",
      address: "8A3D9FAC2A45",
      version: 0
    });
  });

  it("responds to Lovense identification and battery commands", () => {
    expect(createLovenseDeviceTypeResponse({ deviceAddress: "8A3D9FAC2A45" })).toBe(
      "Z:8A3D9FAC2A45:10"
    );

    const result = processLovenseWebsocketMessage("DeviceType;Battery;", new HapticsState(), {
      batteryLevel: 101,
      deviceAddress: "8A3D9FAC2A45"
    });

    expect(result.actions).toEqual([
      {
        command: "DeviceType;",
        payload: "Z:8A3D9FAC2A45:10",
        type: "respond"
      },
      {
        command: "Battery;",
        payload: "100;",
        type: "respond"
      }
    ]);
  });

  it("maps Lovense vibration speed onto QRTuber haptics channels", () => {
    const result = processLovenseWebsocketMessage(
      "Vibrate:10;Vibrate2:20;Vibrate3:0;",
      new HapticsState([1, 2, 3]),
      { deviceAddress: "8A3D9FAC2A45" }
    );

    expect(result.state.toArray()).toEqual([128, 255, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.actions.map((action) => action.type)).toEqual([
      "haptics",
      "haptics",
      "haptics"
    ]);
  });

  it("clamps malformed numeric command values and reports unknown commands", () => {
    const result = processLovenseWebsocketMessage("Vibrate:99;Rotate:1;", new HapticsState(), {
      deviceAddress: "8A3D9FAC2A45"
    });

    expect(result.state.get(0)).toBe(255);
    expect(result.actions).toMatchObject([
      {
        command: "Vibrate:99;",
        speed: 20,
        type: "haptics"
      },
      {
        command: "Rotate:1;",
        type: "unknown"
      }
    ]);
  });
});
