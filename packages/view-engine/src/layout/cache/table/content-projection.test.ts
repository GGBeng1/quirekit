import { describe, expect, it, vi } from "vitest";
import { createQuireTableProductCache } from "./cache";
import { projectQuireTableCellContentLayoutRange } from "./content-projection";
import type { QuireBlockLayoutInput } from "../../engine/block-types";

const textMeasurer = {
  measureText: (text: string) => ({ width: text.length })
};

describe("table cell content range projection", () => {
  it("retains an unchanged semantic cell while remapping absolute ranges", () => {
    const cache = createPreparedCache();
    const sourceIdentity = {};
    const buildInitial = vi.fn(() => ({
      height: 28,
      children: [{
        id: "paragraph-0",
        range: { from: 11, to: 19 },
        textRuns: [{
          text: "unchanged",
          range: { from: 12, to: 18 },
          font: "16px sans-serif",
          marks: []
        }]
      }]
    }));
    const initial = cache.readCellContent({
      key: createCellKey(sourceIdentity, { from: 10, to: 20 }),
      build: buildInitial
    });
    const shiftedBuild = vi.fn(() => ({ height: 99, children: [] }));
    const shifted = cache.readCellContent({
      key: createCellKey(sourceIdentity, { from: 25, to: 35 }),
      build: shiftedBuild,
      project: projectQuireTableCellContentLayoutRange
    });

    expect(initial.children[0]?.range).toEqual({ from: 11, to: 19 });
    expect(shifted.children[0]?.range).toEqual({ from: 26, to: 34 });
    expect(shifted.children[0]?.textRuns?.[0]?.range).toEqual({ from: 27, to: 33 });
    expect(shiftedBuild).not.toHaveBeenCalled();
    expect(cache.snapshot().cellContentHits).toBe(1);
  });

  it("rebuilds when nested provider facts cannot be projected safely", () => {
    const cache = createPreparedCache();
    const sourceIdentity = {};
    cache.readCellContent({
      key: createCellKey(sourceIdentity, { from: 10, to: 20 }),
      build: () => ({
        height: 28,
        children: [{
          id: "provider-0",
          range: { from: 11, to: 19 },
          layoutProvider: {
            provider: { id: "fixture-provider" },
            snapshotVersion: 1,
            sourceKind: "fixture-provider-source",
            sourceIdentity: {},
            sourcePath: [0],
            sourceContentStart: 12,
            collectBlockInputs: vi.fn()
          } as never
        }]
      })
    });
    const rebuild = vi.fn(() => ({ height: 32, children: [] }));
    const shifted = cache.readCellContent({
      key: createCellKey(sourceIdentity, { from: 25, to: 35 }),
      build: rebuild,
      project: projectQuireTableCellContentLayoutRange
    });

    expect(shifted.height).toBe(32);
    expect(rebuild).toHaveBeenCalledOnce();
    expect(cache.snapshot().cellContentMisses).toBe(2);
  });

  it("moves logical inline anchors with the cell instead of retaining an old caret position", () => {
    const anchor = { id: "inline-0", nodeType: "fixture", range: { from: 12, to: 13 }, position: { pos: 12 }, affinity: "before" as const };
    const original = { height: 28, children: [{ id: "paragraph", range: { from: 11, to: 19 }, sourceAnchors: [anchor] }] };
    const shifted = projectQuireTableCellContentLayoutRange(original, { from: 10, to: 20 }, { from: 9, to: 19 });
    expect(shifted?.children[0]?.sourceAnchors?.[0]?.range).toEqual({ from: 11, to: 12 });
    expect(shifted?.children[0]?.sourceAnchors?.[0]?.position).toEqual({ pos: 11 });
    expect(anchor.range).toEqual({ from: 12, to: 13 });
  });

  it.each(["sourceCapabilities", "textFlowReflow"] as const)("recollects snapshot-bound %s when an earlier cell loses text", service => {
    const child = {
      id: "paragraph", range: { from: 11, to: 19 },
      [service]: service === "sourceCapabilities" ? [{ sourceAnchorId: "inline-0" }] : { reflow: vi.fn() }
    } as unknown as QuireBlockLayoutInput;
    const layout = { height: 28, children: [child] };
    expect(projectQuireTableCellContentLayoutRange(layout, { from: 10, to: 20 }, { from: 9, to: 19 })).toBeUndefined();
    expect(projectQuireTableCellContentLayoutRange(layout, { from: 10, to: 20 }, { from: 10, to: 20 })).toBe(layout);
  });

  it.each(["children", "futureSourceFact"] as const)("rejects %s outside the ordinary leaf relocation contract", field => {
    const child = { id: "paragraph", range: { from: 11, to: 19 },
      [field]: field === "children" ? [] : { position: 12 } } as unknown as QuireBlockLayoutInput;
    const layout = { height: 28, children: [child] };
    expect(projectQuireTableCellContentLayoutRange(layout, { from: 10, to: 20 }, { from: 9, to: 19 })).toBeUndefined();
    expect(projectQuireTableCellContentLayoutRange(layout, { from: 10, to: 20 }, { from: 10, to: 20 })).toBe(layout);
  });
});

/**
 * Creates a table cache prepared with deterministic measurement authority.
 *
 * @returns Prepared table product cache.
 */
function createPreparedCache(): ReturnType<typeof createQuireTableProductCache> {
  const cache = createQuireTableProductCache();
  cache.prepare({
    textMeasurer,
    textMeasurerVersion: undefined,
    font: "16px sans-serif",
    lineHeight: 28,
    textBaselineOffset: 18,
    lineBreakMode: "unicode"
  });
  return cache;
}

/**
 * Creates a stable semantic-cell cache key for one source range.
 *
 * @param sourceIdentity - Immutable source cell identity.
 * @param sourceRange - Current absolute content range.
 * @returns Cell content cache key.
 */
function createCellKey(
  sourceIdentity: object,
  sourceRange: { readonly from: number; readonly to: number }
) {
  return {
    tableId: "wordTable-0",
    semanticCellId: "cell-0-0",
    sourceIdentity,
    sourceRange,
    contentWidth: 120,
    blockHeight: 28
  };
}
