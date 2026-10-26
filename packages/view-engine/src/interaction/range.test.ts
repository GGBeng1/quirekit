import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { Schema, type Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireLayoutNode } from "../layout";
import type { QuireLayoutSnapshot } from "../editor-layout";
import { describe, expect, it } from "vitest";
import {
  resolveQuireLineSelectionRange,
  resolveQuireTextblockSelectionRange,
  resolveQuireWordSelectionRange
} from "./range";

describe("canvas selection range resolution", () => {
  it("expands a hit position to a word-like range inside one text fragment", () => {
    expect(
      resolveQuireWordSelectionRange({
        snapshot: createRangeSnapshot(),
        position: { pos: 3, bias: 0 }
      })
    ).toEqual({ from: 1, to: 6 });
  });

  it("expands a CJK hit position to the adjacent CJK word run", () => {
    expect(
      resolveQuireWordSelectionRange({
        snapshot: createRangeSnapshot(),
        position: { pos: 10, bias: 0 }
      })
    ).toEqual({ from: 8, to: 10 });
  });

  it("expands a hit position to the complete owning textblock", () => {
    expect(
      resolveQuireTextblockSelectionRange({
        doc: createTextblockDocument(),
        position: { pos: 4, bias: 0 }
      })
    ).toEqual({ from: 1, to: 12 });
  });

  it("keeps visual-line ranges available for line-boundary navigation", () => {
    expect(
      resolveQuireLineSelectionRange({
        snapshot: createRangeSnapshot(),
        position: { pos: 14, bias: 0 }
      })
    ).toEqual({ from: 12, to: 18 });
  });

  it("resolves visual-line navigation through retained sub-layout context", () => {
    const lowerOwner = createQueryOwner("cell#p5:line", "cell#p5");

    expect(
      resolveQuireLineSelectionRange({
        snapshot: createRepeatedSubLayoutRangeSnapshot(lowerOwner),
        position: { pos: 3, bias: 1 },
        selectionContext: {
          queryOwner: lowerOwner,
          referenceRect: { x: 0, y: 120, width: 80, height: 20 }
        }
      })
    ).toEqual({ from: 1, to: 8 });
  });

  it("returns null when the position is not in measured text", () => {
    expect(
      resolveQuireWordSelectionRange({
        snapshot: createRangeSnapshot(),
        position: { pos: 99, bias: 0 }
      })
    ).toBeNull();
  });
});

/**
 * Creates a snapshot with two visual lines and mixed Latin/CJK content.
 *
 * @returns Canvas layout snapshot for range helper tests.
 */
function createRangeSnapshot(): QuireLayoutSnapshot {
  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: { x: 10, y: 20, width: 240, height: 48 },
    viewportRect: { x: 10, y: 20, width: 240, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 20 },
      rect: { x: 10, y: 20, width: 240, height: 48 },
      children: [
        {
          id: "paragraph-0",
          kind: "block",
          range: { from: 0, to: 20 },
          rect: { x: 10, y: 20, width: 240, height: 48 },
          textFragments: [
            {
              id: "paragraph-0:text-0",
              text: "Hello, 世界",
              range: { from: 1, to: 10 },
              rect: { x: 10, y: 20, width: 90, height: 24 },
              font: "16px sans-serif",
              lineHeight: 24,
              baseline: 38,
              caretStops: []
            },
            {
              id: "paragraph-0:text-1",
              text: "again",
              range: { from: 12, to: 17 },
              rect: { x: 10, y: 44, width: 50, height: 24 },
              font: "16px sans-serif",
              lineHeight: 24,
              baseline: 62,
              caretStops: []
            },
            {
              id: "paragraph-0:text-2",
              text: "!",
              range: { from: 17, to: 18 },
              rect: { x: 60, y: 44, width: 10, height: 24 },
              font: "16px sans-serif",
              lineHeight: 24,
              baseline: 62,
              caretStops: []
            }
          ],
          children: []
        }
      ]
    }
  };
}

/**
 * Creates a canonical textblock document independent of visual line wrapping.
 *
 * @returns Document with one `hello world` paragraph.
 */
function createTextblockDocument(): ProseMirrorNode {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "inline*", group: "block" },
      text: { group: "inline" }
    }
  });

  return schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("hello world"))
  ]);
}

/**
 * Creates repeated retained line rectangles for line-navigation tests.
 *
 * @param lowerOwner - Query owner attached to the lower repeated instance.
 * @returns Layout snapshot with repeated sub-layout selection products.
 */
function createRepeatedSubLayoutRangeSnapshot(
  lowerOwner: QuireLayoutQueryProductOwner
): QuireLayoutSnapshot {
  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 120, height: 160 },
    viewportRect: { x: 0, y: 0, width: 120, height: 160 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 10 },
      rect: { x: 0, y: 0, width: 120, height: 160 },
      children: [
        createSubLayoutRangeNode("upper", 0, [{
          textFragmentId: "text-fragment-0",
          range: { from: 1, to: 4 },
          rect: { x: 0, y: 0, width: 40, height: 20 },
          queryOwner: createQueryOwner("cell#p3:line", "cell#p3")
        }]),
        createSubLayoutRangeNode("lower", 120, [
          {
            textFragmentId: "text-fragment-1",
            range: { from: 1, to: 4 },
            rect: { x: 0, y: 120, width: 40, height: 20 },
            queryOwner: lowerOwner
          },
          {
            textFragmentId: "text-fragment-2",
            range: { from: 4, to: 8 },
            rect: { x: 40, y: 120, width: 40, height: 20 },
            queryOwner: lowerOwner
          }
        ])
      ]
    }
  };
}

/**
 * Creates a layout node carrying retained sub-layout selection rectangles.
 *
 * @param id - Node id suffix.
 * @param y - Node y coordinate.
 * @param selectionRects - Retained selection rectangles to expose.
 * @returns Layout node for range resolver tests.
 */
function createSubLayoutRangeNode(
  id: string,
  y: number,
  selectionRects: NonNullable<QuireLayoutNode["subLayoutQueryProducts"]>["selectionRects"]
): QuireLayoutNode {
  return {
    id,
    kind: "block",
    range: { from: 0, to: 10 },
    rect: { x: 0, y, width: 120, height: 40 },
    subLayoutQueryProducts: {
      selectionRects,
      caretStops: [],
      hitTargets: [],
      inputAnchors: []
    },
    children: []
  };
}

/**
 * Creates a retained query owner for one visual instance.
 *
 * @param sourceFragmentId - Stable source-fragment id.
 * @param visualInstanceId - Visual instance id represented by the owner.
 * @returns Query owner for retained test products.
 */
function createQueryOwner(
  sourceFragmentId: string,
  visualInstanceId: string
): QuireLayoutQueryProductOwner {
  return {
    sourceRootId: "body",
    sourceFragmentId,
    coordinateSpace: "document",
    region: {
      rootId: { value: "body" },
      regionId: { value: visualInstanceId },
      kind: "table-cell",
      visualInstanceId
    }
  };
}
