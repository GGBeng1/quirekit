import { describe, expect, it, vi } from "vitest";
import type { QuireBlockFlowCacheKey } from "@quirekit/layout/block-flow";
import type { QuireBlockLayoutInput } from "../../engine/block-types";
import type { QuireLayoutBox } from "../../engine/types";
import { createQuireLeafFlowCache } from "./cache";
import { relocateQuireTextblockInput } from "../block/relocation/input";

const key: QuireBlockFlowCacheKey = {
  x: 10, y: 20, width: 300, blockHeight: 24, blockGap: 0, fragmentBlockSize: 700
};

/**
 * Creates one immutable ordinary input with optional admission metadata.
 *
 * @param extra - Fields whose admission behavior the case exercises.
 * @returns Leaf input using one stable occurrence id and range.
 */
function input(extra: Partial<QuireBlockLayoutInput> = {}): QuireBlockLayoutInput {
  return { id: "paragraph", range: { from: 1, to: 8 }, ...extra };
}

/**
 * Creates a complete placed result without involving the cache implementation.
 *
 * @returns Result carrying geometry and independent pagination metadata.
 */
function box(): QuireLayoutBox {
  return {
    id: "paragraph", range: { from: 1, to: 8 },
    rect: { x: 10, y: 20, width: 300, height: 24 },
    pagination: { keepWithNext: true, widows: 2 }, textFragments: []
  };
}

describe("exact ordinary leaf flow cache", () => {
  it("retains resolved insertion width without bypassing exact leaf reuse", () => {
    const cache = createQuireLeafFlowCache();
    const source = input({ inlineContentWidth: 204 });
    const placed = { ...box(), inlineContentWidth: 204 };
    cache.set(source, key, placed);
    expect(cache.get(source, key)).toBe(placed);
    expect(cache.get(source, key)?.inlineContentWidth).toBe(204);
    expect(cache.snapshot()).toEqual({ hits: 2, relocations: 0, misses: 0, stores: 1, bypasses: 0 });
  });
  it("returns the complete original box without evaluating local shape or signatures", () => {
    const cache = createQuireLeafFlowCache();
    const readShape = vi.fn(() => { throw new Error("unexpected shape read"); });
    const source = input();
    Object.defineProperties(source, {
      textFragments: { get: readShape }, layoutSignature: { get: readShape }
    });
    const placed = box();
    const metadata = { preserved: true };
    Object.defineProperty(placed, "extensionMetadata", { value: metadata });
    Object.freeze(placed);

    expect(cache.get(source, key)).toBeUndefined();
    cache.set(source, key, placed);
    expect(cache.get(source, { ...key })).toBe(placed);
    expect(Object.getOwnPropertyDescriptor(placed, "extensionMetadata")?.value)
      .toBe(metadata);
    expect(placed.pagination).toEqual({ keepWithNext: true, widows: 2 });
    expect(readShape).not.toHaveBeenCalled();
    expect(cache.snapshot()).toEqual({ hits: 1, relocations: 0, misses: 1, stores: 1, bypasses: 0 });
  });

  it.each([
    ["x", 11], ["y", 21], ["width", 301], ["blockHeight", 25],
    ["blockGap", 1], ["fragmentBlockSize", 701], ["fragmentBlockSize", undefined]
  ] as const)("misses when %s changes to %s", (field, value) => {
    const cache = createQuireLeafFlowCache();
    const source = input();
    const placed = box();
    cache.set(source, key, placed);
    expect(cache.get(source, { ...key, [field]: value })).toBeUndefined();
    expect(cache.get(source, key)).toBe(placed);
    expect(placed.rect).toEqual({ x: 10, y: 20, width: 300, height: 24 });
  });

  it("requires input identity even when ids, ranges and signatures agree", () => {
    const cache = createQuireLeafFlowCache();
    const source = input({ layoutSignature: "same" });
    cache.set(source, key, box());
    expect(cache.get({ ...source }, key)).toBeUndefined();
    expect(cache.get({ ...source, range: { from: 2, to: 9 } }, key)).toBeUndefined();
  });

  it("owns its geometry key while preserving previously returned results", () => {
    const cache = createQuireLeafFlowCache();
    const source = input();
    const placed = box();
    const mutableKey = { ...key };
    cache.set(source, mutableKey, placed);
    mutableKey.y = 100;
    expect(cache.get(source, key)).toBe(placed);
    const moved = { ...placed, rect: { ...placed.rect, y: 100 } };
    cache.set(source, mutableKey, moved);
    expect(cache.get(source, mutableKey)).toBe(moved);
    expect(placed.rect.y).toBe(20);
  });

  it.each([
    "children", "layoutProvider", "viewRoot", "viewRegion", "viewCapabilities",
    "exportFallbacks", "regionProducts", "sourceCapabilities",
    "localFlowExclusions", "flowExclusionGaps", "unknownOwner"
  ])("rejects inputs carrying %s authority", (field) => {
    const cache = createQuireLeafFlowCache();
    const arrayField = ["children", "exportFallbacks",
      "sourceCapabilities", "localFlowExclusions", "flowExclusionGaps"].includes(field);
    // The adapter must reject these authorities without opening their payload.
    const source = input({ [field]: arrayField ? [{}] : {} });
    cache.set(source, key, box());
    expect(cache.get(source, key)).toBeUndefined();
    expect(cache.snapshot()).toEqual({ hits: 0, relocations: 0, misses: 0, stores: 0, bypasses: 1 });
  });

  it("admits source anchors and inline sidecars but not anchored or failed sidecars", () => {
    const placement = { layoutMode: "inline", flowExclusion: { kind: "none" } };
    const sidecar = (overrides: object) => ({ sourceAnchorId: "a", nodeType: "field", status: "resolved",
      placement, presentation: {}, ...overrides }) as unknown as NonNullable<QuireBlockLayoutInput["sourceCapabilities"]>[number];
    const cache = createQuireLeafFlowCache();
    const admitted = [input({ sourceAnchors: [{}] as unknown as QuireBlockLayoutInput["sourceAnchors"] }),
      input({ sourceCapabilities: [sidecar({})] })];
    for (const source of admitted) {
      cache.set(source, key, box());
      expect(cache.get(source, key)).toBeDefined();
    }
    for (const rejected of [sidecar({ placement: { ...placement, layoutMode: "anchored" } }),
      sidecar({ placement: { ...placement, flowExclusion: { kind: "rectangle" } } }), sidecar({ status: "gap", gaps: [] })]) {
      const source = input({ sourceCapabilities: [rejected] });
      cache.set(source, key, box());
      expect(cache.get(source, key)).toBeUndefined();
    }
  });

  it("relocates from the latest placement of the same content when the original was never placed here", () => {
    const cache = createQuireLeafFlowCache();
    const original = input();
    const first = relocateQuireTextblockInput(original, 3)!;
    cache.set(first, key, { ...box(), range: first.range });
    const second = relocateQuireTextblockInput(original, 5)!;
    const moved = cache.get(second, { ...key, y: 30 });
    expect(moved?.range).toEqual(second.range);
    expect(moved?.rect.y).toBe(30);
    expect(cache.snapshot()).toMatchObject({ relocations: 1, misses: 0 });
  });

  it("rejects even empty child containers and unknown symbol metadata", () => {
    const cache = createQuireLeafFlowCache();
    for (const source of [input({ children: [] }), { ...input(), [Symbol("owner")]: {} }]) {
      cache.set(source, key, box());
      expect(cache.get(source, key)).toBeUndefined();
    }
  });

  it("allows empty source lists and preserves but never invokes an immutable reflow closure", () => {
    const cache = createQuireLeafFlowCache();
    const reflow = {
      lineHeight: 24,
      reflow: vi.fn(() => ({ textFragments: [], localFlowExclusions: [] })),
      reflowInlineReplacements: vi.fn(() => ({ textRuns: [], textFragments: [] }))
    };
    const source = input({ sourceAnchors: [], sourceCapabilities: [], textFlowReflow: reflow });
    const placed = { ...box(), textFlowReflow: reflow };
    cache.set(source, key, placed);
    expect(cache.get(source, key)?.textFlowReflow).toBe(reflow);
    expect(reflow.reflow).not.toHaveBeenCalled();
    expect(reflow.reflowInlineReplacements).not.toHaveBeenCalled();
  });

  it("keeps separate cache lifetimes independent even for the same input", () => {
    const accepted = createQuireLeafFlowCache();
    const transient = createQuireLeafFlowCache();
    const source = input();
    accepted.set(source, key, box());
    expect(transient.get(source, key)).toBeUndefined();
    expect(transient.snapshot().stores).toBe(0);
    expect(accepted.snapshot().stores).toBe(1);
  });
});
