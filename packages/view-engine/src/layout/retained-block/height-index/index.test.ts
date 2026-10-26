import { describe, expect, it } from "vitest";
import { createQuireLayoutHeightIndex } from "./index";

describe("QuireLayoutHeightIndex", () => {
  it("queries block tops, total height, and offsets from one prefix authority", () => {
    const index = createQuireLayoutHeightIndex();

    expect(index.reconcile([
      { id: "a", extent: 24 },
      { id: "b", extent: 32 },
      { id: "c", extent: 16 }
    ])).toEqual({ mode: "rebuild", updatedEntries: 3 });
    expect(index.blockTop(0)).toBe(0);
    expect(index.blockTop(1)).toBe(24);
    expect(index.blockTop(2)).toBe(56);
    expect(index.totalHeight()).toBe(72);
    expect(index.blockIndexAtOffset(-1)).toBeUndefined();
    expect(index.blockIndexAtOffset(0)).toBe(0);
    expect(index.blockIndexAtOffset(23.99)).toBe(0);
    expect(index.blockIndexAtOffset(24)).toBe(1);
    expect(index.blockIndexAtOffset(71.99)).toBe(2);
    expect(index.blockIndexAtOffset(72)).toBeUndefined();
  });

  it("applies same-order height changes as one atomic delta batch", () => {
    const index = createQuireLayoutHeightIndex();
    index.reconcile([
      { id: "a", extent: 24 },
      { id: "b", extent: 32 },
      { id: "c", extent: 16 }
    ]);

    expect(index.reconcile([
      { id: "a", extent: 40 },
      { id: "b", extent: 32 },
      { id: "c", extent: 20 }
    ])).toEqual({ mode: "delta", updatedEntries: 2 });
    expect(index.blockTop(1)).toBe(40);
    expect(index.blockTop(2)).toBe(72);
    expect(index.totalHeight()).toBe(92);
  });

  it("rebuilds when structural order changes instead of guessing identity", () => {
    const index = createQuireLayoutHeightIndex();
    index.reconcile([
      { id: "a", extent: 24 },
      { id: "b", extent: 32 }
    ]);

    expect(index.reconcile([
      { id: "inserted", extent: 8 },
      { id: "a", extent: 24 },
      { id: "b", extent: 32 }
    ])).toEqual({ mode: "rebuild", updatedEntries: 3 });
    expect(index.blockTop(2)).toBe(32);
  });

  it("rejects an invalid delta batch without partially mutating the index", () => {
    const index = createQuireLayoutHeightIndex();
    index.reconcile([
      { id: "a", extent: 24 },
      { id: "b", extent: 32 }
    ]);

    expect(() => index.applyDeltas([
      { index: 0, delta: 8 },
      { index: 1, delta: -40 }
    ])).toThrow(/negative extent/);
    expect(index.blockTop(1)).toBe(24);
    expect(index.totalHeight()).toBe(56);
  });
});
