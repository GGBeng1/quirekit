import { describe, expect, it, vi } from "vitest";
import type { QuireBlockLayoutInput, QuireBlockTextFlowReflow } from "../../engine/block-types";
import { createQuireBlockShapeCache } from "./shape";
import { shiftCanvasLeafBlockLayoutBox } from "./layout-shift";
import { defineQuireLazyLayoutSignature, forwardQuireLayoutSignature } from "@quirekit/layout/block-flow";
import { readQuireLazyShiftedTextFragments } from "../../engine/lazy-text-fragments";
import type { QuireTextFragment } from "@quirekit/layout/text";

/** @returns A callback whose source positions cannot be inferred by the cache. */
function createUnknownReflow(): QuireBlockTextFlowReflow {
  return {
    lineHeight: 20,
    reflow: () => ({ textFragments: [], localFlowExclusions: [] }),
    reflowInlineReplacements: () => ({ textRuns: [], textFragments: [] })
  };
}

/** @returns One ordinary empty-text input with observable pagination policy. */
function createInput(): QuireBlockLayoutInput {
  return {
    id: "body", range: { from: 0, to: 6 }, textFragments: [],
    pagination: { breakBefore: "page", keepTogether: true, widows: 3 },
    layoutSignature: "unchanged-shape"
  };
}

describe("cached source relocation authority", () => {
  it.each(["textblock", "top-level"] as const)("misses shifted unknown callbacks in %s cache", (kind) => {
    const cache = createQuireBlockShapeCache();
    const node = {};
    const input = { ...createInput(), textFlowReflow: createUnknownReflow() };
    cache.setTextblockInput(node, 300, input.id, 1, input);
    cache.setTopLevelBlockInputs(300, undefined, undefined, [node], [0], [input]);
    const exact = kind === "textblock"
      ? cache.getTextblockInput(node, 300, input.id, 1)
      : cache.getTopLevelBlockInput(node, 0, 0, 300, undefined, undefined);
    expect(exact).toBe(input);
    const shifted = kind === "textblock"
      ? cache.getTextblockInput(node, 300, input.id, 4)
      : cache.getTopLevelBlockInput(node, 0, 3, 300, undefined, undefined);
    expect(shifted).toBeUndefined();
  });

  it("keeps pagination on a shifted ordinary input without opening fragments", () => {
    const cache = createQuireBlockShapeCache();
    const node = {};
    const input = createInput();
    let reads = 0;
    Object.defineProperty(input, "textFragments", { configurable: true, enumerable: true,
      get() { reads += 1; return []; }
    });
    cache.setTextblockInput(node, 300, input.id, 1, input);
    const shifted = cache.getTextblockInput(node, 300, input.id, 4);
    expect(shifted?.pagination).toBe(input.pagination);
    expect(reads).toBe(0);
    expect(shifted?.range).toEqual({ from: 3, to: 9 });
  });

  it("misses unknown position-bearing input fields", () => {
    const cache = createQuireBlockShapeCache();
    const node = {};
    const input = { ...createInput(), extensionRange: { from: 1, to: 4 } };
    cache.setTextblockInput(node, 300, input.id, 1, input);
    expect(cache.getTextblockInput(node, 300, input.id, 4)).toBeUndefined();
  });

  it("preserves leaf policy and uses the current input service after placement", () => {
    const input = { ...createInput(), range: { from: 3, to: 9 }, textFlowReflow: createUnknownReflow() };
    const oldService = createUnknownReflow();
    const box = { ...createInput(), rect: { x: 10, y: 20, width: 300, height: 20 }, textFlowReflow: oldService };
    const shifted = shiftCanvasLeafBlockLayoutBox(box, input, 5, 3);
    expect(shifted?.pagination).toBe(box.pagination);
    expect(shifted?.textFlowReflow).toBe(input.textFlowReflow);
    expect(shifted?.rect).toEqual({ x: 10, y: 25, width: 300, height: 20 });
    expect(box.textFlowReflow).toBe(oldService);
  });

  it("rejects unrecognized retained box authority before projection", () => {
    const input = { ...createInput(), range: { from: 3, to: 9 } };
    const box = { ...createInput(), rect: { x: 10, y: 20, width: 300, height: 20 }, extensionRange: { from: 1, to: 4 } };
    expect(shiftCanvasLeafBlockLayoutBox(box, input, 0, 3)).toBeUndefined();
  });

  it.each(["textblock", "top-level"] as const)("consumes current authority only for a moved %s input", (kind) => {
    const cache = createQuireBlockShapeCache();
    const node = {};
    const previous = createUnknownReflow();
    const current = createUnknownReflow();
    const input = Object.freeze({ ...createInput(), textFlowReflow: previous });
    cache.setTextblockInput(node, 300, input.id, 1, input);
    cache.setTopLevelBlockInputs(300, undefined, undefined, [node], [0], [input]);
    let rebinds = 0;
    const rebind = (source: QuireBlockTextFlowReflow) => {
      expect(source).toBe(previous);
      rebinds += 1;
      return current;
    };
    const read = (start: number) => kind === "textblock"
      ? cache.getTextblockInput(node, 300, input.id, start + 1, "default", rebind)
      : cache.getTopLevelBlockInput(node, 0, start, 300, undefined, undefined, "default", rebind);
    expect(read(0)).toBe(input);
    expect(rebinds).toBe(0);
    expect(read(3)?.textFlowReflow).toBe(current);
    expect(rebinds).toBe(1);
    expect(input.textFlowReflow).toBe(previous);
    expect(input.range).toEqual({ from: 0, to: 6 });
  });

  it("forwards lazy signatures again after moving a frozen source", () => {
    const input = createInput();
    let signatureReads = 0;
    defineQuireLazyLayoutSignature(input, () => { signatureReads += 1; return "exact-shape"; });
    Object.freeze(input);
    const cache = createQuireBlockShapeCache();
    const node = {};
    cache.setTextblockInput(node, 300, input.id, 1, input);
    const moved = cache.getTextblockInput(node, 300, input.id, 4)!;
    const next: { layoutSignature?: string } = {};
    forwardQuireLayoutSignature(next, moved);
    expect(signatureReads).toBe(0);
    expect(next.layoutSignature).toBe("exact-shape");
    expect(signatureReads).toBe(1);
  });

  it("composes repeated leaf range and physical moves against original lazy provenance", () => {
    let caretReads = 0;
    const fragment: QuireTextFragment = {
      id: "body:text", text: "Text", range: { from: 1, to: 5 },
      rect: { x: 10, y: 20, width: 32, height: 20 }, font: "16px sans-serif",
      baseline: 35, lineHeight: 20,
      get caretStops() { caretReads += 1; return [{ position: { pos: 1, bias: 1 as const }, localX: 0 }]; }
    };
    const fragments = [fragment];
    const box = Object.freeze({ ...createInput(), textFragments: fragments,
      rect: { x: 10, y: 20, width: 300, height: 20 } });
    const first = shiftCanvasLeafBlockLayoutBox(box, { ...createInput(), range: { from: 7, to: 13 } }, 15, 7)!;
    const second = shiftCanvasLeafBlockLayoutBox(first, { ...createInput(), range: { from: 3, to: 9 } }, -5, -4)!;
    expect(readQuireLazyShiftedTextFragments(second)).toEqual({ sourceFragments: fragments, dy: 10, rangeDelta: 3 });
    expect(second.pagination).toBe(box.pagination);
    expect(second.textFragments![0]!.range).toEqual({ from: 4, to: 8 });
    expect(second.textFragments![0]!.rect.y).toBe(30);
    expect(caretReads).toBe(0);
    expect(second.textFragments![0]!.caretStops[0]!.position.pos).toBe(4);
    expect(caretReads).toBe(1);
  });

  it("keeps supported paint transforms in the translated coordinate space", () => {
    const input = { ...createInput(), range: { from: 3, to: 9 } };
    const box = Object.freeze({ ...createInput(),
      rect: { x: 10, y: 20, width: 300, height: 20 },
      inlineLayoutRect: { x: 15, y: 20, width: 290, height: 20 },
      paintBounds: { x: 30, y: 20, width: 20, height: 300 },
      paintTransform: { a: 0, b: 1, c: -1, d: 0, e: 10, f: 20 }
    });
    const shifted = shiftCanvasLeafBlockLayoutBox(box, input, 5, 3)!;
    expect(shifted.paintTransform).toEqual({ a: 0, b: 1, c: -1, d: 0, e: 15, f: 25 });
    expect(shifted.paintBounds).toEqual({ x: 30, y: 25, width: 20, height: 300 });
    expect(shifted.inlineLayoutRect).toEqual({ x: 15, y: 25, width: 290, height: 20 });
    expect(box.paintTransform.f).toBe(20);
  });

  it("does not relocate a page-owned occurrence as an ordinary source block", () => {
    const input = createInput();
    const box = { ...input, rect: { x: 10, y: 20, width: 300, height: 20 },
      paintClipRect: { x: 0, y: 0, width: 320, height: 480 } };
    expect(shiftCanvasLeafBlockLayoutBox(box, input, 100, 0)).toBeUndefined();
  });

  it("rejects unknown symbols on both relocated input and retained box", () => {
    const unknown = Symbol("extension-owner");
    const input = { ...createInput(), [unknown]: { from: 1, to: 4 } };
    const cache = createQuireBlockShapeCache();
    const node = {};
    cache.setTextblockInput(node, 300, input.id, 1, input);
    expect(cache.getTextblockInput(node, 300, input.id, 4)).toBeUndefined();
    const box = { ...input, rect: { x: 10, y: 20, width: 300, height: 20 } };
    expect(shiftCanvasLeafBlockLayoutBox(box, createInput(), 0, 3)).toBeUndefined();
  });

  it("defers caret reads until a moved input's caret positions are consumed", () => {
    let reads = 0;
    const fragment: QuireTextFragment = {
      id: "body:text", text: "Text", range: { from: 1, to: 5 },
      rect: { x: 0, y: 0, width: 32, height: 20 }, font: "16px sans-serif",
      baseline: 15, lineHeight: 20, language: "en-US",
      get caretStops() { reads += 1; return [{ position: { pos: 1, bias: 1 as const }, localX: 0 }]; }
    };
    const input = Object.freeze({ ...createInput(), textFragments: [fragment] });
    const cache = createQuireBlockShapeCache();
    const node = {};
    cache.setTextblockInput(node, 300, input.id, 1, input);
    const moved = cache.getTextblockInput(node, 300, input.id, 4)!;
    expect(moved.textFragments![0]!.range).toEqual({ from: 4, to: 8 });
    expect(moved.textFragments![0]!.language).toBe("en-US");
    expect(reads).toBe(0);
    expect(moved.textFragments![0]!.caretStops[0]!.position.pos).toBe(4);
    expect(reads).toBe(1);
  });

  it("copies retained descriptors without constructing overwritten ones or reading frozen physical getters", () => {
    let physicalReads = 0;
    const input = createInput();
    Object.defineProperty(input, "minHeight", {
      enumerable: false, configurable: false,
      get() { physicalReads += 1; return 24; }
    });
    Object.freeze(input);
    const cache = createQuireBlockShapeCache();
    const node = {};
    cache.setTextblockInput(node, 300, input.id, 1, input);
    const bulkDescriptors = vi.spyOn(Object, "getOwnPropertyDescriptors");
    try {
      const moved = cache.getTextblockInput(node, 300, input.id, 4)!;
      expect(bulkDescriptors.mock.calls.filter(([source]) => source === input)).toHaveLength(0);
      expect(physicalReads).toBe(0);
      expect(Object.getOwnPropertyDescriptor(moved, "minHeight"))
        .toEqual(Object.getOwnPropertyDescriptor(input, "minHeight"));
      expect(Object.getOwnPropertyDescriptor(moved, "pagination"))
        .toEqual(Object.getOwnPropertyDescriptor(input, "pagination"));
      expect(moved.minHeight).toBe(24);
      expect(physicalReads).toBe(1);
    } finally {
      bulkDescriptors.mockRestore();
    }
  });
});
