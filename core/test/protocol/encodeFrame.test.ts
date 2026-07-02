import { describe, expect, it } from "vitest";
import { encodeFrame, HapticsState, parseFrame } from "../../src/index.js";

describe("encodeFrame", () => {
  it("roundtrips haptics frames through encode and parse", () => {
    const encoded = encodeFrame({
      type: "H",
      session: "A7F2",
      seq: 18422,
      state: new HapticsState([0, 255, 64, 128, 160, 16, 32, 48, 64])
    });

    expect(encoded).toBe("QT1:A7F2:18422:H:00FF4080A010203040");
    expect(parseFrame(encoded)?.state.toHex()).toBe("00FF4080A010203040");
  });

  it("throws for bad programmer input", () => {
    expect(() =>
      encodeFrame({
        type: "H",
        session: "TOO-LONG",
        seq: 1,
        state: new HapticsState()
      })
    ).toThrow(RangeError);

    expect(() =>
      encodeFrame({
        type: "H",
        session: "A",
        seq: -1,
        state: new HapticsState()
      })
    ).toThrow(RangeError);

    expect(() =>
      encodeFrame({
        type: "H",
        session: "A",
        seq: 1.5,
        state: new HapticsState()
      })
    ).toThrow(RangeError);

    expect(() =>
      encodeFrame({
        type: "H",
        session: "A",
        seq: 1,
        state: {} as HapticsState
      })
    ).toThrow(TypeError);
  });
});
