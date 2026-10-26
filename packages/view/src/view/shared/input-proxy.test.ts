import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { describe, expect, it, vi } from "vitest";
import type { QuireSelectionGeometryContext } from "@quirekit/view-engine";

import { retainQuireLayoutSnapshotForTest } from "@quirekit/view-engine/test-support/layout";
import type { QuireViewRenderResult } from "../types";
import { resolveMountedInputProxyAnchorWithDiagnostics } from "./input-anchor/resolver";
import {
  readMountedInputProxyPositioningRoot,
  resolveMountedInputProxyAnchor,
  syncMountedInputProxyLayoutStyle,
  syncMountedInputProxyEditableState
} from "./input-proxy";

type SubLayoutQueryProducts = NonNullable<
  NonNullable<
    QuireViewRenderResult["layoutSnapshot"]["root"]["children"]
  >[number]["subLayoutQueryProducts"]
>;

/** Options used to create a render result fixture for input proxy tests. */
interface CreateRenderResultOptions {
  /** PM-like selection read from the layout snapshot. */
  readonly selection: {
    /** Selection start position. */
    readonly from: number;
    /** Selection end position. */
    readonly to: number;
    /** Whether the selection is collapsed. */
    readonly empty: boolean;
  };
  /** Retained nested-flow input anchors on the layout node. */
  readonly inputAnchors?: SubLayoutQueryProducts["inputAnchors"] | undefined;
  /** Retained nested-flow caret stops on the layout node. */
  readonly caretStops?: SubLayoutQueryProducts["caretStops"] | undefined;
  /** Retained nested-flow selection rectangles on the layout node. */
  readonly selectionRects?: SubLayoutQueryProducts["selectionRects"] | undefined;
  /** Rendered selection geometry retained to prove input anchoring ignores it. */
  readonly selectionGeometry?: Partial<QuireViewRenderResult["selectionGeometry"]> | undefined;
  /** Whether the fixture should include a layout child that can answer geometry queries. */
  readonly withLayoutChild?: boolean | undefined;
  /** Render-time selection context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

describe("mounted input proxy anchor", () => {
  it("does not restart native editability while focus or selection rerenders", () => {
    let readOnly = false;
    let attribute: string | null = null;
    const write = vi.fn((next: boolean) => { readOnly = next; });
    const input = {
      get readOnly() { return readOnly; },
      set readOnly(value: boolean) { write(value); },
      getAttribute: () => attribute,
      setAttribute: vi.fn((_name: string, value: string) => { attribute = value; })
    } as unknown as HTMLTextAreaElement;
    for (let i = 0; i < 50; i++) syncMountedInputProxyEditableState(input, true);
    expect(write).not.toHaveBeenCalled();
    expect(input.setAttribute).toHaveBeenCalledTimes(1);
    syncMountedInputProxyEditableState(input, false);
    syncMountedInputProxyEditableState(input, false);
    syncMountedInputProxyEditableState(input, true);
    expect(write.mock.calls).toEqual([[true], [false]]);
  });

  it("writes shared proxy geometry and typography only when values differ", () => {
    const style = {
      left: "",
      top: "",
      width: "",
      height: "",
      font: "",
      lineHeight: ""
    } as CSSStyleDeclaration;
    const inputProxy = { style } as HTMLTextAreaElement;
    const values = {
      left: "10px",
      top: "20px",
      width: "32px",
      height: "24px",
      font: "16px sans-serif",
      lineHeight: "24px"
    };

    syncMountedInputProxyLayoutStyle(inputProxy, values);
    syncMountedInputProxyLayoutStyle(inputProxy, values);

    expect(style).toEqual(values);
  });

  it("measures how much a host zoom scales the proxy's positioning root", () => {
    const rootRect = { left: 10, top: 20, width: 315, height: 630 } as DOMRect;
    const parentElement = { offsetWidth: 500, getBoundingClientRect: () => rootRect };
    expect(readMountedInputProxyPositioningRoot({ parentElement } as unknown as HTMLTextAreaElement))
      .toEqual({ positioningRootClientRect: rootRect, positioningRootScale: 0.63 });

    const collapsed = { offsetWidth: 0, getBoundingClientRect: () => rootRect };
    expect(readMountedInputProxyPositioningRoot({ parentElement: collapsed } as unknown as HTMLTextAreaElement)
      .positioningRootScale).toBe(1);
  });

  it("prefers retained input anchors over painted selection geometry", () => {
    const result = resolveMountedInputProxyAnchorWithDiagnostics(
      createRenderResult({
        selection: { from: 6, to: 6, empty: true },
        inputAnchors: [
          {
            position: { pos: 6, bias: 0 },
            rect: { x: 35, y: 25, width: 1, height: 24 },
            role: "caret"
          }
        ],
        selectionGeometry: {
          carets: [
            {
              position: { pos: 6, bias: 0 },
              rect: { x: 100, y: 20, width: 1, height: 80 }
            }
          ]
        }
      })
    );

    expect(result.rect).toEqual({ x: 35, y: 25, width: 1, height: 24 });
    expect(result.diagnostics.inputAnchor).toEqual(expect.objectContaining({
      source: "sub-layout-input-anchor",
      position: 6,
      role: "caret"
    }));
    expect(result.diagnostics.migrationFallbacks).toBeUndefined();
  });

  it("reports retained query-product owner facts for input anchors", () => {
    const queryOwner: QuireLayoutQueryProductOwner = {
      sourceRootId: "table-cell:semantic-a:cell-a",
      sourceFragmentId: "cell-a#p2",
      coordinateSpace: "document",
      sourceCoordinateSpace: "table-cell-local",
      coordinatePath: {
        spaces: ["table-cell-local", "document"],
        steps: [
          {
            from: "table-cell-local",
            to: "document",
            input: { space: "table-cell-local", x: 0, y: 0 },
            output: { space: "document", x: 30, y: 20 },
            scaleX: 1,
            scaleY: 1
          }
        ]
      }
    };
    const result = resolveMountedInputProxyAnchorWithDiagnostics(
      createRenderResult({
        selection: { from: 6, to: 6, empty: true },
        inputAnchors: [
          {
            position: { pos: 6, bias: 0 },
            rect: { x: 35, y: 25, width: 1, height: 24 },
            role: "caret",
            queryOwner
          }
        ]
      })
    );

    expect(result.diagnostics.queryOwner).toBe(queryOwner);
    expect(result.queryOwner).toBe(queryOwner);
    expect(result.viewRegion).toBe(queryOwner.region);
    expect(result.diagnostics.queryOwner?.coordinatePath?.spaces).toEqual([
      "table-cell-local",
      "document"
    ]);
  });

  it("uses painted selection geometry to choose repeated retained input anchors", () => {
    const result = resolveMountedInputProxyAnchorWithDiagnostics(
      createRenderResult({
        selection: { from: 6, to: 6, empty: true },
        inputAnchors: [
          {
            position: { pos: 6, bias: 1 },
            rect: { x: 35, y: 24, width: 1, height: 18 },
            role: "caret"
          },
          {
            position: { pos: 6, bias: 1 },
            rect: { x: 173, y: 5960, width: 1, height: 24 },
            role: "caret"
          }
        ],
        caretStops: [
          {
            textFragmentId: "caret-line-24",
            position: { pos: 6, bias: 1 },
            rect: { x: 35, y: 24, width: 1, height: 18 }
          }
        ],
        selectionGeometry: {
          carets: [
            {
              position: { pos: 6, bias: 1 },
              rect: { x: 173, y: 5960, width: 1, height: 24 }
            }
          ]
        }
      })
    );

    expect(result.rect).toEqual({ x: 173, y: 5960, width: 1, height: 24 });
    expect(result.diagnostics.inputAnchor).toEqual(expect.objectContaining({
      source: "sub-layout-input-anchor",
      position: 6,
      role: "caret"
    }));
  });

  it("falls back to interaction caret geometry when no input anchor covers the selection", () => {
    const result = resolveMountedInputProxyAnchorWithDiagnostics(
      createRenderResult({
        selection: { from: 6, to: 6, empty: true },
        inputAnchors: [],
        caretStops: [
          {
            textFragmentId: "caret-line-24",
            position: { pos: 6, bias: 0 },
            rect: { x: 72, y: 24, width: 1, height: 18 }
          }
        ],
        selectionGeometry: {
          carets: [
            {
              position: { pos: 6, bias: 0 },
              rect: { x: 100, y: 20, width: 1, height: 80 }
            }
          ]
        }
      })
    );

    expect(result.rect).toEqual({ x: 72, y: 24, width: 1, height: 18 });
    expect(result.diagnostics.inputAnchor).toEqual(expect.objectContaining({
      source: "layout-caret",
      position: 6,
      role: "caret"
    }));
    expect(result.diagnostics.migrationFallbacks).toContainEqual(
      expect.objectContaining({
        kind: "layout-snapshot-geometry-adapter",
        source: "layout-caret"
      })
    );
    expect(result.diagnostics.migrationFallbacks ?? []).not.toContainEqual(
      expect.objectContaining({ kind: "selection-geometry-anchor" })
    );
  });

  it("uses render-time selection context for repeated caret input anchors", () => {
    const lowerOwner = createInputProxyQueryOwner("cell#p5");
    const result = resolveMountedInputProxyAnchorWithDiagnostics(
      createRenderResult({
        selection: { from: 6, to: 6, empty: true },
        inputAnchors: [],
        caretStops: [
          {
            textFragmentId: "caret-line-24",
            position: { pos: 6, bias: 1 },
            rect: { x: 72, y: 24, width: 1, height: 18 },
            queryOwner: createInputProxyQueryOwner("cell#p3")
          },
          {
            textFragmentId: "caret-line-5960",
            position: { pos: 6, bias: 1 },
            rect: { x: 173, y: 5960, width: 1, height: 24 },
            queryOwner: lowerOwner
          }
        ],
        selectionContext: {
          queryOwner: lowerOwner,
          referenceRect: { x: 173, y: 5960, width: 1, height: 24 }
        }
      })
    );

    expect(result.rect).toEqual({ x: 173, y: 5960, width: 1, height: 24 });
    expect(result.diagnostics.queryOwner).toBe(lowerOwner);
    expect(result.diagnostics.inputAnchor).toEqual(expect.objectContaining({
      source: "layout-caret",
      position: 6,
      role: "caret"
    }));
  });

  it("ignores retained input anchors from a different visible fragment", () => {
    const result = resolveMountedInputProxyAnchorWithDiagnostics(
      createRenderResult({
        selection: { from: 6, to: 6, empty: true },
        inputAnchors: [
          {
            position: { pos: 6, bias: 0 },
            rect: { x: 72, y: 220, width: 1, height: 18 },
            role: "caret"
          }
        ],
        caretStops: [
          {
            textFragmentId: "caret-line-24",
            position: { pos: 6, bias: 0 },
            rect: { x: 72, y: 24, width: 1, height: 18 }
          }
        ]
      })
    );

    expect(result.rect).toEqual({ x: 72, y: 24, width: 1, height: 18 });
    expect(result.diagnostics.inputAnchor).toEqual(expect.objectContaining({
      source: "layout-caret",
      position: 6,
      role: "caret"
    }));
    expect(result.diagnostics.migrationFallbacks ?? []).not.toContainEqual(
      expect.objectContaining({ kind: "selection-geometry-anchor" })
    );
  });

  it("falls back to interaction selection rectangles for expanded selections", () => {
    const result = resolveMountedInputProxyAnchorWithDiagnostics(
      createRenderResult({
        selection: { from: 4, to: 8, empty: false },
        inputAnchors: [],
        caretStops: [
          {
            textFragmentId: "text-fragment-0",
            position: { pos: 4, bias: 0 },
            rect: { x: 40, y: 30, width: 1, height: 18 }
          },
          {
            textFragmentId: "text-fragment-0",
            position: { pos: 8, bias: 0 },
            rect: { x: 90, y: 30, width: 1, height: 18 }
          }
        ],
        selectionRects: [
          {
            textFragmentId: "text-fragment-0",
            range: { from: 0, to: 20 },
            rect: { x: 20, y: 30, width: 120, height: 18 }
          }
        ],
        selectionGeometry: {
          ranges: [
            {
              range: { from: 4, to: 8 },
              rect: { x: 100, y: 20, width: 1, height: 80 }
            }
          ]
        }
      })
    );

    expect(result.rect).toEqual({ x: 40, y: 30, width: 50, height: 18 });
    expect(result.diagnostics.inputAnchor).toEqual(expect.objectContaining({
      source: "layout-selection-rects",
      position: 4,
      role: "selection"
    }));
    expect(result.diagnostics.migrationFallbacks).toContainEqual(
      expect.objectContaining({
        kind: "layout-snapshot-geometry-adapter",
        source: "layout-selection-rects"
      })
    );
    expect(result.diagnostics.migrationFallbacks ?? []).not.toContainEqual(
      expect.objectContaining({ kind: "selection-geometry-anchor" })
    );
  });

  it("reports viewport fallback diagnostics when no anchor geometry exists", () => {
    const result = resolveMountedInputProxyAnchorWithDiagnostics(
      createRenderResult({
        selection: { from: 6, to: 6, empty: true },
        inputAnchors: [],
        withLayoutChild: false
      })
    );

    expect(result.rect).toEqual({ x: 10, y: 20, width: 300, height: 200 });
    expect(result.diagnostics.inputAnchor).toEqual(expect.objectContaining({
      source: "viewport-fallback",
      position: 6,
      role: "caret"
    }));
    expect(result.diagnostics.migrationFallbacks).toContainEqual(
      expect.objectContaining({ kind: "input-anchor-viewport-fallback" })
    );
  });

  it("returns only the rectangle for callers that do not need diagnostics", () => {
    expect(resolveMountedInputProxyAnchor(
      createRenderResult({
        selection: { from: 6, to: 6, empty: true },
        inputAnchors: [],
        caretStops: [
          {
            textFragmentId: "caret-line-24",
            position: { pos: 6, bias: 0 },
            rect: { x: 72, y: 24, width: 1, height: 18 }
          }
        ]
      })
    )).toEqual({ x: 72, y: 24, width: 1, height: 18 });
  });
});

/**
 * Creates a render result fixture with only fields needed by input proxy tests.
 *
 * @param options - Selection, optional retained query products, and rendered geometry.
 * @returns Render result fixture for mounted input proxy anchor tests.
 */
function createRenderResult(options: CreateRenderResultOptions): QuireViewRenderResult {
  const layoutChildren = options.withLayoutChild === false
    ? []
    : [
        {
          id: "wordTable-0:layout",
          kind: "block" as const,
          range: { from: 0, to: 20 },
          rect: { x: 10, y: 20, width: 300, height: 80 },
          subLayoutQueryProducts: {
            selectionRects: options.selectionRects ?? [],
            caretStops: options.caretStops ?? [],
            hitTargets: [],
            inputAnchors: options.inputAnchors ?? []
          },
          children: []
        }
      ];
  const layoutSnapshot = retainQuireLayoutSnapshotForTest({
    state: { pm: { selection: options.selection } } as QuireViewRenderResult["layoutSnapshot"]["state"],
    documentRect: { x: 10, y: 20, width: 300, height: 80 },
    viewportRect: { x: 10, y: 20, width: 300, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 20 },
      rect: { x: 10, y: 20, width: 300, height: 80 },
      children: layoutChildren
    }
  });

  return {
    layoutSnapshot,
    interactionSnapshot: layoutSnapshot,
    ...(options.selectionContext === undefined
      ? {}
      : { selectionContext: options.selectionContext }),
    selectionGeometry: {
      carets: options.selectionGeometry?.carets ?? [],
      ranges: options.selectionGeometry?.ranges ?? []
    }
  } as unknown as QuireViewRenderResult;
}

/**
 * Creates query-owner identity for mounted input proxy fixtures.
 *
 * @param visualInstanceId - Visual instance represented by the query owner.
 * @returns Query-product owner identity.
 */
function createInputProxyQueryOwner(
  visualInstanceId: string
): QuireLayoutQueryProductOwner {
  return {
    sourceRootId: "table-cell:semantic:r0:c0:g0:1",
    sourceFragmentId: `${visualInstanceId}:line`,
    coordinateSpace: "document",
    sourceCoordinateSpace: "table-cell-local",
    region: {
      rootId: { value: "root:table-cell:semantic:r0:c0:g0:1" },
      regionId: { value: "region:table-cell:semantic:r0:c0:g0:1" },
      kind: "table-cell",
      visualInstanceId
    }
  };
}
