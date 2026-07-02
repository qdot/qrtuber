import { describe, expect, it } from "vitest";
import { HapticsState, type QRTuberFrame, SequenceTracker } from "../../src/index.js";

function frame(session: string, seq: number): QRTuberFrame {
  return {
    type: "H",
    session,
    seq,
    state: new HapticsState()
  };
}

describe("SequenceTracker", () => {
  it("accepts first frames, new sequence values, session changes, and resets", () => {
    const tracker = new SequenceTracker();

    expect(tracker.accept(frame("A", 1))).toBe(true);
    expect(tracker.accept(frame("A", 1))).toBe(false);
    expect(tracker.accept(frame("A", 2))).toBe(true);
    expect(tracker.accept(frame("A", 1))).toBe(true);
    expect(tracker.accept(frame("B", 1))).toBe(true);
    expect(tracker.accept(frame("B", 1))).toBe(false);

    tracker.reset();
    expect(tracker.accept(frame("B", 1))).toBe(true);
  });
});
