import { describe, expect, it } from "vitest";

import { boundingBoxFromPoints } from "../../src/visual/types.js";

describe("boundingBoxFromPoints", () => {
  it("returns null for empty point arrays", () => {
    expect(boundingBoxFromPoints([])).toBeNull();
  });

  it("returns a zero-area box for a single point", () => {
    expect(boundingBoxFromPoints([{ x: 12, y: 34 }])).toEqual({
      minX: 12,
      minY: 34,
      maxX: 12,
      maxY: 34,
    });
  });

  it("returns the bounds for a four-corner point set", () => {
    expect(
      boundingBoxFromPoints([
        { x: 10, y: 20 },
        { x: 30, y: 20 },
        { x: 30, y: 40 },
        { x: 10, y: 40 },
      ])
    ).toEqual({
      minX: 10,
      minY: 20,
      maxX: 30,
      maxY: 40,
    });
  });

  it("handles unordered negative points", () => {
    expect(
      boundingBoxFromPoints([
        { x: 8, y: -4 },
        { x: -12, y: 5 },
        { x: 3, y: -9 },
        { x: -7, y: 14 },
      ])
    ).toEqual({
      minX: -12,
      minY: -9,
      maxX: 8,
      maxY: 14,
    });
  });
});
