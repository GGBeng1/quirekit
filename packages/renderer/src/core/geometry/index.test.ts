import { describe, expect, it } from "vitest";
import {
  containsQuireTargetPoint,
  containsQuirePoint,
  createQuireCenterRotationTransform,
  createQuirePolygonHitArea,
  doesQuireRectIntersectAny,
  doQuireRectsIntersect,
  intersectQuireRects,
  isQuireRectEmpty,
  isQuireRectFinite,
  measureQuireRectDistanceSquaredToPoint,
  normalizeQuirePositiveAreaRects,
  resolveQuirePointBounds,
  resolveQuireRectCorners,
  translateQuireAffineTransform,
  transformQuirePoint,
  translateQuireHitArea
} from "../index";

describe("canvas geometry contracts", () => {
  it("detects empty rectangles", () => {
    expect(isQuireRectEmpty({ x: 0, y: 0, width: 0, height: 10 })).toBe(true);
    expect(isQuireRectEmpty({ x: 0, y: 0, width: 10, height: -1 })).toBe(true);
    expect(isQuireRectEmpty({ x: 0, y: 0, width: 10, height: 10 })).toBe(false);
    expect(isQuireRectEmpty({ x: Number.NaN, y: 0, width: 10, height: 10 })).toBe(true);
    expect(isQuireRectFinite({ x: 0, y: 0, width: 0, height: 10 })).toBe(true);
    expect(isQuireRectFinite({ x: 0, y: 0, width: -1, height: 10 })).toBe(false);
  });

  it("checks whether a point is inside a rectangle", () => {
    const rect = { x: 10, y: 20, width: 30, height: 40 };

    expect(containsQuirePoint(rect, { x: 10, y: 20 })).toBe(true);
    expect(containsQuirePoint(rect, { x: 40, y: 60 })).toBe(true);
    expect(containsQuirePoint(rect, { x: 41, y: 60 })).toBe(false);
    expect(containsQuirePoint(rect, { x: 40, y: 61 })).toBe(false);
  });

  it("intersects overlapping rectangles", () => {
    expect(
      intersectQuireRects(
        { x: 0, y: 0, width: 20, height: 20 },
        { x: 10, y: 5, width: 20, height: 10 }
      )
    ).toEqual({ x: 10, y: 5, width: 10, height: 10 });

    expect(
      intersectQuireRects(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 10, width: 10, height: 10 }
      )
    ).toBeNull();

    expect(doQuireRectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 9, y: 9, width: 10, height: 10 }
    )).toBe(true);
    expect(doesQuireRectIntersectAny(
      { x: 0, y: 0, width: 10, height: 10 },
      [
        { x: 20, y: 20, width: 5, height: 5 },
        { x: 5, y: 5, width: 2, height: 2 }
      ]
    )).toBe(true);
    expect(doesQuireRectIntersectAny(
      { x: 0, y: 0, width: 10, height: 10 },
      []
    )).toBe(false);
  });

  it.each([
    ["edge touch", { x: 10, y: 0, width: 10, height: 10 }],
    ["corner touch", { x: 10, y: 10, width: 10, height: 10 }],
    ["zero width", { x: 5, y: 0, width: 0, height: 10 }],
    ["negative width", { x: 5, y: 0, width: -1, height: 10 }],
    ["NaN coordinate", { x: Number.NaN, y: 0, width: 10, height: 10 }],
    ["infinite extent", { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 10 }]
  ])("rejects %s as positive-area intersection", (_label, candidate) => {
    expect(intersectQuireRects(
      { x: 0, y: 0, width: 10, height: 10 },
      candidate
    )).toBeNull();
  });

  it.each([
    ["inside", { x: 15, y: 25 }, 0],
    ["boundary", { x: 10, y: 20 }, 0],
    ["horizontal outside", { x: 5, y: 30 }, 25],
    ["vertical outside", { x: 20, y: 65 }, 25],
    ["diagonal outside", { x: 5, y: 65 }, 50]
  ])("measures point-to-rect distance for %s points", (_label, point, expected) => {
    expect(measureQuireRectDistanceSquaredToPoint(
      { x: 10, y: 20, width: 30, height: 40 },
      point
    )).toBe(expected);
  });

  it("fails point-to-rect distance closed for invalid geometry", () => {
    expect(measureQuireRectDistanceSquaredToPoint(
      { x: 10, y: 20, width: 0, height: 0 },
      { x: 13, y: 24 }
    )).toBe(25);
    expect(measureQuireRectDistanceSquaredToPoint(
      { x: 10, y: 20, width: -1, height: 10 },
      { x: 10, y: 20 }
    )).toBe(Number.POSITIVE_INFINITY);
    expect(measureQuireRectDistanceSquaredToPoint(
      { x: 10, y: 20, width: 10, height: 10 },
      { x: Number.NaN, y: 20 }
    )).toBe(Number.POSITIVE_INFINITY);
  });

  it("normalizes optional rectangle sets without copying valid input", () => {
    const valid = [{ x: 0, y: 0, width: 10, height: 10 }];

    expect(normalizeQuirePositiveAreaRects(valid)).toBe(valid);
    expect(normalizeQuirePositiveAreaRects([
      ...valid,
      { x: 0, y: 0, width: 0, height: 10 }
    ])).toEqual(valid);
    expect(normalizeQuirePositiveAreaRects([
      { x: 0, y: 0, width: -1, height: 10 }
    ])).toBeUndefined();
    expect(normalizeQuirePositiveAreaRects([
      { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 10 }
    ])).toBeUndefined();
    expect(normalizeQuirePositiveAreaRects([])).toBeUndefined();
  });

  it("derives deterministic center-fixed rectangle geometry", () => {
    const rect = { x: 0, y: 0, width: 100, height: 40 };
    const transform = createQuireCenterRotationTransform(rect, 90);
    const corners = resolveQuireRectCorners(rect).map((point) =>
      transformQuirePoint(point, transform)
    );

    expect(transform).toEqual({
      a: 0,
      b: 1,
      c: -1,
      d: 0,
      e: 70,
      f: -30
    });
    expect(corners).toEqual([
      { x: 70, y: -30 },
      { x: 70, y: 70 },
      { x: 30, y: 70 },
      { x: 30, y: -30 }
    ]);
    expect(resolveQuirePointBounds(corners)).toEqual({
      x: 30,
      y: -30,
      width: 40,
      height: 100
    });
  });

  it("rebases a center-fixed affine with translated geometry", () => {
    const originalRect = { x: 10, y: 20, width: 100, height: 40 };
    const translatedRect = { x: 17, y: 17, width: 100, height: 40 };
    const original = createQuireCenterRotationTransform(originalRect, 90);

    expect(translateQuireAffineTransform(original, 7, -3)).toEqual(
      createQuireCenterRotationTransform(translatedRect, 90)
    );
  });

  it("uses exact polygon geometry after the coarse target rectangle", () => {
    const hitArea = createQuirePolygonHitArea([
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 }
    ]);
    const rect = { x: 0, y: 0, width: 100, height: 100 };

    expect(containsQuireTargetPoint(rect, hitArea, { x: 10, y: 10 }))
      .toBe(false);
    expect(containsQuireTargetPoint(rect, hitArea, { x: 50, y: 50 }))
      .toBe(true);
    expect(containsQuireTargetPoint(rect, hitArea, { x: 50, y: 0 }))
      .toBe(true);
    expect(translateQuireHitArea(hitArea, 10, -5)).toEqual({
      kind: "polygon",
      points: [
        { x: 60, y: -5 },
        { x: 110, y: 45 },
        { x: 60, y: 95 },
        { x: 10, y: 45 }
      ]
    });
  });
});
