import { describe, expect, it } from "vitest";
import { HapticsState } from "../../src/index.js";

describe("HapticsState", () => {
  it("clamps and rounds constructor values to nine bytes", () => {
    const state = new HapticsState([Number.NaN, 300, 12.6, -3, 255.4, 0.4, 1.5, 128, 42, 99]);

    expect(state.toArray()).toEqual([0, 255, 13, 0, 255, 0, 2, 128, 42]);
    expect(state.get(0)).toBe(0);
    expect(state.get(8)).toBe(42);
  });

  it("parses only strict eighteen-character uppercase hex payloads", () => {
    expect(HapticsState.fromHex("00FF4080A010203040")?.toArray()).toEqual([
      0, 255, 64, 128, 160, 16, 32, 48, 64
    ]);
    expect(HapticsState.fromHex("00ff4080A010203040")).toBeNull();
    expect(HapticsState.fromHex("00FF4080A01020304")).toBeNull();
    expect(HapticsState.fromHex("00FF4080A0102030400")).toBeNull();
    expect(HapticsState.fromHex("GGFF4080A010203040")).toBeNull();
  });

  it("serializes, compares, and detects all-zero states", () => {
    const zero = new HapticsState();
    const nonzero = new HapticsState([1]);

    expect(zero.toHex()).toBe("000000000000000000");
    expect(zero.isAllZero()).toBe(true);
    expect(nonzero.isAllZero()).toBe(false);
    expect(nonzero.equals(new HapticsState([1]))).toBe(true);
    expect(nonzero.equals(zero)).toBe(false);
  });
});
