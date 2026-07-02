import { describe, expect, it } from "vitest";
import {
  MAX_FRAME_LENGTH,
  MAX_SEQ,
  parseFrame,
  parseFrameResult
} from "../../src/index.js";

const SPEC_VECTOR = "QT1:A7F2:18422:H:00FF4080A010203040";

describe("parseFrame", () => {
  it("decodes the QT1 haptics spec vector through the public API", () => {
    const frame = parseFrame(SPEC_VECTOR);

    expect(frame).not.toBeNull();
    expect(frame).toMatchObject({
      type: "H",
      session: "A7F2",
      seq: 18422
    });
    expect(frame?.state.toArray()).toEqual([0, 255, 64, 128, 160, 16, 32, 48, 64]);
    expect(frame?.state.toHex()).toBe("00FF4080A010203040");
  });

  it("reports parse errors in validation order", () => {
    const tooLong = `QT1:A:1:H:${"0".repeat(MAX_FRAME_LENGTH)}`;

    expect(parseFrameResult("")).toEqual({ ok: false, error: "EMPTY" });
    expect(parseFrameResult(tooLong)).toEqual({ ok: false, error: "TOO_LONG" });
    expect(parseFrameResult("QT1:a:1:H:000000000000000000")).toEqual({
      ok: false,
      error: "NOT_ALPHANUMERIC"
    });
    expect(parseFrameResult("QT1:A")).toEqual({ ok: false, error: "BAD_STRUCTURE" });
    expect(parseFrameResult("QT2:A:1:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_VERSION"
    });
    expect(parseFrameResult("QT1::1:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_SESSION"
    });
    expect(parseFrameResult("QT1:A:+5:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_SEQ"
    });
    expect(parseFrameResult("QT1:A:1:X:000000000000000000")).toEqual({
      ok: false,
      error: "UNKNOWN_TYPE"
    });
    expect(parseFrameResult("QT1:A:1:H:00000000000000000")).toEqual({
      ok: false,
      error: "BAD_PAYLOAD"
    });
    expect(parseFrameResult("QT1:A:1:H:000000000000000000:KK:V")).toEqual({
      ok: false,
      error: "BAD_EXTENSION"
    });
  });

  it("accepts only sessions with 1 to 8 uppercase alphanumeric characters", () => {
    expect(parseFrame("QT1:A:1:H:000000000000000000")?.session).toBe("A");
    expect(parseFrame("QT1:ABCDEFGH:1:H:000000000000000000")?.session).toBe("ABCDEFGH");
    expect(parseFrameResult("QT1:ABCDEFGHI:1:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_SESSION"
    });
    expect(parseFrameResult("QT1:A B:1:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_SESSION"
    });
  });

  it("rejects bad sequence values and accepts decimal uint32 values", () => {
    expect(parseFrameResult("QT1:A:-1:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_SEQ"
    });
    expect(parseFrameResult("QT1:A:+5:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_SEQ"
    });
    expect(parseFrameResult("QT1:A:1.5:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_SEQ"
    });
    expect(parseFrame("QT1:A:000001:H:000000000000000000")?.seq).toBe(1);
    expect(parseFrame(`QT1:A:${MAX_SEQ}:H:000000000000000000`)?.seq).toBe(MAX_SEQ);
    expect(parseFrameResult("QT1:A:4294967296:H:000000000000000000")).toEqual({
      ok: false,
      error: "BAD_SEQ"
    });
  });

  it("accepts well-formed extension tails and rejects malformed tails", () => {
    expect(parseFrame("QT1:A:1:H:000000000000000000:K:V")).not.toBeNull();
    expect(parseFrame("QT1:A:1:H:000000000000000000:Z:UNKNOWN")).not.toBeNull();
    expect(parseFrameResult("QT1:A:1:H:000000000000000000:K")).toEqual({
      ok: false,
      error: "BAD_EXTENSION"
    });
    expect(parseFrameResult("QT1:A:1:H:000000000000000000:KK:V")).toEqual({
      ok: false,
      error: "BAD_EXTENSION"
    });
    expect(parseFrameResult("QT1:A:1:H:000000000000000000:K:")).toEqual({
      ok: false,
      error: "BAD_EXTENSION"
    });
  });

  it("returns null and never throws for garbage input", () => {
    const garbage = [
      null,
      undefined,
      12,
      {},
      [],
      "not qt1",
      "QT1",
      "QT1:A:1:H:GG0000000000000000",
      "QT1:A:1:H:000000000000000000:K"
    ];

    for (const input of garbage) {
      expect(() => parseFrame(input as string)).not.toThrow();
      expect(parseFrame(input as string)).toBeNull();
    }
  });
});
