import { describe, expect, it } from "vitest";
import { HapticsState, type QRTuberFrame } from "qrtuber";

import { DecodeGate } from "../../lib/engine/decode-gate.js";

function hapticsFrame(seq: number, session = "T1"): QRTuberFrame {
  return {
    type: "H",
    session,
    seq,
    state: new HapticsState([seq]),
  };
}

describe("DecodeGate", () => {
  it("accepts first frames and records decode status with the injected clock", () => {
    const gate = new DecodeGate(undefined, () => 1234);
    const accepted = gate.accept(hapticsFrame(7));

    expect(accepted).not.toBeNull();
    expect(accepted?.lastDecode).toEqual({
      session: "T1",
      seq: 7,
      at: 1234,
    });
  });

  it("rejects duplicate frames until reset", () => {
    const gate = new DecodeGate(undefined, () => 1);
    const frame = hapticsFrame(9);

    expect(gate.accept(frame)).not.toBeNull();
    expect(gate.accept(frame)).toBeNull();

    gate.reset();
    expect(gate.accept(frame)).not.toBeNull();
  });

  it("accepts the same sequence when the session changes", () => {
    const gate = new DecodeGate(undefined, () => 5);

    expect(gate.accept(hapticsFrame(1, "A"))).not.toBeNull();
    expect(gate.accept(hapticsFrame(1, "B"))).not.toBeNull();
  });
});
