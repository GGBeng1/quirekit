import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireLayoutNode } from "../layout";
import type { QuireLayoutSnapshot } from "../editor-layout";
import type { QuireTextCaretStop } from "@quirekit/layout/text";
import { describe, expect, it } from "vitest";
import { resolveQuireVerticalCaretPosition } from "./vertical-navigation";

describe("canvas vertical caret navigation", () => {
  it.each(["paint-only", "source-geometry"] as const)("skips %s caret geometry between body lines", interactionRole => {
    const snapshot = createWrappedTextSnapshot();
    const helper = createSubLayoutCaretNode("inactive-footer", 40, [{
      textFragmentId: "inactive-footer-text", position: { pos: 100, bias: 0 },
      rect: { x: 20, y: 40, width: 1, height: 2 }, lineBaseline: 41
    }]);
    const root = { ...snapshot.root, children: [
      ...snapshot.root.children!, { ...helper, interactionRole }
    ] };
    expect(resolveQuireVerticalCaretPosition({ snapshot: { ...snapshot, root },
      position: { pos: 2, bias: 0 }, direction: "down" })).toEqual({ pos: 5, bias: 0 });
  });
  it.each(["header", "footer", "footnote", "endnote"] as const)(
    "keeps body navigation out of editable %s geometry", kind => {
      const snapshot = createWrappedTextSnapshot();
      const story = createStoryCaretNode(kind, 36, 100, "page:0");
      const root = { ...snapshot.root, children: [...snapshot.root.children!, story] };
      const options = { snapshot: { ...snapshot, root }, position: { pos: 2, bias: 0 as const } };
      expect(resolveQuireVerticalCaretPosition({ ...options, direction: "down" })).toEqual({ pos: 5, bias: 0 });
      expect(resolveQuireVerticalCaretPosition({ ...options, position: { pos: 5, bias: 0 }, direction: "up" }))
        .toEqual({ pos: 2, bias: 0 });
    }
  );

  it("keeps repeated header navigation in its current occurrence, including nested cells", () => {
    const snapshot = createWrappedTextSnapshot();
    const first = createStoryCaretNode("header", 0, 100, "page:0");
    const second = createStoryCaretNode("header", 80, 100, "page:1");
    const nested = createSubLayoutCaretNode("cell", 24, [{
      textFragmentId: "cell-line", position: { pos: 101, bias: 0 },
      rect: { x: 20, y: 24, width: 1, height: 20 }, lineBaseline: 42,
      queryOwner: createQueryOwner("header-cell-line", "header-cell")
    }]);
    const root = { ...snapshot.root, children: [
      { ...first, children: [nested] }, ...snapshot.root.children!, second
    ] };
    const options = { snapshot: { ...snapshot, root }, direction: "down" as const };
    expect(resolveQuireVerticalCaretPosition({ ...options, position: { pos: 100, bias: 0 } }))
      .toEqual({ pos: 101, bias: 0 });
    expect(resolveQuireVerticalCaretPosition({ ...options, position: { pos: 101, bias: 0 } })).toBeNull();
    expect(resolveQuireVerticalCaretPosition({ ...options, position: { pos: 100, bias: 0 },
      selectionContext: { viewRegion: second.layoutOwner!.region } })).toBeNull();
  });

  it("moves a caret down to the nearest caret stop on the next visual line", () => {
    expect(
      resolveQuireVerticalCaretPosition({
        snapshot: createWrappedTextSnapshot(),
        position: { pos: 2, bias: 0 },
        direction: "down"
      })
    ).toEqual({ pos: 5, bias: 0 });
  });

  it("moves a caret up to the nearest caret stop on the previous visual line", () => {
    expect(
      resolveQuireVerticalCaretPosition({
        snapshot: createWrappedTextSnapshot(),
        position: { pos: 6, bias: 0 },
        direction: "up"
      })
    ).toEqual({ pos: 3, bias: 0 });
  });

  it("lands on an empty line and moves off it, instead of skipping it", () => {
    const snapshot = createSnapshotWithEmptyMiddleLine();

    // Down from the first line stops on the empty line's caret anchor.
    expect(
      resolveQuireVerticalCaretPosition({ snapshot, position: { pos: 1, bias: 1 }, direction: "down" })
    ).toEqual({ pos: 4, bias: 1 });
    // Down again continues to the third line, so the empty line is not a trap.
    expect(
      resolveQuireVerticalCaretPosition({ snapshot, position: { pos: 4, bias: 1 }, direction: "down" })
    ).toEqual({ pos: 6, bias: 1 });
    // Up from the empty line returns to the first line.
    expect(
      resolveQuireVerticalCaretPosition({ snapshot, position: { pos: 4, bias: 1 }, direction: "up" })
    ).toEqual({ pos: 1, bias: 1 });
  });

  it("treats mixed-size runs on one baseline as one visual line", () => {
    const snapshot = createMixedRunLineSnapshot();

    // The smaller run sits lower inside the same line. Up must cross the shared
    // baseline instead of walking into the taller sibling run.
    expect(
      resolveQuireVerticalCaretPosition({
        snapshot,
        position: { pos: 6, bias: 0 },
        direction: "up"
      })
    ).toEqual({ pos: 2, bias: 0 });

    // The taller run's rectangle center is above its smaller sibling. Down must
    // still cross to the next visual line instead of stopping in that sibling.
    expect(
      resolveQuireVerticalCaretPosition({
        snapshot,
        position: { pos: 4, bias: 0 },
        direction: "down"
      })
    ).toEqual({ pos: 12, bias: 0 });
  });

  it("uses retained visual context instead of another repeated instance", () => {
    const lowerOwner = createQueryOwner("cell#p5:line-1", "cell#p5");

    expect(
      resolveQuireVerticalCaretPosition({
        snapshot: createRepeatedSubLayoutSnapshot(lowerOwner),
        position: { pos: 1, bias: 1 },
        direction: "down",
        selectionContext: {
          queryOwner: lowerOwner,
          referenceRect: { x: 0, y: 120, width: 1, height: 20 }
        }
      })
    ).toBeNull();
  });
});

/**
 * Creates a snapshot of three stacked lines whose middle line is an empty
 * paragraph carrying one zero-width caret-anchor fragment.
 *
 * @returns Canvas layout snapshot with a navigable empty middle line.
 */
function createSnapshotWithEmptyMiddleLine(): QuireLayoutSnapshot {
  const line = (
    id: string,
    y: number,
    text: string,
    range: { from: number; to: number },
    caretStops: readonly QuireTextCaretStop[]
  ): QuireLayoutNode => ({
    id,
    kind: "block",
    range,
    rect: { x: 0, y, width: 30, height: 24 },
    textFragments: [
      { id: `${id}:text-0`, text, range, rect: { x: 0, y, width: 30, height: 24 }, font: "16px sans-serif", lineHeight: 24, baseline: y + 18, caretStops }
    ],
    children: []
  });

  return {
    state: { pm: { selection: { from: 1, to: 1, empty: true } } } as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 30, height: 72 },
    viewportRect: { x: 0, y: 0, width: 30, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 8 },
      rect: { x: 0, y: 0, width: 30, height: 72 },
      children: [
        line("paragraph-0", 0, "a", { from: 1, to: 2 }, [
          { position: { pos: 1, bias: 1 }, localX: 0 },
          { position: { pos: 2, bias: -1 }, localX: 10 }
        ]),
        line("paragraph-1", 24, "", { from: 4, to: 4 }, [{ position: { pos: 4, bias: 1 }, localX: 0 }]),
        line("paragraph-2", 48, "b", { from: 6, to: 7 }, [
          { position: { pos: 6, bias: 1 }, localX: 0 },
          { position: { pos: 7, bias: -1 }, localX: 10 }
        ])
      ]
    }
  };
}

/**
 * Creates three visual lines where the middle line contains tall and short
 * runs sharing one baseline but exposing different insertion-caret rectangles.
 *
 * @returns Layout snapshot that distinguishes run geometry from line identity.
 */
function createMixedRunLineSnapshot(): QuireLayoutSnapshot {
  return {
    state: { pm: { selection: { from: 4, to: 4, empty: true } } } as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 120, height: 82 },
    viewportRect: { x: 0, y: 0, width: 120, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 14 },
      rect: { x: 0, y: 0, width: 120, height: 82 },
      children: [
        {
          id: "paragraph-0",
          kind: "block",
          range: { from: 1, to: 3 },
          rect: { x: 0, y: 0, width: 120, height: 24 },
          textFragments: [{
            id: "paragraph-0:text-0",
            text: "above",
            range: { from: 1, to: 3 },
            rect: { x: 0, y: 0, width: 80, height: 24 },
            font: "16px sans-serif",
            lineHeight: 24,
            baseline: 18,
            runAscent: 15,
            runDescent: 5,
            caretStops: [
              { position: { pos: 1, bias: 1 }, localX: 0 },
              { position: { pos: 2, bias: 0 }, localX: 40 },
              { position: { pos: 3, bias: -1 }, localX: 80 }
            ]
          }],
          children: []
        },
        {
          id: "paragraph-1",
          kind: "block",
          range: { from: 4, to: 10 },
          rect: { x: 0, y: 24, width: 120, height: 34 },
          textFragments: [
            {
              id: "paragraph-1:text-0",
              text: "18",
              range: { from: 4, to: 5 },
              rect: { x: 0, y: 24, width: 40, height: 34 },
              font: "28px sans-serif",
              lineHeight: 34,
              baseline: 50,
              runAscent: 26,
              runDescent: 8,
              caretStops: [
                { position: { pos: 4, bias: 0 }, localX: 40 },
                { position: { pos: 5, bias: -1 }, localX: 80 }
              ]
            },
            {
              id: "paragraph-1:text-1",
              text: "blue",
              range: { from: 5, to: 10 },
              rect: { x: 40, y: 24, width: 60, height: 34 },
              font: "16px sans-serif",
              lineHeight: 34,
              baseline: 50,
              runAscent: 14,
              runDescent: 4,
              caretStops: [
                { position: { pos: 5, bias: 1 }, localX: 0 },
                { position: { pos: 6, bias: 0 }, localX: 0 },
                { position: { pos: 10, bias: -1 }, localX: 60 }
              ]
            }
          ],
          children: []
        },
        {
          id: "paragraph-2",
          kind: "block",
          range: { from: 11, to: 13 },
          rect: { x: 0, y: 58, width: 120, height: 24 },
          textFragments: [{
            id: "paragraph-2:text-0",
            text: "below",
            range: { from: 11, to: 13 },
            rect: { x: 0, y: 58, width: 80, height: 24 },
            font: "16px sans-serif",
            lineHeight: 24,
            baseline: 76,
            runAscent: 15,
            runDescent: 5,
            caretStops: [
              { position: { pos: 11, bias: 1 }, localX: 0 },
              { position: { pos: 12, bias: 0 }, localX: 40 },
              { position: { pos: 13, bias: -1 }, localX: 80 }
            ]
          }],
          children: []
        }
      ]
    }
  };
}

/**
 * Creates a layout snapshot with one paragraph wrapped across two visual lines.
 *
 * @returns Canvas layout snapshot containing deterministic caret stops.
 */
function createWrappedTextSnapshot(): QuireLayoutSnapshot {
  return {
    state: { pm: { selection: { from: 2, to: 2, empty: true } } } as QuireLayoutSnapshot["state"],
    documentRect: { x: 10, y: 20, width: 30, height: 48 },
    viewportRect: { x: 10, y: 20, width: 30, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 8 },
      rect: { x: 10, y: 20, width: 30, height: 48 },
      children: [
        {
          id: "paragraph-0",
          kind: "block",
          range: { from: 0, to: 8 },
          rect: { x: 10, y: 20, width: 30, height: 48 },
          textFragments: [
            {
              id: "paragraph-0:text-0",
              text: "abc",
              range: { from: 1, to: 4 },
              rect: { x: 10, y: 20, width: 30, height: 24 },
              font: "16px sans-serif",
              lineHeight: 24,
              baseline: 38,
              caretStops: [
                { position: { pos: 1, bias: 1 }, localX: 0 },
                { position: { pos: 2, bias: 0 }, localX: 10 },
                { position: { pos: 3, bias: 0 }, localX: 20 },
                { position: { pos: 4, bias: -1 }, localX: 30 }
              ]
            },
            {
              id: "paragraph-0:text-1",
              text: "def",
              range: { from: 4, to: 7 },
              rect: { x: 10, y: 44, width: 30, height: 24 },
              font: "16px sans-serif",
              lineHeight: 24,
              baseline: 62,
              caretStops: [
                { position: { pos: 4, bias: 1 }, localX: 0 },
                { position: { pos: 5, bias: 0 }, localX: 10 },
                { position: { pos: 6, bias: 0 }, localX: 20 },
                { position: { pos: 7, bias: -1 }, localX: 30 }
              ]
            }
          ],
          children: []
        }
      ]
    }
  };
}

/**
 * Creates repeated retained caret products where only the upper instance has a
 * following line for the same logical document position.
 *
 * @param lowerOwner - Query owner attached to the lower repeated instance.
 * @returns Layout snapshot with upper and lower visual instances.
 */
function createRepeatedSubLayoutSnapshot(
  lowerOwner: QuireLayoutQueryProductOwner
): QuireLayoutSnapshot {
  const upperOwner = createQueryOwner("cell#p3:line-1", "cell#p3");

  return {
    state: { pm: { selection: { from: 1, to: 1, empty: true } } } as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 120, height: 160 },
    viewportRect: { x: 0, y: 0, width: 120, height: 160 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 8 },
      rect: { x: 0, y: 0, width: 120, height: 160 },
      children: [
        createSubLayoutCaretNode("upper", 0, [
          {
            textFragmentId: "caret-line-0",
            position: { pos: 1, bias: 1 },
            rect: { x: 0, y: 0, width: 1, height: 20 },
            queryOwner: upperOwner
          },
          {
            textFragmentId: "caret-line-24",
            position: { pos: 3, bias: 1 },
            rect: { x: 0, y: 24, width: 1, height: 20 },
            queryOwner: createQueryOwner("cell#p3:line-2", "cell#p3")
          }
        ]),
        createSubLayoutCaretNode("lower", 120, [
          {
            textFragmentId: "caret-line-120",
            position: { pos: 1, bias: 1 },
            rect: { x: 0, y: 120, width: 1, height: 20 },
            queryOwner: lowerOwner
          }
        ])
      ]
    }
  };
}

/**
 * Creates a layout node carrying retained sub-layout caret stops.
 *
 * @param id - Node id suffix.
 * @param y - Node y coordinate.
 * @param caretStops - Retained caret stops to expose.
 * @returns Layout node for vertical navigation tests.
 */
function createSubLayoutCaretNode(
  id: string,
  y: number,
  caretStops: NonNullable<QuireLayoutNode["subLayoutQueryProducts"]>["caretStops"]
): QuireLayoutNode {
  return {
    id,
    kind: "block",
    range: { from: 0, to: 8 },
    rect: { x: 0, y, width: 120, height: 40 },
    subLayoutQueryProducts: {
      selectionRects: [],
      hitTargets: [],
      caretStops,
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

/**
 * Creates raw editable auxiliary-story geometry, without a pointer-transparent role.
 * @param kind - Independent story kind.
 * @param y - Visual top coordinate.
 * @param position - Source caret position.
 * @param instance - Repeated page occurrence.
 * @returns Ordinary node whose child inherits its story boundary.
 */
function createStoryCaretNode(
  kind: "header" | "footer" | "footnote" | "endnote",
  y: number,
  position: number,
  instance: string
): QuireLayoutNode {
  const range = { from: position, to: position + 1 };
  const rect = { x: 20, y, width: 30, height: 20 };
  return {
    id: `${kind}:${instance}`, kind: "block", range, rect,
    layoutOwner: {
      region: { rootId: { value: kind }, regionId: { value: kind }, kind, visualInstanceId: instance },
      source: { sourceId: kind, range },
      capabilities: { editable: true, selectable: true, focusable: true,
        copyable: true, commandable: true, accessible: true }
    },
    textFragments: [{ id: `${kind}:text`, text: "x", range, rect,
      font: "16px sans-serif", lineHeight: 20, baseline: y + 18,
      caretStops: [{ position: { pos: position, bias: 0 }, localX: 0 }] }],
    children: []
  };
}
