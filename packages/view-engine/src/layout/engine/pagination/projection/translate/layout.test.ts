import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { describe, expect, it, vi } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireChildFlowRoot } from "@quirekit/layout/child-flow";
import type {
  QuireHitTarget,
  QuireLayoutContainer
} from "../../../types";
import type {
  QuireLayoutBoxSubLayoutFragment,
  QuireSubLayoutProjection,
  QuireSubLayoutRootViewProducts
} from "../../../sub-layout";
import { createQuireTestSubLayoutProjection } from "../../../../../../test-support/layout/sub-layout-projection";
import type { QuirePageBodyProjection } from "../types";
import { translateQuireLayoutBox } from "./layout";

describe("page projection layout box translation", () => {
  it("translates an outer page clip with the complete drawing occurrence", () => {
    const pageClip = { x: 0, y: 0, width: 320, height: 480 };
    const box = { ...createFloatingTableContainer(), paintClipRect: pageClip };
    expect(translateQuireLayoutBox(box, { dx: 10, dy: 30 }).paintClipRect)
      .toEqual({ ...pageClip, x: 10, y: 30 });
    expect(box.paintClipRect).toBe(pageClip);
    const leaf = { id: "drawing-leaf", rect: box.rect, range: box.range, paintClipRect: pageClip };
    expect(translateQuireLayoutBox(leaf, { dx: -10, dy: 40 }).paintClipRect)
      .toEqual({ ...pageClip, x: -10, y: 40 });
  });

  it.each([false, true])("keeps ordinary zero translation lazy with floating descendant=%s", nested => {
    const table = createFloatingTableContainer();
    const tableChildren = table.children;
    const readTableChildren = vi.fn(() => tableChildren);
    Object.defineProperty(table, "children", { enumerable: true, get: readTableChildren });
    const readFragments = vi.fn(() => [createTextFragment()]);
    Object.defineProperty(table, "textFragments", { enumerable: true, get: readFragments });
    const readSectionChildren = vi.fn(() => [table]);
    const box: QuireLayoutContainer = nested ? {
      id: "section", range: table.range, rect: table.rect,
      get children() { return readSectionChildren(); }
    } : table;

    const translated = translateQuireLayoutBox(box, { dx: 0, dy: 0 });

    expect.soft(readSectionChildren).not.toHaveBeenCalled();
    expect.soft(readTableChildren).not.toHaveBeenCalled();
    expect.soft(readFragments).not.toHaveBeenCalled();
    expect(translated).toBe(box);
  });

  it("keeps nonzero ordinary floating table geometry and paint translation", () => {
    const box = createFloatingTableContainer();
    const translated = translateQuireLayoutBox(box, { dx: 10, dy: 30 }) as QuireLayoutContainer;

    expect(translated).not.toBe(box);
    expect(translated.rect).toEqual({ x: 10, y: 50, width: 320, height: 0 });
    expect(translated.table).toEqual({
      ...box.table,
      rect: { x: 10, y: 50, width: 100, height: 40 },
      hitTargets: [{ ...box.table!.hitTargets[0], rect: { x: 10, y: 50, width: 100, height: 40 } }]
    });
    expect(translated.children[0]!.rect).toEqual(translated.table!.rect);
    expect(translated.paintTransform).toEqual({ a: 0, b: 1, c: -1, d: 0, e: 50, f: 40 });
    expect(translated.paintBounds).toEqual({ x: 10, y: 50, width: 100, height: 40 });
    expect(box.table!.rect).toEqual({ x: 0, y: 20, width: 100, height: 40 });
  });

  it("keeps the floating table anchor in flow while projecting all visual geometry", () => {
    const box = createFloatingTableContainer();
    const baseProjection = createProjection({ dx: 90, dy: 80 });
    const projection: QuirePageBodyProjection = {
      ...baseProjection,
      page: {
        ...baseProjection.page,
        pageRect: { x: 50, y: 40, width: 400, height: 400 },
        bodyRect: { x: 90, y: 100, width: 320, height: 320 },
        rect: { x: 90, y: 100, width: 320, height: 320 }
      }
    };
    const translated = translateQuireLayoutBox(
      box,
      projection
    ) as QuireLayoutContainer;

    expect(translated.rect).toEqual({
      x: 90,
      y: 100,
      width: 320,
      height: 0
    });
    expect(translated.table?.rect).toEqual({
      x: 70,
      y: 130,
      width: 100,
      height: 40
    });
    expect(translated.table?.hitTargets[0]?.rect).toEqual({
      x: 70,
      y: 130,
      width: 100,
      height: 40
    });
    expect(translated.children[0]?.rect).toEqual({
      x: 70,
      y: 130,
      width: 100,
      height: 40
    });
  });

  it("projects a nested floating table even when ordinary page flow has zero offset", () => {
    const floatingTable = createFloatingTableContainer();
    const container: QuireLayoutContainer = {
      id: "section",
      range: floatingTable.range,
      rect: { x: 0, y: 20, width: 320, height: 40 },
      children: [floatingTable]
    };
    const projection: QuirePageBodyProjection = {
      ...createProjection({ dx: 0, dy: 0 }),
      page: {
        ...createProjection({ dx: 0, dy: 0 }).page,
        pageRect: { x: 50, y: 40, width: 400, height: 400 },
        bodyRect: { x: 0, y: 0, width: 320, height: 320 },
        rect: { x: 0, y: 0, width: 320, height: 320 }
      }
    };

    const translated = translateQuireLayoutBox(
      container,
      projection
    ) as QuireLayoutContainer;
    const table = translated.children[0];

    expect(translated).not.toBe(container);
    expect(table?.rect).toEqual(floatingTable.rect);
    expect(table?.table?.rect).toEqual({
      x: 70,
      y: 50,
      width: 100,
      height: 40
    });
    expect(table?.table?.floating).toBe(floatingTable.table?.floating);
    expect(table?.paintTransform).toEqual({ a: 0, b: 1, c: -1, d: 0, e: 110, f: -20 });
    expect(table?.paintBounds).toEqual(table?.table?.rect);
    // A preceding page projection must not supply its visual result to a later
    // ordinary identity request for the same immutable canonical source.
    expect(translateQuireLayoutBox(container, { dx: 0, dy: 0 })).toBe(container);
  });

  it("reuses projected layout boxes for the same source box and offset", () => {
    const box = createContainer();
    const projection = createProjection({ dx: 10, dy: 100 });
    const first = translateQuireLayoutBox(box, projection);
    const second = translateQuireLayoutBox(box, projection);

    expect(second).toBe(first);
    expect(first.rect).toEqual({ x: 10, y: 120, width: 200, height: 60 });
    expect((first as QuireLayoutContainer).children[0]?.rect).toEqual({
      x: 10,
      y: 124,
      width: 120,
      height: 24
    });
  });

  it("misses the projected layout box cache when the offset changes", () => {
    const box = createContainer();
    const first = translateQuireLayoutBox(
      box,
      createProjection({ dx: 10, dy: 100 })
    );
    const second = translateQuireLayoutBox(
      box,
      createProjection({ dx: 12, dy: 100 })
    );

    expect(second).not.toBe(first);
    expect(second.rect.x).toBe(12);
  });

  it("keeps the source layout box when projection has no offset", () => {
    const box = createContainer();
    const translated = translateQuireLayoutBox(
      box,
      createProjection({ dx: 0, dy: 0 })
    );

    expect(translated).toBe(box);
  });

  it("translates retained region products with their owning layout box", () => {
    const capabilities = {
      editable: true,
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    } as const;
    const root = {
      id: { value: "root:quote" },
      kind: "block-container" as const,
      source: { sourceId: "quote", range: { from: 1, to: 10 } },
      capabilities
    };
    const region = {
      rootId: root.id,
      regionId: { value: "region:quote" },
      kind: "block-container" as const
    };
    const box: QuireLayoutContainer = {
      ...createContainer(),
      viewRoot: root,
      viewRegion: region,
      viewCapabilities: capabilities,
      regionProducts: {
        roots: [root],
        regions: [{
          ref: region,
          source: root.source,
          rect: { x: 0, y: 20, width: 200, height: 60 },
          coordinateSpace: "document",
          capabilities
        }],
        hitTargets: [{
          id: "quote-hit",
          range: { from: 1, to: 10 },
          rect: { x: 0, y: 20, width: 200, height: 60 },
          viewRegion: region
        }],
        layerContributions: [{
          contributionId: "quote-chrome",
          owner: {
            root,
            region,
            source: root.source,
            capabilities
          },
          range: { from: 1, to: 10 },
          rect: { x: 0, y: 20, width: 200, height: 60 },
          coordinateSpace: "document",
          layer: { plane: "controls" },
          paintSurface: "content",
          commands: [{
            id: "quote-fill",
            kind: "fill-rect",
            layer: "content",
            rect: { x: 0, y: 20, width: 200, height: 60 },
            fillStyle: "#f8fafc"
          }],
          domOverlays: [{
            id: "quote-control",
            range: { from: 1, to: 10 },
            rect: { x: 160, y: 24, width: 32, height: 20 },
            html: "<button>Open</button>"
          }],
          targets: [{
            id: "quote-action",
            nodePath: "0.1",
            range: { from: 1, to: 10 },
            rect: { x: 160, y: 24, width: 32, height: 20 },
            pointerEvents: "auto",
            events: { click: { handler: "quote.open" } }
          }]
        }],
        selectionPolicies: [{
          policyId: "quote-selection",
          region,
          kind: "delegate-to-text"
        }],
        gaps: []
      }
    };

    const translated = translateQuireLayoutBox(
      box,
      createProjection({ dx: 10, dy: 100 })
    );

    expect(translated.regionProducts?.regions[0]?.rect).toEqual({
      x: 10,
      y: 120,
      width: 200,
      height: 60
    });
    expect(translated.regionProducts?.hitTargets[0]?.rect).toEqual({
      x: 10,
      y: 120,
      width: 200,
      height: 60
    });
    expect(translated.regionProducts?.layerContributions[0]).toMatchObject({
      rect: { x: 10, y: 120, width: 200, height: 60 },
      commands: [{ rect: { x: 10, y: 120, width: 200, height: 60 } }],
      domOverlays: [{ rect: { x: 170, y: 124, width: 32, height: 20 } }],
      targets: [{ rect: { x: 170, y: 124, width: 32, height: 20 } }]
    });
  });

  it("translates retained sub-layout fragments with their owning layout box", () => {
    const box = createContainerWithSubLayoutFragment();
    const translated = translateQuireLayoutBox(
      box,
      createProjection({ dx: 10, dy: 100 })
    ) as QuireLayoutContainer & {
      readonly subLayoutFragments: readonly QuireLayoutBoxSubLayoutFragment[];
    };
    const [fragment] = translated.subLayoutFragments;
    const result = fragment?.subLayout;

    expect(result?.geometry.root.placement.rect).toEqual({
      x: 15,
      y: 120,
      width: 80,
      height: 48
    });
    expect(result?.geometry.root.placement.contentRect).toEqual({
      x: 20,
      y: 125,
      width: 70,
      height: 38
    });
    expect(result?.geometry.root.placement.clipRect).toEqual({
      x: 15,
      y: 120,
      width: 80,
      height: 48
    });
    expect(result?.geometry.localToResult).toEqual({ x: 20, y: 125 });
    expect(result?.geometry.contentClip).toEqual({
      x: 20,
      y: 125,
      width: 70,
      height: 38
    });
    expect(result?.geometry.interactionClip).toEqual({
      x: 15,
      y: 120,
      width: 80,
      height: 48
    });
    expect(result?.geometry.fragments[0]?.rect).toEqual({
      x: 20,
      y: 125,
      width: 40,
      height: 24
    });
    expect(result?.view.fragmentSources[0]?.sourceBox.rect).toEqual({
      x: 20,
      y: 125,
      width: 40,
      height: 24
    });
    expect(result?.view.queryProducts.selectionRects[0]?.rect).toEqual({
      x: 20,
      y: 125,
      width: 40,
      height: 24
    });
    expect(result?.view.queryProducts.caretStops[0]?.rect).toEqual({
      x: 20,
      y: 125,
      width: 1,
      height: 24
    });
    expect(result?.view.queryProducts.caretStops[0]?.lineBaseline).toBe(143);
    expect(result?.view.queryProducts.hitTargets[0]?.rect).toEqual({
      x: 15,
      y: 120,
      width: 80,
      height: 48
    });
    expect(result?.view.queryProducts.inputAnchors[0]?.rect).toEqual({
      x: 20,
      y: 125,
      width: 1,
      height: 24
    });
    expect(result?.view.displayChunks[0]?.rect).toEqual({
      x: 20,
      y: 125,
      width: 70,
      height: 38
    });
    expect(result?.view.displayChunks[0]?.queryOwner.coordinatePath?.steps[0]?.output)
      .toMatchObject({ x: 20, y: 125 });
    const ownership = result?.view.root.ownership;
    expect(ownership?.status).toBe("resolved");
    if (ownership?.status !== "resolved") {
      throw new Error("Expected translated retained sub-layout ownership.");
    }
    expect(ownership.regionProducts?.regions[0]?.rect).toEqual({
      x: 10,
      y: 125,
      width: 24,
      height: 24
    });
    expect(ownership.regionProducts?.hitTargets[0]?.rect).toEqual({
      x: 10,
      y: 125,
      width: 24,
      height: 24
    });
    expect(ownership.regionProducts?.layerContributions[0]).toMatchObject({
      rect: { x: 10, y: 125, width: 24, height: 24 },
      commands: [{ rect: { x: 10, y: 125, width: 24, height: 24 } }],
      targets: [{ rect: { x: 10, y: 125, width: 24, height: 24 } }]
    });
  });
});

/**
 * Creates a source layout container fixture.
 *
 * @returns Layout container in source-flow coordinates.
 */
function createContainer(): QuireLayoutContainer {
  return {
    id: "paragraph",
    range: { from: 1, to: 10 },
    rect: { x: 0, y: 20, width: 200, height: 60 },
    textFragments: [createTextFragment()],
    children: [
      {
        id: "text",
        range: { from: 1, to: 4 },
        rect: { x: 0, y: 24, width: 120, height: 24 },
        textFragments: [createTextFragment()]
      }
    ]
  };
}

/**
 * Creates one floating table whose logical anchor and visual rectangle diverge.
 *
 * @returns Floating table layout fixture in source-flow coordinates.
 */
function createFloatingTableContainer(): QuireLayoutContainer {
  return {
    id: "floating-table:layout",
    range: { from: 1, to: 10 },
    rect: { x: 0, y: 20, width: 320, height: 0 },
    paintTransform: { a: 0, b: 1, c: -1, d: 0, e: 10, f: 20 },
    paintBounds: { x: 0, y: 20, width: 100, height: 40 },
    table: {
      tableId: "floating-table",
      fragmentId: "floating-table",
      geometryId: "floating-table",
      tableRange: { from: 1, to: 10 },
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      floating: {
        horizontal: {
          reference: "page",
          offset: 20,
          alignment: null
        },
        vertical: {
          reference: "text",
          offset: 30,
          alignment: null
        },
        clearances: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        },
        wrapMode: null,
        allowOverlap: false
      },
      rect: { x: 0, y: 20, width: 100, height: 40 },
      tracks: [],
      rows: [],
      cells: [],
      hitTargets: [{
        id: "floating-table:hit:cell",
        kind: "cell",
        tableId: "floating-table",
        semanticCellId: "cell",
        originExplicitCellId: "cell",
        explicitCellIds: ["cell"],
        originCellPos: 2,
        range: { from: 2, to: 9 },
        rect: { x: 0, y: 20, width: 100, height: 40 }
      }]
    },
    children: [{
      id: "floating-table:cell",
      range: { from: 2, to: 9 },
      rect: { x: 0, y: 20, width: 100, height: 40 }
    }]
  };
}

/**
 * Creates a layout container with one retained sub-layout fragment.
 *
 * @returns Layout container whose retained products start in source-flow coordinates.
 */
function createContainerWithSubLayoutFragment(): QuireLayoutContainer & {
  /** Retained sub-layout fragment attached to the container. */
  readonly subLayoutFragments: readonly QuireLayoutBoxSubLayoutFragment[];
} {
  return {
    ...createContainer(),
    subLayoutFragments: [
      {
        subLayout: createSubLayoutResult()
      }
    ]
  };
}

/**
 * Creates one retained sub-layout result in source-flow coordinates.
 *
 * @returns Sub-layout result with query products and display chunks.
 */
function createSubLayoutResult(): QuireSubLayoutProjection {
  const root = createSubLayoutRoot();
  const owner = createSubLayoutOwner();

  return createQuireTestSubLayoutProjection({
    root,
    viewRoot: createSubLayoutViewRoot(),
    resultId: "cell-fragment",
    acceptedBand: { top: 0, bottom: 24 },
    fragments: [
      {
        id: "cell-child",
        sourceId: "text",
        range: { from: 2, to: 4 },
        rect: { x: 10, y: 25, width: 40, height: 24 },
        localRect: { x: 0, y: 0, width: 40, height: 24 },
        clipRect: { x: 10, y: 25, width: 40, height: 24 }
      }
    ],
    fragmentSources: [{
      fragmentId: "cell-child",
      sourceBox: {
        id: "cell-child-source",
        range: { from: 2, to: 4 },
        rect: { x: 10, y: 25, width: 40, height: 24 },
        textFragments: [createTextFragment()]
      }
    }],
    localToResult: { x: 10, y: 25 },
    contentClip: { x: 10, y: 25, width: 70, height: 38 },
    interactionClip: { x: 5, y: 20, width: 80, height: 48 },
    queryProducts: {
      selectionRects: [
        {
          textFragmentId: "cell-text",
          range: { from: 2, to: 4 },
          rect: { x: 10, y: 25, width: 40, height: 24 },
          queryOwner: owner
        }
      ],
      caretStops: [
        {
          textFragmentId: "cell-text",
          position: { pos: 2, bias: 1 },
          rect: { x: 10, y: 25, width: 1, height: 24 },
          lineBaseline: 43,
          fragmentId: "cell-child",
          queryOwner: owner
        }
      ],
      hitTargets: [
        createSubLayoutHitTarget(owner)
      ],
      inputAnchors: [
        {
          position: { pos: 2, bias: 1 },
          rect: { x: 10, y: 25, width: 1, height: 24 },
          role: "caret",
          queryOwner: owner
        }
      ]
    },
    displayChunks: [
      {
        kind: "sub-layout-local",
        key: "cell:display",
        rect: { x: 10, y: 25, width: 70, height: 38 },
        contentClip: { x: 10, y: 25, width: 70, height: 38 },
        interactionClip: { x: 5, y: 20, width: 80, height: 48 },
        queryOwner: owner,
        dependencySignature: "cell",
        sourceBoxIds: ["cell-child-source"]
      }
    ],
    dependencySignature: "cell"
  });
}

/**
 * Creates nested retained products stored on the sub-layout ownership sidecar.
 *
 * @returns Resolved ownership with a controls-plane list-prefix fixture.
 */
function createSubLayoutViewRoot(): QuireSubLayoutRootViewProducts {
  const capabilities = {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  } as const;
  const source = {
    sourceId: "task-prefix",
    range: { from: 2, to: 3 }
  };
  const root = {
    id: { value: "root:task-prefix" },
    kind: "block-container" as const,
    source,
    capabilities
  };
  const region = {
    rootId: root.id,
    regionId: { value: "region:task-prefix" },
    kind: "block-container" as const
  };
  const rect = { x: 0, y: 25, width: 24, height: 24 };

  return {
    ownership: {
      status: "resolved",
      root,
      owner: { region, source, capabilities },
      regionProducts: {
        roots: [root],
        regions: [{
          ref: region,
          source,
          rect,
          coordinateSpace: "document",
          capabilities
        }],
        hitTargets: [{
          id: "task-prefix:hit",
          range: source.range,
          rect,
          viewRegion: region
        }],
        layerContributions: [{
          contributionId: "task-prefix:control",
          owner: { root, region, source, capabilities },
          range: source.range,
          rect,
          coordinateSpace: "document",
          layer: { plane: "controls" },
          paintSurface: "overlay",
          commands: [{
            id: "task-prefix:paint",
            kind: "fill-rect",
            layer: "content",
            rect,
            fillStyle: "#64748b"
          }],
          domOverlays: [],
          targets: [{
            id: "task-prefix:toggle",
            nodePath: "0",
            range: source.range,
            rect,
            pointerEvents: "auto",
            events: { click: { handler: "task.toggle" } }
          }]
        }],
        selectionPolicies: [{
          policyId: "task-prefix:selection",
          region,
          kind: "control-dispatch"
        }],
        gaps: []
      }
    }
  };
}

/**
 * Creates one retained sub-layout root in source-flow coordinates.
 *
 * @returns Sub-layout root fixture.
 */
function createSubLayoutRoot(): QuireChildFlowRoot {
  return {
    id: "cell-root",
    kind: "table-cell",
    range: { from: 1, to: 5 },
    placement: {
      parentId: "table",
      rect: { x: 5, y: 20, width: 80, height: 48 },
      contentRect: { x: 10, y: 25, width: 70, height: 38 },
      clipRect: { x: 5, y: 20, width: 80, height: 48 }
    },
    localRect: { x: 0, y: 0, width: 70, height: 38 },
    writingMode: "horizontal-tb",
    dependencySignature: "cell"
  };
}

/**
 * Creates retained query-product owner facts in source-flow coordinates.
 *
 * @returns Query-product owner fixture.
 */
function createSubLayoutOwner(): QuireLayoutQueryProductOwner {
  return {
    sourceRootId: "cell-root",
    sourceFragmentId: "cell-fragment",
    coordinateSpace: "document",
    sourceCoordinateSpace: "table-cell-local",
    coordinatePath: {
      spaces: ["table-cell-local", "document"],
      steps: [
        {
          from: "table-cell-local",
          to: "document",
          input: { space: "table-cell-local", x: 0, y: 0 },
          output: { space: "document", x: 10, y: 25 },
          scaleX: 1,
          scaleY: 1
        }
      ]
    }
  };
}

/**
 * Creates a retained sub-layout hit target fixture.
 *
 * @param queryOwner - Query owner carried by the hit target.
 * @returns Sub-layout hit target fixture.
 */
function createSubLayoutHitTarget(
  queryOwner: QuireLayoutQueryProductOwner
): QuireHitTarget {
  return {
    id: "cell-hit",
    range: { from: 1, to: 5 },
    rect: { x: 5, y: 20, width: 80, height: 48 },
    queryOwner
  };
}

/**
 * Creates a source text fragment fixture.
 *
 * @returns Text fragment in source-flow coordinates.
 */
function createTextFragment(): QuireTextFragment {
  return {
    id: "paragraph:text",
    text: "AB",
    range: { from: 1, to: 3 },
    rect: { x: 0, y: 24, width: 40, height: 24 },
    font: "16px serif",
    lineHeight: 24,
    baseline: 42,
    caretStops: []
  };
}

/**
 * Creates a page-body projection fixture.
 *
 * @param options - Projection offsets.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Horizontal projection offset. */
  readonly dx: number;
  /** Vertical projection offset. */
  readonly dy: number;
}): QuirePageBodyProjection {
  return {
    page: {
      pageIndex: 0,
      range: { from: 1, to: 10 },
      pageRect: { x: 0, y: 0, width: 400, height: 400 },
      bodyRect: { x: 0, y: 0, width: 320, height: 320 },
      rect: { x: 0, y: 0, width: 320, height: 320 },
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: options.dx,
    dy: options.dy
  };
}
