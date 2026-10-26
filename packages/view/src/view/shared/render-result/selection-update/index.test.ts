import { describe, expect, it } from "vitest";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import type {
  QuireLayoutDirtyRange,
  QuireViewUpdatePatch
} from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../../types";
import { retainQuireLayoutSnapshotForTest } from "@quirekit/view-engine/test-support/layout";
import {
  createQuireDisplayInvalidationProjection,
  createQuireRetainedDisplayOwnerChunkCollector,
  createQuireRetainedDisplayOwnerDiagnostics,
  createQuireRetainedDisplayOwnerIndex
} from "@quirekit/view-engine";
import {
  isMountedSelectionOverlayCommand,
  replaceMountedSelectionOverlayCommands
} from "../../selection-overlay";
import {
  canReuseMountedSelectionOverlayRenderResult,
  createMountedSelectionGeometryRenderResult,
  createMountedSelectionUpdateRenderResult
} from ".";

describe("mounted selection update render result", () => {
  it("rebuilds selection geometry and overlay while preserving cached content", () => {
    const contentCommand = {
      id: "content",
      kind: "text" as const,
      rect: { x: 0, y: 0, width: 30, height: 24 },
      text: "abc",
      origin: { x: 0, y: 18 },
      font: "16px sans-serif",
      fillStyle: "#111"
    };
    const contentDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 40 },
      commands: [contentCommand]
    };
    const retainedChunk = {
      retainedRecord: {
        key: "page:0",
        kind: "page-local" as const,
        rect: { x: 0, y: 0, width: 100, height: 40 },
        pageIndex: 0,
        pageRect: { x: 0, y: 0, width: 100, height: 40 }
      },
      sourceOwnerKeys: ["layout-node:paragraph"],
      pageIndex: 0,
      pageRect: { x: 0, y: 0, width: 100, height: 40 },
      contentDirtyBounds: { x: 0, y: 0, width: 30, height: 24 },
      overlayDirtyBounds: null,
      contentDisplayList,
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 40 },
        commands: [searchHighlightCommand()]
      }
    };
    const previousRenderResult = withDisplayOwnership({
      layoutSnapshot: retainQuireLayoutSnapshotForTest({
        state: { pm: { selection: { from: 1, to: 1, empty: true } } } as
          QuireViewRenderResult["layoutSnapshot"]["state"],
        documentRect: { x: 0, y: 0, width: 100, height: 40 },
        viewportRect: { x: 0, y: 0, width: 100, height: 40 },
        domOverlays: [],
        hitTargets: [],
        root: {
          id: "doc",
          kind: "block",
          range: { from: 0, to: 5 },
          rect: { x: 0, y: 0, width: 100, height: 40 },
          children: [
            {
              id: "paragraph",
              kind: "block",
              range: { from: 0, to: 5 },
              rect: { x: 0, y: 0, width: 100, height: 24 },
              textFragments: [
                {
                  id: "paragraph:text",
                  text: "abc",
                  range: { from: 1, to: 4 },
                  rect: { x: 0, y: 0, width: 30, height: 24 },
                  font: "16px sans-serif",
                  lineHeight: 24,
                  baseline: 18,
                  caretStops: [
                    { position: { pos: 1, bias: 1 }, localX: 0 },
                    { position: { pos: 2, bias: 0 }, localX: 10 },
                    { position: { pos: 3, bias: 0 }, localX: 20 },
                    { position: { pos: 4, bias: -1 }, localX: 30 }
                  ]
                }
              ],
              children: []
            }
          ]
        }
      }),
      interactionSnapshot: retainQuireLayoutSnapshotForTest({
        state: { pm: { selection: { from: 1, to: 1, empty: true } } } as
          QuireViewRenderResult["layoutSnapshot"]["state"],
        documentRect: { x: 0, y: 0, width: 100, height: 40 },
        viewportRect: { x: 0, y: 0, width: 100, height: 40 },
        domOverlays: [],
        hitTargets: [],
        root: {
          id: "doc",
          kind: "block",
          range: { from: 0, to: 5 },
          rect: { x: 0, y: 0, width: 100, height: 40 },
          children: [
            {
              id: "paragraph",
              kind: "block",
              range: { from: 0, to: 5 },
              rect: { x: 0, y: 0, width: 100, height: 24 },
              textFragments: [
                {
                  id: "paragraph:text",
                  text: "abc",
                  range: { from: 1, to: 4 },
                  rect: { x: 0, y: 0, width: 30, height: 24 },
                  font: "16px sans-serif",
                  lineHeight: 24,
                  baseline: 18,
                  caretStops: [
                    { position: { pos: 1, bias: 1 }, localX: 0 },
                    { position: { pos: 2, bias: 0 }, localX: 10 },
                    { position: { pos: 3, bias: 0 }, localX: 20 },
                    { position: { pos: 4, bias: -1 }, localX: 30 }
                  ]
                }
              ],
              children: []
            }
          ]
        }
      }),
      selectionGeometry: { carets: [], ranges: [] },
      decorationLane: {
        interactionTargets: [],
        backgrounds: [],
        textStyles: [],
        nodes: [],
        pointMarkers: [],
        widgets: [],
        diagnostics: []
      },
      displayList: {
        bounds: { x: 0, y: 0, width: 100, height: 40 },
        commands: []
      },
      contentDisplayList: {
        ...contentDisplayList,
        commands: [contentCommand]
      },
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 40 },
        commands: [searchHighlightCommand()]
      },
      domOverlays: [],
      viewTargets: [],
      pageDisplayListChunks: {
        chunks: [retainedChunk],
        chunksByPageIndex: { 0: retainedChunk }
      }
    });
    const consumerCompilation = previousRenderResult.layoutSnapshot.consumerCompilation;
    const state = {
      pm: {
        selection: { from: 2, to: 2, empty: true }
      }
    } as QuireViewRenderResult["layoutSnapshot"]["state"];

    const result = createMountedSelectionUpdateRenderResult({
      previousRenderResult,
      state,
      updatePatch: null,
      rebuildCompositeDisplayList: true,
      refreshPageDisplayListChunks: true
    });

    expect(result.layoutSnapshot.state).toBe(state);
    expect(result.layoutSnapshot.consumerCompilation).toBe(consumerCompilation);
    expect(result.selectionGeometry.carets[0]?.rect).toEqual({
      x: 10,
      y: 0,
      width: 1,
      height: 24
    });
    expect(result.overlayDisplayList.commands).toEqual([]);
    expect(result.displayList.commands).toEqual([]);
    expect(result.contentDisplayList).toBe(previousRenderResult.contentDisplayList);
    expect(result.pageDisplayListChunks?.chunks[0]?.contentDisplayList)
      .toBe(retainedChunk.contentDisplayList);
    expect(result.pageDisplayListChunks?.chunks[0]?.overlayDisplayList.commands
      .map((command) => command.id)).toEqual(["caret-0", "search-hit"]);

    const dirtyRange: QuireLayoutDirtyRange = {
      reason: "content",
      changedRange: { from: 1, to: 4 },
      firstTopLevelBlockIndex: 0,
      firstTopLevelBlockRange: { from: 0, to: 5 },
      textEdit: { from: 2, inserted: 1, deleted: 0 }
    };
    const updatePatch: QuireViewUpdatePatch = {
      sourceReason: "input",
      transactionCount: 1,
      docChanged: true,
      selectionChanged: false,
      compositionChanged: false,
      causes: ["content"],
      invalidatedProducts: ["layout", "content"],
      layoutDirtyRange: dirtyRange
    };
    const retainedRenderResult: QuireViewRenderResult = {
      ...previousRenderResult,
      layoutDirtyRange: dirtyRange,
      updatePatch
    };
    const measuredSelectionGeometry = {
      carets: [],
      ranges: [
        {
          range: { from: 1, to: 4 },
          rect: { x: 0, y: 0, width: 30, height: 24 }
        }
      ]
    };

    const measuredResult = createMountedSelectionGeometryRenderResult({
      previousRenderResult: retainedRenderResult,
      selectionGeometry: measuredSelectionGeometry,
      refreshPageDisplayListChunks: true
    });

    expect(measuredResult.selectionGeometry).toBe(measuredSelectionGeometry);
    expect(measuredResult.overlayDisplayList.commands).toEqual([]);
    expect(measuredResult.layoutDirtyRange).toBe(dirtyRange);
    expect(measuredResult.updatePatch).toBe(updatePatch);
    expect(measuredResult.displayList).toBe(retainedRenderResult.displayList);
    expect(measuredResult.contentDisplayList).toBe(retainedRenderResult.contentDisplayList);
    expect(measuredResult.pageDisplayListChunks?.chunks[0]?.contentDisplayList)
      .toBe(retainedChunk.contentDisplayList);
    expect(measuredResult.pageDisplayListChunks?.chunks[0]?.overlayDisplayList.commands
      .map((command) => command.id)).toEqual(["selection-range-0", "search-hit"]);
  });

  it("recognizes only selection and caret overlay commands", () => {
    expect(isMountedSelectionOverlayCommand({
      id: "caret",
      kind: "caret",
      rect: { x: 0, y: 0, width: 1, height: 24 },
      fillStyle: "#111"
    })).toBe(true);
    expect(isMountedSelectionOverlayCommand({
      id: "selection-range-0",
      kind: "fill-rect",
      rect: { x: 0, y: 0, width: 10, height: 24 },
      fillStyle: "rgba(59,130,246,0.25)"
    })).toBe(true);
    expect(isMountedSelectionOverlayCommand({
      id: "search-hit",
      kind: "fill-rect",
      rect: { x: 0, y: 0, width: 10, height: 24 },
      fillStyle: "yellow"
    })).toBe(false);
    expect(replaceMountedSelectionOverlayCommands(
      [searchHighlightCommand(), caretCommand(), {
        ...searchHighlightCommand(),
        id: "search-hit-2"
      }],
      [{
        id: "selection-range-0",
        kind: "fill-rect",
        rect: { x: 0, y: 0, width: 10, height: 24 },
        fillStyle: "rgba(59,130,246,0.25)"
      }]
    ).map((command) => command.id)).toEqual([
      "search-hit",
      "selection-range-0",
      "search-hit-2"
    ]);
    expect(replaceMountedSelectionOverlayCommands(
      [searchHighlightCommand(), {
        ...searchHighlightCommand(),
        id: "runtime-control"
      }, caretCommand()],
      [{
        ...searchHighlightCommand(),
        id: "runtime-control"
      }],
      new Set(["runtime-control"])
    ).map((command) => command.id)).toEqual([
      "search-hit",
      "runtime-control"
    ]);
  });

  it("centralizes overlay-only selection-update reuse eligibility", () => {
    const retainedDoc = {};
    const nextState = {
      doc: retainedDoc,
      pm: {
        selection: nonTextblockSelection()
      }
    } as QuireViewRenderResult["layoutSnapshot"]["state"];
    const reusable = renderResultForOverlayEligibility({
      state: {
        doc: retainedDoc,
        pm: {
          selection: nonTextblockSelection()
        }
      } as QuireViewRenderResult["layoutSnapshot"]["state"],
      commands: [caretCommand()]
    });

    expect(canReuseMountedSelectionOverlayRenderResult({
      decorationSourceView: { someProp: () => undefined },
      previousRenderResult: reusable,
      state: nextState
    })).toBe(false);
    expect(canReuseMountedSelectionOverlayRenderResult({
      decorationSourceView: { someProp: () => undefined },
      previousRenderResult: {
        ...reusable,
        decorationLane: {
          ...reusable.decorationLane,
          interactionTargets: [{
            id: "selection-derived-control",
            nodePath: "selection-derived-control",
            rect: { x: 0, y: 0, width: 10, height: 10 },
            pointerEvents: "auto",
            events: {}
          }]
        }
      },
      state: nextState
    })).toBe(false);
    expect(canReuseMountedSelectionOverlayRenderResult({
      decorationSourceView: { someProp: () => undefined },
      previousRenderResult: {
        ...reusable,
        decorationLane: {
          ...reusable.decorationLane,
          pointMarkers: [{
            id: "comment-point:8:marker",
            decorationId: "comment-point:8",
            range: { from: 8, to: 8 },
            rect: { x: 40, y: 20, width: 12, height: 12 },
            color: "rgba(37, 99, 235, 0.42)",
            lineWidth: 1.25
          }]
        }
      },
      state: nextState
    })).toBe(false);
    expect(canReuseMountedSelectionOverlayRenderResult({
      decorationSourceView: { someProp: () => undefined },
      previousRenderResult: renderResultForOverlayEligibility({
        state: reusable.layoutSnapshot.state,
        commands: [searchHighlightCommand()]
      }),
      state: nextState
    })).toBe(false);
    expect(canReuseMountedSelectionOverlayRenderResult({
      decorationSourceView: { someProp: () => undefined },
      previousRenderResult: renderResultForOverlayEligibility({
        state: {
          doc: {},
          pm: {
            selection: nonTextblockSelection()
          }
        } as QuireViewRenderResult["layoutSnapshot"]["state"],
        commands: [caretCommand()]
      }),
      state: nextState
    })).toBe(false);
    expect(canReuseMountedSelectionOverlayRenderResult({
      decorationSourceView: { someProp: () => undefined },
      previousRenderResult: renderResultForOverlayEligibility({
        state: nextState,
        commands: [caretCommand()],
        root: {
          id: "estimated",
          kind: "block",
          range: { from: 0, to: 5 },
          rect: { x: 0, y: 0, width: 100, height: 24 },
          children: []
        }
      }),
      state: {
        ...nextState,
        pm: {
          selection: textblockSelection()
        }
      } as QuireViewRenderResult["layoutSnapshot"]["state"],
      requireMaterializedSelectionTextblock: true
    })).toBe(false);
  });
});

/**
 * Creates a render result shape focused on overlay-reuse eligibility.
 *
 * @param options - Retained state, overlay commands, and optional root node.
 * @returns Minimal render result for shared eligibility tests.
 */
function renderResultForOverlayEligibility(options: {
  /** Retained state carried by the cached layout snapshot. */
  readonly state: QuireViewRenderResult["layoutSnapshot"]["state"];
  /** Overlay commands carried by the cached render result. */
  readonly commands: readonly QuireDisplayCommand[];
  /** Optional layout root used by materialization checks. */
  readonly root?: QuireViewRenderResult["layoutSnapshot"]["root"];
}): QuireViewRenderResult {
  const root = options.root ?? {
    id: "root",
    kind: "block" as const,
    range: { from: 0, to: 1 },
    rect: { x: 0, y: 0, width: 100, height: 24 },
    children: []
  };
  const layoutSnapshot = retainQuireLayoutSnapshotForTest({
    state: options.state,
    documentRect: { x: 0, y: 0, width: 100, height: 24 },
    viewportRect: { x: 0, y: 0, width: 100, height: 24 },
    domOverlays: [],
    hitTargets: [],
    root
  });
  const emptyDisplayList = {
    bounds: { x: 0, y: 0, width: 100, height: 24 },
    commands: []
  };

  return withDisplayOwnership({
    layoutSnapshot,
    interactionSnapshot: layoutSnapshot,
    selectionGeometry: { carets: [], ranges: [] },
    decorationLane: {
      interactionTargets: [],
      backgrounds: [],
      textStyles: [],
      nodes: [],
      pointMarkers: [],
      widgets: [],
      diagnostics: []
    },
    displayList: emptyDisplayList,
    contentDisplayList: emptyDisplayList,
    overlayDisplayList: {
      bounds: { x: 0, y: 0, width: 100, height: 24 },
      commands: options.commands
    },
    domOverlays: [],
    viewTargets: [],
  });
}

/**
 * Supplies canonical retained display metadata for a hand-built render fixture.
 *
 * Test fixtures intentionally keep layout identity minimal. The same owner
 * compiler used by production records any omitted owner facts as a diagnostic
 * gap instead of allowing a test-only synthetic owner contract to drift.
 *
 * @param renderResult - Render-result fields other than display ownership metadata.
 * @returns Complete render result with compiler-derived ownership metadata.
 */
function withDisplayOwnership(
  renderResult: Omit<
    QuireViewRenderResult,
    "displayOwnerIndex" | "displayInvalidation" | "displayOwnerChunks" |
    "displayOwnerDiagnostics"
  >
): QuireViewRenderResult {
  const displayOwnerIndex = createQuireRetainedDisplayOwnerIndex({
    snapshot: renderResult.layoutSnapshot
  });
  const displayOwnerChunkCollector = createQuireRetainedDisplayOwnerChunkCollector(
    displayOwnerIndex
  );

  const displayOwnerChunks = displayOwnerChunkCollector.finish(
    renderResult.layoutSnapshot.documentRect
  );
  const displayInvalidation = createQuireDisplayInvalidationProjection({
      ownerIndex: displayOwnerIndex,
      ...(renderResult.updatePatch === undefined
        ? {}
        : { updatePatch: renderResult.updatePatch }),
      ...(renderResult.layoutDirtyRange === undefined
        ? {}
        : { layoutDirtyRange: renderResult.layoutDirtyRange })
    });

  return {
    ...renderResult,
    displayOwnerIndex,
    displayOwnerChunks,
    displayInvalidation,
    displayOwnerDiagnostics: createQuireRetainedDisplayOwnerDiagnostics({
      ownerIndex: displayOwnerIndex,
      ownerChunkCount: displayOwnerChunks.chunks.length,
      invalidation: displayInvalidation,
      observerBridgeUses: 0
    })
  };
}

/**
 * Creates a caret command that is safe for overlay-only reuse.
 *
 * @returns Caret display command.
 */
function caretCommand(): QuireDisplayCommand {
  return {
    id: "caret-0",
    kind: "caret",
    rect: { x: 0, y: 0, width: 1, height: 24 },
    fillStyle: "#111"
  };
}

/**
 * Creates a non-selection overlay command preserved during selection refresh.
 *
 * @returns Overlay highlight command.
 */
function searchHighlightCommand(): QuireDisplayCommand {
  return {
    id: "search-hit",
    kind: "fill-rect",
    rect: { x: 0, y: 0, width: 10, height: 24 },
    fillStyle: "yellow"
  };
}

/**
 * Creates a selection stub whose head is outside a textblock.
 *
 * @returns ProseMirror-like non-textblock selection.
 */
function nonTextblockSelection(): QuireViewRenderResult["layoutSnapshot"]["state"]["pm"]["selection"] {
  return {
    empty: true,
    $head: {
      parent: { isTextblock: false },
      depth: 0
    }
  } as QuireViewRenderResult["layoutSnapshot"]["state"]["pm"]["selection"];
}

/**
 * Creates a selection stub pointing at an estimated textblock.
 *
 * @returns ProseMirror-like textblock selection.
 */
function textblockSelection(): QuireViewRenderResult["layoutSnapshot"]["state"]["pm"]["selection"] {
  return {
    empty: true,
    $head: {
      parent: {
        isTextblock: true,
        nodeSize: 5
      },
      depth: 1,
      before: () => 0
    }
  } as QuireViewRenderResult["layoutSnapshot"]["state"]["pm"]["selection"];
}
