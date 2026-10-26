import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireTableCellFragment, QuireTableLayoutSnapshot, QuireTableHitTarget } from "../../../layout";
import type { QuireLayoutSnapshot } from "../../../editor-layout";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import type {
  QuireViewInteractionHit,
  QuireViewLayerRef,
  QuireViewPointerPolicy
} from "../../../view-graph";
import { describe, expect, it } from "vitest";
import {
  hitTestExactQuireLayoutSnapshot,
  hitTestNearestCaretInQuireLayoutSnapshot
} from ".";

const snapshot = {
  state: {} as QuireLayoutSnapshot["state"],
  documentRect: { x: 10, y: 20, width: 300, height: 56 },
  viewportRect: { x: 10, y: 20, width: 300, height: 200 },
  domOverlays: [],
  hitTargets: [],
  root: {
    id: "doc",
    kind: "block",
    range: { from: 0, to: 10 },
    rect: { x: 10, y: 20, width: 300, height: 56 },
    children: [
      {
        id: "paragraph-0",
        kind: "block",
        range: { from: 0, to: 5 },
        rect: { x: 10, y: 20, width: 300, height: 24 },
        children: []
      },
      {
        id: "paragraph-1",
        kind: "block",
        range: { from: 5, to: 10 },
        rect: { x: 10, y: 52, width: 300, height: 24 },
        children: []
      }
    ]
  }
} satisfies QuireLayoutSnapshot;

describe("canvas layout hit testing", () => {
  it("maps points inside text fragments to measured caret stops", () => {
    const textSnapshot = {
      ...snapshot,
      root: {
        ...snapshot.root,
        children: [
          {
            id: "paragraph-0",
            kind: "block",
            range: { from: 0, to: 5 },
            rect: { x: 10, y: 20, width: 300, height: 24 },
            textFragments: [
              {
                id: "paragraph-0:text-0",
                text: "One",
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
              }
            ],
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: textSnapshot,
        point: { x: 26, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 3, bias: 0 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
  });

  it("reports owner facts carried by the exact text layout node", () => {
    const region: QuireLayoutRegionRef = {
      rootId: { value: "body-root" },
      regionId: { value: "body-region" },
      kind: "body"
    };
    const capabilities: QuireLayoutCapabilitySet = {
      editable: true,
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    };
    const textSnapshot = createTextFragmentSnapshot([]);
    const paragraph = textSnapshot.root.children?.[0];

    if (paragraph === undefined) {
      throw new Error("Expected text layout node fixture.");
    }

    const ownedSnapshot: QuireLayoutSnapshot = {
      ...textSnapshot,
      root: {
        ...textSnapshot.root,
        children: [{
          ...paragraph,
          viewRoot: {
            id: region.rootId,
            kind: "body",
            source: {
              sourceId: "root-source",
              range: { from: 0, to: 8 }
            },
            capabilities
          },
          viewRegion: region,
          viewCapabilities: capabilities,
          layoutOwner: {
            region,
            source: {
              sourceId: "region-source",
              range: { from: 1, to: 7 }
            },
            capabilities
          }
        }]
      }
    };

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: ownedSnapshot,
        point: { x: 20, y: 30 }
      })
    ).toEqual(expect.objectContaining({
      viewRegion: region,
      ownerSource: {
        sourceId: "region-source",
        range: { from: 1, to: 7 }
      },
      ownerCapabilities: capabilities
    }));
  });

  it("honors retained controls above rendered text and exposes layer diagnostics", () => {
    const controlLayer = {
      plane: "controls",
      zIndex: 20,
      priority: 5
    } satisfies QuireViewLayerRef;
    const controlPolicy = {
      kind: "dispatch",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    } satisfies QuireViewPointerPolicy;
    const controlHit = createControlInteractionHit(
      "paragraph-handle",
      controlLayer,
      controlPolicy
    );
    const textSnapshot = {
      ...createTextFragmentSnapshot([
        {
          id: "paragraph-0:text-0",
          text: "One",
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
        }
      ]),
      hitTargets: [
        {
          id: "paragraph-handle",
          range: { from: 1, to: 4 },
          rect: { x: 20, y: 20, width: 18, height: 24 },
          layer: controlLayer,
          pointerPolicy: controlPolicy,
          interactionHit: controlHit
        }
      ]
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: textSnapshot,
        point: { x: 26, y: 30 }
      })
    ).toEqual(
      expect.objectContaining({
        kind: "position",
        position: { pos: 3, bias: 0 },
        inside: 1,
        rect: { x: 20, y: 20, width: 18, height: 24 },
        interactionHit: controlHit,
        layer: controlLayer,
        pointerPolicy: controlPolicy,
        layerHitChain: [
          expect.objectContaining({
            targetId: "paragraph-handle",
            layer: controlLayer,
            pointerPolicy: controlPolicy
          })
        ],
        targetChain: [
          expect.objectContaining({
            targetId: "paragraph-handle",
            decision: "target-dispatch"
          })
        ]
      })
    );
  });

  it("uses the retained layer target index to narrow exact hit candidates", () => {
    const indexedLayer = {
      plane: "controls",
      zIndex: 10
    } satisfies QuireViewLayerRef;
    const omittedLayer = {
      plane: "floating-ui",
      zIndex: 100
    } satisfies QuireViewLayerRef;
    const dispatchPolicy = {
      kind: "dispatch",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    } satisfies QuireViewPointerPolicy;
    const indexedHit = createControlInteractionHit(
      "indexed-control",
      indexedLayer,
      dispatchPolicy
    );
    const omittedHit = createControlInteractionHit(
      "omitted-floating-ui",
      omittedLayer,
      dispatchPolicy
    );
    const textSnapshot = {
      ...createTextFragmentSnapshot([
        {
          id: "paragraph-0:text-0",
          text: "One",
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
        }
      ]),
      layerTargetIndex: {
        buckets: [
          {
            bucketId: "page:0",
            pageIndex: 0,
            rect: { x: 0, y: 0, width: 200, height: 120 },
            targetIds: ["indexed-control"]
          }
        ],
        unbucketedTargetIds: [],
        targetCount: 1
      },
      hitTargets: [
        {
          id: "indexed-control",
          range: { from: 1, to: 4 },
          rect: { x: 20, y: 20, width: 18, height: 24 },
          layer: indexedLayer,
          pointerPolicy: dispatchPolicy,
          interactionHit: indexedHit
        },
        {
          id: "omitted-floating-ui",
          range: { from: 1, to: 4 },
          rect: { x: 20, y: 20, width: 18, height: 24 },
          layer: omittedLayer,
          pointerPolicy: dispatchPolicy,
          interactionHit: omittedHit
        }
      ]
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: textSnapshot,
        point: { x: 26, y: 30 }
      })
    ).toEqual(
      expect.objectContaining({
        interactionHit: indexedHit,
        layer: indexedLayer,
        layerHitChain: [
          expect.objectContaining({
            targetId: "indexed-control"
          })
        ],
        layerTargetIndexQuery: {
          targetIds: ["indexed-control"],
          buckets: [
            {
              bucketId: "page:0",
              pageIndex: 0,
              targetIds: ["indexed-control"]
            }
          ],
          unbucketedTargetIds: [],
          source: "retained-layer-target-index"
        }
      })
    );
  });

  it("passes retained selection overlays through to rendered text with diagnostics", () => {
    const selectionLayer = { plane: "selection" } satisfies QuireViewLayerRef;
    const selectionPolicy = {
      kind: "pass-through",
      shouldFocusEditor: false,
      shouldPreventDefault: false
    } satisfies QuireViewPointerPolicy;
    const textSnapshot = {
      ...createTextFragmentSnapshot([
        {
          id: "paragraph-0:text-0",
          text: "One",
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
        }
      ]),
      hitTargets: [
        {
          id: "selection-overlay",
          range: { from: 1, to: 4 },
          rect: { x: 10, y: 20, width: 30, height: 24 },
          layer: selectionLayer,
          pointerPolicy: selectionPolicy
        }
      ]
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: textSnapshot,
        point: { x: 26, y: 30 }
      })
    ).toEqual(
      expect.objectContaining({
        kind: "position",
        position: { pos: 3, bias: 0 },
        inside: 0,
        rect: { x: 10, y: 20, width: 30, height: 24 },
        layerHitChain: [
          expect.objectContaining({
            targetId: "selection-overlay",
            layer: selectionLayer,
            pointerPolicy: selectionPolicy
          })
        ],
        layerTargetIndexQuery: {
          targetIds: ["selection-overlay"],
          buckets: [],
          unbucketedTargetIds: ["selection-overlay"],
          source: "unindexed-layer-target-scan"
        },
        targetChain: [
          expect.objectContaining({
            targetId: "selection-overlay",
            decision: "pass-through"
          })
        ]
      })
    );
  });

  it("maps points to text fragments on the matching visual line", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTextFragmentSnapshot([
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
        ]),
        point: { x: 26, y: 50 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 6, bias: 0 },
      inside: 0,
      rect: { x: 10, y: 44, width: 30, height: 24 }
    });
  });

  it("maps points to the matching styled run on the same visual line", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTextFragmentSnapshot([
          {
            id: "paragraph-0:text-0",
            text: "Hi ",
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
            text: "Bold",
            range: { from: 4, to: 8 },
            rect: { x: 40, y: 20, width: 40, height: 24 },
            font: "bold 16px sans-serif",
            lineHeight: 24,
            baseline: 38,
            marks: ["strong"],
            caretStops: [
              { position: { pos: 4, bias: 1 }, localX: 0 },
              { position: { pos: 5, bias: 0 }, localX: 10 },
              { position: { pos: 6, bias: 0 }, localX: 20 },
              { position: { pos: 7, bias: 0 }, localX: 30 },
              { position: { pos: 8, bias: -1 }, localX: 40 }
            ]
          }
        ]),
        point: { x: 56, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 6, bias: 0 },
      inside: 0,
      rect: { x: 40, y: 20, width: 40, height: 24 }
    });
  });

  it("maps inter-run blanks on a visual line to the nearest caret stop", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTextFragmentSnapshot([
          {
            id: "paragraph-0:text-0",
            text: "Kit",
            range: { from: 1, to: 4 },
            rect: { x: 10, y: 20, width: 30, height: 24 },
            font: "700 16px sans-serif",
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
            text: "Bench",
            range: { from: 5, to: 10 },
            rect: { x: 80, y: 20, width: 50, height: 24 },
            font: "700 16px sans-serif",
            lineHeight: 24,
            baseline: 38,
            caretStops: [
              { position: { pos: 5, bias: 1 }, localX: 0 },
              { position: { pos: 6, bias: 0 }, localX: 10 },
              { position: { pos: 7, bias: 0 }, localX: 20 },
              { position: { pos: 8, bias: 0 }, localX: 30 },
              { position: { pos: 9, bias: 0 }, localX: 40 },
              { position: { pos: 10, bias: -1 }, localX: 50 }
            ]
          }
        ]),
        point: { x: 45, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 4, bias: -1 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
  });

  it("maps trailing blanks after a transparent inline owner outside the owner", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTransparentInlineBoundarySnapshot(),
        point: { x: 130, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 7, bias: -1 },
      inside: 0,
      rect: { x: 30, y: 20, width: 40, height: 24 }
    });
  });

  it("maps leading blanks before a transparent inline owner outside the owner", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTransparentInlineBoundarySnapshot(),
        point: { x: 15, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 1, bias: 1 },
      inside: 0,
      rect: { x: 30, y: 20, width: 40, height: 24 }
    });
  });

  it("keeps direct glyph hits inside a transparent inline owner", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTransparentInlineBoundarySnapshot(),
        point: { x: 68, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 6, bias: -1 },
      inside: 0,
      rect: { x: 30, y: 20, width: 40, height: 24 }
    });
  });

  it("maps points in the left half of a block to the block start", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot,
        point: { x: 20, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 0, bias: 1 },
      inside: 0,
      rect: { x: 10, y: 20, width: 300, height: 24 }
    });
  });

  it("maps table cell hit targets before generic block-position mapping", () => {
    const tableSnapshot = {
      ...snapshot,
      hitTargets: [
        createTableCellHitTarget({
          range: { from: 2, to: 6 },
          rect: { x: 10, y: 20, width: 150, height: 28 }
        })
      ],
      root: {
        ...snapshot.root,
        children: [
          {
            id: "wordTable-0:layout",
            kind: "block",
            range: { from: 0, to: 20 },
            rect: { x: 10, y: 20, width: 300, height: 56 },
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: tableSnapshot,
        point: { x: 20, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 3, bias: 1 },
      inside: 2,
      rect: { x: 10, y: 20, width: 150, height: 28 },
      tableCell: {
        tableId: "wordTable-0",
        tablePos: 0,
        semanticCellId: "semantic:r0:c0:g1:1",
        originCellPos: 2,
        range: { from: 2, to: 6 },
        rect: { x: 10, y: 20, width: 150, height: 28 }
      }
    });
  });

  it("does not map table structural gaps through the table container position mapping", () => {
    const tableSnapshot = {
      ...snapshot,
      hitTargets: [
        createTableCellHitTarget({
          range: { from: 2, to: 6 },
          rect: { x: 10, y: 20, width: 100, height: 28 }
        }),
        createTableCellHitTarget({
          range: { from: 12, to: 16 },
          rect: { x: 10, y: 48, width: 100, height: 28 }
        }),
        createTableCellHitTarget({
          range: { from: 18, to: 22 },
          rect: { x: 110, y: 48, width: 100, height: 28 }
        })
      ],
      root: {
        ...snapshot.root,
        children: [
          {
            id: "table-layout",
            kind: "block",
            range: { from: 0, to: 24 },
            rect: { x: 10, y: 20, width: 300, height: 56 },
            table: createTableLayoutSnapshot({
              rect: { x: 10, y: 20, width: 300, height: 56 }
            }),
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: tableSnapshot,
        point: { x: 260, y: 34 }
      })
    ).toEqual({ kind: "miss" });
  });

  it("keeps nearest-caret drag hits inside the table across row borders", () => {
    const firstRowTarget = createTableCellHitTarget({
      range: { from: 2, to: 6 },
      rect: { x: 10, y: 20, width: 100, height: 28 }
    });
    const secondRowTarget = {
      ...createTableCellHitTarget({
        range: { from: 8, to: 12 },
        rect: { x: 10, y: 50, width: 100, height: 28 }
      }),
      id: "wordTable-0:hit:semantic:r1:c0:g1:1",
      semanticCellId: "semantic:r1:c0:g1:1",
      originExplicitCellId: "cell:r1:c0:g0:1",
      explicitCellIds: ["cell:r1:c0:g0:1"],
      originCellPos: 8
    } satisfies QuireTableHitTarget;
    const hitTargets = [firstRowTarget, secondRowTarget];
    const tableSnapshot = {
      ...snapshot,
      hitTargets,
      root: {
        ...snapshot.root,
        children: [
          {
            id: "table-layout",
            kind: "block",
            range: { from: 0, to: 14 },
            rect: { x: 10, y: 20, width: 100, height: 58 },
            table: {
              ...createTableLayoutSnapshot({
                rect: { x: 10, y: 20, width: 100, height: 58 }
              }),
              tableRange: { from: 0, to: 14 },
              hitTargets
            },
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: tableSnapshot,
        point: { x: 40, y: 49 }
      })
    ).toEqual({ kind: "miss" });
    expect(
      hitTestNearestCaretInQuireLayoutSnapshot({
        snapshot: tableSnapshot,
        point: { x: 40, y: 49 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 3, bias: 1 },
      inside: 2,
      rect: { x: 10, y: 20, width: 100, height: 28 },
      tableCell: {
        tableId: "wordTable-0",
        tablePos: 0,
        semanticCellId: "semantic:r0:c0:g1:1",
        originCellPos: 2,
        range: { from: 2, to: 6 },
        rect: { x: 10, y: 20, width: 100, height: 28 }
      }
    });
  });

  it("maps row-offset table slots to adjacent real-cell boundaries", () => {
    const tableSnapshot = {
      ...snapshot,
      root: {
        ...snapshot.root,
        children: [
          {
            id: "table-layout",
            kind: "block",
            range: { from: 0, to: 24 },
            rect: { x: 10, y: 20, width: 300, height: 84 },
            table: createTableLayoutSnapshot({
              rect: { x: 10, y: 20, width: 300, height: 84 },
              tracks: [
                { id: "column-0", columnIndex: 0, x: 10, width: 100 },
                { id: "column-1", columnIndex: 1, x: 110, width: 100 },
                { id: "column-2", columnIndex: 2, x: 210, width: 100 }
              ],
              rows: [
                {
                  id: "row-1",
                  sourceRowId: "row:r1",
                  rowIndex: 1,
                  isHeader: false,
                  cantSplit: false,
                  gridBefore: { side: "before", startColumn: 0, columnSpan: 1 },
                  gridAfter: { side: "after", startColumn: 2, columnSpan: 1 },
                  range: { from: 4, to: 8 },
                  rect: { x: 10, y: 48, width: 300, height: 28 }
                }
              ],
              cells: [
                createTableCellFragment({
                  id: "cell-r1-c1",
                  range: { from: 4, to: 8 },
                  gridRect: {
                    startRow: 1,
                    rowSpan: 1,
                    startColumn: 1,
                    columnSpan: 1
                  },
                  rect: { x: 110, y: 48, width: 100, height: 28 },
                  contentRect: { x: 115, y: 53, width: 90, height: 18 }
                })
              ]
            }),
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: tableSnapshot,
        point: { x: 40, y: 58 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 5, bias: 1 },
      inside: 4,
      rect: { x: 110, y: 48, width: 100, height: 28 },
      tableRowOffsetSlot: {
        kind: "table-row-offset-slot",
        tableId: "wordTable-0",
        tableRange: { from: 0, to: 24 },
        rowIndex: 1,
        columnIndex: 0,
        sourceKind: "row-offset",
        side: "before",
        rect: { x: 10, y: 48, width: 100, height: 28 }
      }
    });

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: tableSnapshot,
        point: { x: 240, y: 58 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 8, bias: -1 },
      inside: 4,
      rect: { x: 110, y: 48, width: 100, height: 28 },
      tableRowOffsetSlot: {
        kind: "table-row-offset-slot",
        tableId: "wordTable-0",
        tableRange: { from: 0, to: 24 },
        rowIndex: 1,
        columnIndex: 2,
        sourceKind: "row-offset",
        side: "after",
        rect: { x: 210, y: 48, width: 100, height: 28 }
      }
    });
  });

  it("maps nested-flow hits from sub-layout query products", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createSubLayoutQueryProductSnapshot(),
        point: { x: 37, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 6, bias: 0 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 }
    });
  });

  it("prefers identified sub-layout hits over repeated table structural targets", () => {
    const viewRegion = createTableCellRegion("rowspan-left", "page-5");
    const queryOwner = {
      sourceRootId: "table-cell:rowspan-left",
      sourceFragmentId: "wordTable-69#p5:source-flow:4682.4-4778.4",
      coordinateSpace: "document",
      sourceCoordinateSpace: "table-cell-local",
      region: viewRegion
    } satisfies QuireLayoutQueryProductOwner;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createRepeatedTableSubLayoutCompetingSnapshot(
          viewRegion,
          queryOwner
        ),
        point: { x: 174, y: 5965 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 5720, bias: 1 },
      inside: 5720,
      rect: { x: 173, y: 5960, width: 266, height: 96 },
      tableCell: {
        tableId: "wordTable-0",
        tablePos: 5861,
        semanticCellId: "semantic:r0:c0:g1:1",
        originCellPos: 2,
        range: { from: 5863, to: 5890 },
        rect: { x: 168, y: 5960, width: 276, height: 101 }
      },
      viewRegion,
      queryOwner
    });
  });

  it("prefers rendered text fragments over retained sub-layout hit targets", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createSubLayoutQueryProductSnapshotWithRenderedText(),
        point: { x: 37, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 6, bias: 0 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 }
    });
  });

  it("prefers identified sub-layout hits over rendered table source text", () => {
    const viewRegion = createTableCellRegion("cell-0-0", "page-1");
    const queryOwner = {
      sourceRootId: "table-cell:cell-0-0",
      sourceFragmentId: "wordTable-0#p1:source-flow:4-8",
      coordinateSpace: "document",
      sourceCoordinateSpace: "table-cell-local",
      region: viewRegion
    } satisfies QuireLayoutQueryProductOwner;

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createSubLayoutQueryProductSnapshotWithRenderedText(
          viewRegion,
          queryOwner
        ),
        point: { x: 37, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 6, bias: 0 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 },
      viewRegion,
      queryOwner
    });
  });

  it("maps nested-flow same-line blanks from cell-level sub-layout query products", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createSubLayoutQueryProductSnapshot(),
        point: { x: 130, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 8, bias: -1 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 }
    });
  });

  it("maps nested-flow trailing blanks from sub-layout query products", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createSubLayoutQueryProductSnapshot(),
        point: { x: 130, y: 70 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 8, bias: -1 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 }
    });
  });

  it("prefers the nearest split sub-layout fragment when retained hit targets overlap", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createOverlappingSubLayoutQueryProductSnapshot(),
        point: { x: 37, y: 94 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 22, bias: 0 },
      inside: 20,
      rect: { x: 15, y: 89, width: 40, height: 24 }
    });
  });

  it("prefers the nearest split sub-layout trailing target when broad blanks overlap", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createOverlappingSubLayoutQueryProductSnapshot(),
        point: { x: 130, y: 116 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 24, bias: -1 },
      inside: 20,
      rect: { x: 15, y: 89, width: 40, height: 24 }
    });
  });

  it("prefers later sibling sub-layout text over an earlier broad trailing target", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createSiblingSubLayoutQueryProductSnapshot(),
        point: { x: 37, y: 94 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 22, bias: 0 },
      inside: 20,
      rect: { x: 15, y: 89, width: 40, height: 24 }
    });
  });

  it("ignores retained sub-layout source geometry during pointer hit testing", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createSubLayoutQueryProductSnapshotWithSourceGeometry(),
        point: { x: 132, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 8, bias: -1 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 }
    });
  });

  it("does not map hidden sub-layout source overflow outside query products", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createSubLayoutQueryProductSnapshotWithSourceGeometry(),
        point: { x: 190, y: 30 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 20, bias: -1 },
      inside: 0,
      rect: { x: 10, y: 20, width: 300, height: 80 }
    });
  });

  it("maps blank clicks below ordinary text to the textblock content end", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTextFragmentSnapshot([
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
          }
        ]),
        point: { x: 130, y: 58 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 4, bias: -1 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
  });

  it("maps retained hit-target blanks to visible editable text end", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTableHitTargetWithVisibleTextSnapshot(),
        point: { x: 38, y: 72 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 8, bias: -1 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 },
      tableCell: createExpectedVisibleTableCellHit()
    });
  });

  it("maps table hit-target blanks through visible retained source geometry", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTableHitTargetWithSourceGeometryTextSnapshot(),
        point: { x: 38, y: 72 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 8, bias: -1 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 },
      tableCell: createExpectedVisibleTableCellHit()
    });
  });

  it("maps table blanks through the containing cell before global retained hits", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: createTableHitTargetWithCompetingSubLayoutSnapshot(),
        point: { x: 38, y: 72 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 8, bias: -1 },
      inside: 3,
      rect: { x: 15, y: 25, width: 40, height: 24 },
      tableCell: createExpectedVisibleTableCellHit()
    });
  });

  it("maps document blanks to nearest text when nearest-caret mode is requested", () => {
    const pageMarginSnapshot = createPageMarginTextSnapshot();

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: pageMarginSnapshot,
        point: { x: 130, y: 80 }
      })
    ).toEqual({ kind: "miss" });

    expect(
      hitTestNearestCaretInQuireLayoutSnapshot({
        snapshot: pageMarginSnapshot,
        point: { x: 130, y: 80 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 4, bias: -1 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
  });

  it("maps document blanks to retained sub-layout carets", () => {
    const sourceSnapshot = createSubLayoutQueryProductSnapshot();
    const tableSnapshot: QuireLayoutSnapshot = {
      ...sourceSnapshot,
      documentRect: { x: 10, y: 20, width: 300, height: 120 },
      root: {
        ...sourceSnapshot.root,
        rect: { x: 10, y: 20, width: 300, height: 120 }
      }
    };

    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot: tableSnapshot,
        point: { x: 54, y: 120 }
      })
    ).toEqual({ kind: "miss" });

    expect(
      hitTestNearestCaretInQuireLayoutSnapshot({
        snapshot: tableSnapshot,
        point: { x: 54, y: 120 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 8, bias: -1 },
      inside: 3,
      rect: { x: 55, y: 25, width: 1, height: 24 }
    });
  });

  it("maps points in the right half of a block to the block end", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot,
        point: { x: 260, y: 60 }
      })
    ).toEqual({
      kind: "position",
      position: { pos: 10, bias: -1 },
      inside: 5,
      rect: { x: 10, y: 52, width: 300, height: 24 }
    });
  });

  it("misses points outside the document rectangle", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot,
        point: { x: 400, y: 30 }
      })
    ).toEqual({ kind: "miss" });
  });

  it("misses points inside block gaps", () => {
    expect(
      hitTestExactQuireLayoutSnapshot({
        snapshot,
        point: { x: 20, y: 48 }
      })
    ).toEqual({ kind: "miss" });
  });
});

/**
 * Creates a retained control interaction hit for layer hit-test fixtures.
 *
 * @param controlId - Stable control id represented by the hit.
 * @param layer - Retained layer that owns the control.
 * @param pointerPolicy - Pointer policy declared by the control.
 * @returns Retained control interaction hit.
 */
function createControlInteractionHit(
  controlId: string,
  layer: QuireViewLayerRef,
  pointerPolicy: QuireViewPointerPolicy
): QuireViewInteractionHit {
  return {
    kind: "control",
    region: createControlRegion(controlId),
    controlId,
    layer,
    pointerPolicy
  };
}

/**
 * Creates a retained control region reference for layer hit-test fixtures.
 *
 * @param controlId - Stable control id represented by the region.
 * @returns Retained control region reference.
 */
function createControlRegion(controlId: string): QuireLayoutRegionRef {
  return {
    rootId: { value: "body-root" },
    regionId: { value: `${controlId}:region` },
    kind: "control"
  };
}

/**
 * Creates a retained table-cell region reference for hit-test fixtures.
 *
 * @param regionId - Stable region id represented by the table cell.
 * @param visualInstanceId - Page-local visual instance represented by the region.
 * @returns Retained table-cell region reference.
 */
function createTableCellRegion(
  regionId: string,
  visualInstanceId: string
): QuireLayoutRegionRef {
  return {
    rootId: { value: "table-cell:rowspan-left" },
    regionId: { value: `${regionId}:region` },
    visualInstanceId,
    kind: "table-cell"
  };
}

/**
 * Creates a table-cell hit target fixture.
 *
 * @param options - Target range and rectangle overrides.
 * @returns Table-cell hit target fixture.
 */
function createTableCellHitTarget(options: {
  /** Document range represented by the target. */
  readonly range: QuireTableHitTarget["range"];
  /** Document-space rectangle represented by the target. */
  readonly rect: QuireTableHitTarget["rect"];
}): QuireTableHitTarget {
  return {
    id: "wordTable-0:hit:semantic:r0:c0:g1:1",
    kind: "cell",
    tableId: "wordTable-0",
    semanticCellId: "semantic:r0:c0:g1:1",
    originExplicitCellId: "cell:r0:c0:g0:1",
    explicitCellIds: ["cell:r0:c0:g0:1"],
    originCellPos: 2,
    range: options.range,
    rect: options.rect
  };
}

/**
 * Creates expected structural cell facts for the visible-table fixtures.
 *
 * @returns Structural table-cell hit sidecar shared by blank-hit assertions.
 */
function createExpectedVisibleTableCellHit() {
  return {
    tableId: "wordTable-0",
    tablePos: 1,
    semanticCellId: "semantic:r0:c0:g1:1",
    originCellPos: 2,
    range: { from: 3, to: 12 },
    rect: { x: 10, y: 20, width: 150, height: 80 }
  };
}

/**
 * Creates table metadata for layout-node hit-test fixtures.
 *
 * @param options - Table rectangle represented by the fixture.
 * @returns Minimal table layout snapshot used to identify table-owned geometry.
 */
function createTableLayoutSnapshot(options: {
  /** Table rectangle in document coordinates. */
  readonly rect: QuireTableLayoutSnapshot["rect"];
  /** Optional table tracks represented by the fixture. */
  readonly tracks?: QuireTableLayoutSnapshot["tracks"] | undefined;
  /** Optional table row fragments represented by the fixture. */
  readonly rows?: QuireTableLayoutSnapshot["rows"] | undefined;
  /** Optional table cell fragments represented by the fixture. */
  readonly cells?: QuireTableLayoutSnapshot["cells"] | undefined;
}): QuireTableLayoutSnapshot {
  return {
    tableId: "wordTable-0",
    fragmentId: "wordTable-0",
    geometryId: "wordTable-0",
    tableRange: { from: 0, to: 24 },
    style: {
      backgroundColor: null,
      borderColor: "#cbd5e1",
      borderWidth: 1
    },
    borders: null,
    rect: options.rect,
    tracks: options.tracks ?? [],
    rows: options.rows ?? [],
    cells: options.cells ?? [],
    hitTargets: []
  };
}

/**
 * Creates one minimal table cell fragment for row-offset hit-test fixtures.
 *
 * @param options - Cell identity, range, grid rectangle, and visual rectangles.
 * @returns Table cell fragment with irrelevant style metadata omitted.
 */
function createTableCellFragment(options: {
  /** Stable cell fragment id. */
  readonly id: string;
  /** Editable document range represented by the cell. */
  readonly range: QuireTableCellFragment["range"];
  /** Source grid rectangle occupied by the cell. */
  readonly gridRect: QuireTableCellFragment["gridRect"];
  /** Full cell rectangle in document coordinates. */
  readonly rect: QuireTableCellFragment["rect"];
  /** Content rectangle inside the cell. */
  readonly contentRect: QuireTableCellFragment["contentRect"];
}): QuireTableCellFragment {
  return {
    id: options.id,
    semanticCellId: `semantic:${options.id}`,
    originExplicitCellId: `explicit:${options.id}`,
    explicitCellIds: [`explicit:${options.id}`],
    originCellPos: options.range.from,
    range: options.range,
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: options.gridRect,
    rect: options.rect,
    contentRect: options.contentRect,
    contentChildren: []
  };
}

/**
 * Creates a paginated row-span table snapshot where a repeated table structure
 * target overlaps a more specific identified sub-layout fragment.
 *
 * @param viewRegion - Region identity carried by the cell sub-layout hit.
 * @param queryOwner - Query owner identity carried by the cell sub-layout hit.
 * @returns Canvas layout snapshot with competing table and sub-layout hits.
 */
function createRepeatedTableSubLayoutCompetingSnapshot(
  viewRegion: QuireLayoutRegionRef,
  queryOwner: QuireLayoutQueryProductOwner
): QuireLayoutSnapshot {
  return {
    ...snapshot,
    documentRect: { x: 0, y: 0, width: 800, height: 6200 },
    viewportRect: { x: 0, y: 5800, width: 800, height: 500 },
    hitTargets: [
      createTableCellHitTarget({
        range: { from: 5863, to: 5890 },
        rect: { x: 168, y: 5960, width: 276, height: 101 }
      })
    ],
    root: {
      ...snapshot.root,
      range: { from: 4413, to: 7041 },
      rect: { x: 0, y: 5800, width: 800, height: 400 },
      children: [
        {
          id: "wordTable-69:layout#p5",
          kind: "block",
          range: { from: 5863, to: 5890 },
          rect: { x: 168, y: 5960, width: 553, height: 101 },
          subLayoutQueryProducts: {
            selectionRects: [
              {
                textFragmentId: "text-fragment-0",
                range: { from: 5720, to: 5835 },
                rect: { x: 173, y: 5960, width: 266, height: 96 },
                queryOwner
              }
            ],
            caretStops: [
              {
                textFragmentId: "text-fragment-0",
                position: { pos: 5720, bias: 1 },
                rect: { x: 173, y: 5960, width: 1, height: 24 },
                queryOwner
              },
              {
                textFragmentId: "text-fragment-0",
                position: { pos: 5721, bias: 0 },
                rect: { x: 185, y: 5960, width: 1, height: 24 },
                queryOwner
              },
              {
                textFragmentId: "text-fragment-0",
                position: { pos: 5835, bias: -1 },
                rect: { x: 439, y: 6032, width: 1, height: 24 },
                queryOwner
              }
            ],
            hitTargets: [
              {
                id: "wordTable-69:cell-r0-c0#p5:hit",
                range: { from: 5720, to: 5835 },
                rect: { x: 173, y: 5960, width: 266, height: 96 },
                viewRegion,
                queryOwner
              }
            ],
            inputAnchors: []
          },
          children: []
        }
      ]
    }
  };
}

/**
 * Creates a layout snapshot with supplied text fragments on a single block.
 *
 * @param textFragments - Text fragments to place on the first block.
 * @returns Canvas layout snapshot for hit-test fixtures.
 */
function createTextFragmentSnapshot(
  textFragments: NonNullable<
    NonNullable<QuireLayoutSnapshot["root"]["children"]>[number]["textFragments"]
  >
): QuireLayoutSnapshot {
  return {
    ...snapshot,
    documentRect: { x: 10, y: 20, width: 300, height: 48 },
    root: {
      ...snapshot.root,
      rect: { x: 10, y: 20, width: 300, height: 48 },
      children: [
        {
          id: "paragraph-0",
          kind: "block",
          range: { from: 0, to: 8 },
          rect: { x: 10, y: 20, width: 300, height: 48 },
          textFragments,
          children: []
        }
      ]
    }
  };
}

/**
 * Creates a textblock whose visible run is wrapped by one transparent inline.
 *
 * @returns Canvas layout snapshot with one-token source gaps at both edges.
 */
function createTransparentInlineBoundarySnapshot(): QuireLayoutSnapshot {
  return createTextFragmentSnapshot([{
    id: "paragraph-0:text-0",
    text: "Form",
    range: { from: 2, to: 6 },
    rect: { x: 30, y: 20, width: 40, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: 38,
    caretStops: [
      { position: { pos: 2, bias: 1 }, localX: 0 },
      { position: { pos: 3, bias: 0 }, localX: 10 },
      { position: { pos: 4, bias: 0 }, localX: 20 },
      { position: { pos: 5, bias: 0 }, localX: 30 },
      { position: { pos: 6, bias: -1 }, localX: 40 }
    ]
  }]);
}

/**
 * Creates a table snapshot where rendered text and retained query products both
 * cover the same point, but the retained hit target is less precise.
 *
 * @param viewRegion - Optional retained visual region identity for query products.
 * @param queryOwner - Optional query-product owner identity for query products.
 * @returns Canvas layout snapshot with competing text and sub-layout hits.
 */
function createSubLayoutQueryProductSnapshotWithRenderedText(
  viewRegion?: QuireLayoutRegionRef,
  queryOwner?: QuireLayoutQueryProductOwner
): QuireLayoutSnapshot {
  return {
    ...createSubLayoutQueryProductSnapshot(),
    root: {
      ...snapshot.root,
      range: { from: 0, to: 20 },
      rect: { x: 10, y: 20, width: 300, height: 80 },
      children: [
        {
          id: "wordTable-0:layout",
          kind: "block",
          range: { from: 0, to: 20 },
          rect: { x: 10, y: 20, width: 300, height: 80 },
          subLayoutQueryProducts: {
            selectionRects: [
              {
                textFragmentId: "text-fragment-1",
                range: { from: 4, to: 8 },
                rect: { x: 15, y: 25, width: 40, height: 24 },
                ...(queryOwner === undefined ? {} : { queryOwner })
              }
            ],
            caretStops: [
              {
                textFragmentId: "text-fragment-1",
                position: { pos: 4, bias: 1 },
                rect: { x: 15, y: 25, width: 1, height: 24 },
                ...(queryOwner === undefined ? {} : { queryOwner })
              },
              {
                textFragmentId: "text-fragment-1",
                position: { pos: 5, bias: 0 },
                rect: { x: 25, y: 25, width: 1, height: 24 },
                ...(queryOwner === undefined ? {} : { queryOwner })
              },
              {
                textFragmentId: "text-fragment-1",
                position: { pos: 6, bias: 0 },
                rect: { x: 35, y: 25, width: 1, height: 24 },
                ...(queryOwner === undefined ? {} : { queryOwner })
              },
              {
                textFragmentId: "text-fragment-1",
                position: { pos: 7, bias: 0 },
                rect: { x: 45, y: 25, width: 1, height: 24 },
                ...(queryOwner === undefined ? {} : { queryOwner })
              },
              {
                textFragmentId: "text-fragment-1",
                position: { pos: 8, bias: -1 },
                rect: { x: 55, y: 25, width: 1, height: 24 },
                ...(queryOwner === undefined ? {} : { queryOwner })
              }
            ],
            hitTargets: [
              {
                id: "wordTable-0:cell-0-0:fragment:coarse-hit",
                range: { from: 3, to: 12 },
                rect: { x: 15, y: 25, width: 40, height: 24 },
                ...(viewRegion === undefined ? {} : { viewRegion }),
                ...(queryOwner === undefined ? {} : { queryOwner })
              }
            ],
            inputAnchors: []
          },
          children: [createTableCellTextNode()]
        }
      ]
    }
  };
}

/**
 * Creates a retained table hit-target snapshot with visible editable text but
 * no sub-layout query products.
 *
 * @returns Canvas layout snapshot with a retained hit-target case.
 */
function createTableHitTargetWithVisibleTextSnapshot(): QuireLayoutSnapshot {
  return {
    ...snapshot,
    documentRect: { x: 10, y: 20, width: 300, height: 96 },
    hitTargets: [
      createTableCellHitTarget({
        range: { from: 3, to: 12 },
        rect: { x: 10, y: 20, width: 150, height: 80 }
      })
    ],
    root: {
      ...snapshot.root,
      range: { from: 0, to: 20 },
      rect: { x: 10, y: 20, width: 300, height: 96 },
      children: [
        {
          id: "wordTable-0:layout",
          kind: "block",
          range: { from: 0, to: 20 },
          rect: { x: 10, y: 20, width: 300, height: 80 },
          children: [createTableCellTextNode()]
        }
      ]
    }
  };
}

/**
 * Creates a retained table hit-target snapshot whose visible editable text is
 * stored as source geometry under the table shell.
 *
 * @returns Canvas layout snapshot with source-geometry text inside a hit target.
 */
function createTableHitTargetWithSourceGeometryTextSnapshot(): QuireLayoutSnapshot {
  const tableSnapshot = createTableHitTargetWithVisibleTextSnapshot();
  const tableNode = tableSnapshot.root.children![0]!;
  const textNode = createTableCellTextNode();

  return {
    ...tableSnapshot,
    root: {
      ...tableSnapshot.root,
      children: [
        {
          ...tableNode,
          children: [
            {
              ...textNode,
              interactionRole: "source-geometry"
            }
          ]
        }
      ]
    }
  };
}

/**
 * Creates a table hit-target snapshot where a global retained target overlaps
 * the same blank point as the visible cell.
 *
 * @returns Canvas layout snapshot with competing table and retained hits.
 */
function createTableHitTargetWithCompetingSubLayoutSnapshot(): QuireLayoutSnapshot {
  const tableSnapshot = createTableHitTargetWithVisibleTextSnapshot();
  const tableNode = tableSnapshot.root.children![0]!;

  return {
    ...tableSnapshot,
    root: {
      ...tableSnapshot.root,
      children: [
        {
          ...tableNode,
          subLayoutQueryProducts: {
            selectionRects: [
              {
                textFragmentId: "text-fragment-2",
                range: { from: 20, to: 24 },
                rect: { x: 15, y: 60, width: 40, height: 24 }
              }
            ],
            caretStops: [
              {
                textFragmentId: "text-fragment-2",
                position: { pos: 20, bias: 1 },
                rect: { x: 15, y: 60, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-2",
                position: { pos: 22, bias: 0 },
                rect: { x: 35, y: 60, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-2",
                position: { pos: 24, bias: -1 },
                rect: { x: 55, y: 60, width: 1, height: 24 }
              }
            ],
            hitTargets: [
              {
                id: "wordTable-1:cell-2-0:retained-overlap",
                range: { from: 20, to: 24 },
                rect: { x: 10, y: 20, width: 150, height: 80 }
              }
            ],
            inputAnchors: []
          }
        }
      ]
    }
  };
}

/**
 * Creates a rendered table-cell text node fixture.
 *
 * @returns Layout node with one text fragment and measured caret stops.
 */
function createTableCellTextNode(): NonNullable<
  QuireLayoutSnapshot["root"]["children"]
>[number] {
  return {
    id: "wordTable-0:cell-0-0:text",
    kind: "block",
    range: { from: 3, to: 12 },
    rect: { x: 15, y: 25, width: 40, height: 24 },
    textFragments: [
      {
        id: "wordTable-0:cell-0-0:text:line",
        text: "cell",
        range: { from: 4, to: 8 },
        rect: { x: 15, y: 25, width: 40, height: 24 },
        font: "16px sans-serif",
        lineHeight: 24,
        baseline: 43,
        caretStops: [
          { position: { pos: 4, bias: 1 }, localX: 0 },
          { position: { pos: 5, bias: 0 }, localX: 10 },
          { position: { pos: 6, bias: 0 }, localX: 20 },
          { position: { pos: 7, bias: 0 }, localX: 30 },
          { position: { pos: 8, bias: -1 }, localX: 40 }
        ]
      }
    ],
    children: []
  };
}

/**
 * Creates a table snapshot where a previous split fragment exposes a broad
 * trailing hit target that overlaps the next visible split fragment.
 *
 * @returns Canvas layout snapshot with overlapping retained hit targets.
 */
function createOverlappingSubLayoutQueryProductSnapshot(): QuireLayoutSnapshot {
  return {
    ...snapshot,
    documentRect: { x: 10, y: 20, width: 300, height: 120 },
    root: {
      ...snapshot.root,
      range: { from: 0, to: 30 },
      rect: { x: 10, y: 20, width: 300, height: 120 },
      children: [
        {
          id: "wordTable-0:layout",
          kind: "block",
          range: { from: 0, to: 30 },
          rect: { x: 10, y: 20, width: 300, height: 120 },
          subLayoutQueryProducts: {
            selectionRects: [
              {
                textFragmentId: "text-fragment-3",
                range: { from: 4, to: 8 },
                rect: { x: 15, y: 25, width: 40, height: 24 }
              },
              {
                textFragmentId: "text-fragment-4",
                range: { from: 20, to: 24 },
                rect: { x: 15, y: 89, width: 40, height: 24 }
              }
            ],
            caretStops: [
              {
                textFragmentId: "text-fragment-3",
                position: { pos: 4, bias: 1 },
                rect: { x: 15, y: 25, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-3",
                position: { pos: 8, bias: -1 },
                rect: { x: 55, y: 25, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-4",
                position: { pos: 20, bias: 1 },
                rect: { x: 15, y: 89, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-4",
                position: { pos: 21, bias: 0 },
                rect: { x: 25, y: 89, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-4",
                position: { pos: 22, bias: 0 },
                rect: { x: 35, y: 89, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-4",
                position: { pos: 23, bias: 0 },
                rect: { x: 45, y: 89, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-4",
                position: { pos: 24, bias: -1 },
                rect: { x: 55, y: 89, width: 1, height: 24 }
              }
            ],
            hitTargets: [
              {
                id: "wordTable-0:cell-0-0:previous:trailing-hit",
                range: { from: 4, to: 8 },
                rect: { x: 10, y: 20, width: 150, height: 100 }
              },
              {
                id: "wordTable-0:cell-0-0:next:hit",
                range: { from: 20, to: 24 },
                rect: { x: 15, y: 89, width: 40, height: 24 }
              },
              {
                id: "wordTable-0:cell-0-0:next:trailing-hit",
                range: { from: 20, to: 24 },
                rect: { x: 10, y: 84, width: 150, height: 36 }
              }
            ],
            inputAnchors: []
          },
          children: []
        }
      ]
    }
  };
}

/**
 * Creates split table siblings where an earlier broad trailing target overlaps
 * the visible text target in a later sibling.
 *
 * @returns Canvas layout snapshot with sibling-level retained hit overlap.
 */
function createSiblingSubLayoutQueryProductSnapshot(): QuireLayoutSnapshot {
  return {
    ...snapshot,
    documentRect: { x: 10, y: 20, width: 300, height: 120 },
    root: {
      ...snapshot.root,
      range: { from: 0, to: 30 },
      rect: { x: 10, y: 20, width: 300, height: 120 },
      children: [
        {
          id: "wordTable-0:layout:p0",
          kind: "block",
          range: { from: 0, to: 12 },
          rect: { x: 10, y: 20, width: 300, height: 100 },
          subLayoutQueryProducts: {
            selectionRects: [
              {
                textFragmentId: "text-fragment-5",
                range: { from: 4, to: 8 },
                rect: { x: 15, y: 25, width: 40, height: 24 }
              }
            ],
            caretStops: [
              {
                textFragmentId: "text-fragment-5",
                position: { pos: 4, bias: 1 },
                rect: { x: 15, y: 25, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-5",
                position: { pos: 8, bias: -1 },
                rect: { x: 55, y: 25, width: 1, height: 24 }
              }
            ],
            hitTargets: [
              {
                id: "wordTable-0:cell-0-0:p0:trailing-hit",
                range: { from: 4, to: 8 },
                rect: { x: 10, y: 20, width: 150, height: 100 }
              }
            ],
            inputAnchors: []
          },
          children: []
        },
        {
          id: "wordTable-0:layout:p1",
          kind: "block",
          range: { from: 12, to: 30 },
          rect: { x: 10, y: 84, width: 300, height: 36 },
          subLayoutQueryProducts: {
            selectionRects: [
              {
                textFragmentId: "text-fragment-6",
                range: { from: 20, to: 24 },
                rect: { x: 15, y: 89, width: 40, height: 24 }
              }
            ],
            caretStops: [
              {
                textFragmentId: "text-fragment-6",
                position: { pos: 20, bias: 1 },
                rect: { x: 15, y: 89, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-6",
                position: { pos: 21, bias: 0 },
                rect: { x: 25, y: 89, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-6",
                position: { pos: 22, bias: 0 },
                rect: { x: 35, y: 89, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-6",
                position: { pos: 23, bias: 0 },
                rect: { x: 45, y: 89, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-6",
                position: { pos: 24, bias: -1 },
                rect: { x: 55, y: 89, width: 1, height: 24 }
              }
            ],
            hitTargets: [
              {
                id: "wordTable-0:cell-0-0:p1:hit",
                range: { from: 20, to: 24 },
                rect: { x: 15, y: 89, width: 40, height: 24 }
              }
            ],
            inputAnchors: []
          },
          children: []
        }
      ]
    }
  };
}

/**
 * Creates a table snapshot with retained source geometry below query products.
 *
 * @returns Canvas layout snapshot with non-interactive retained source children.
 */
function createSubLayoutQueryProductSnapshotWithSourceGeometry(): QuireLayoutSnapshot {
  const productSnapshot = createSubLayoutQueryProductSnapshot();

  return {
    ...productSnapshot,
    root: {
      ...productSnapshot.root,
      children: [
        {
          ...productSnapshot.root.children![0]!,
          children: [
            {
              id: "wordTable-0:cell-source",
              kind: "block",
              range: { from: 3, to: 12 },
              rect: { x: 15, y: 25, width: 220, height: 24 },
              interactionRole: "source-geometry",
              textFragments: [
                {
                  id: "wordTable-0:cell-source:text",
                  text: "hidden retained overflow",
                  range: { from: 4, to: 28 },
                  rect: { x: 15, y: 25, width: 220, height: 24 },
                  font: "16px sans-serif",
                  lineHeight: 24,
                  baseline: 43,
                  caretStops: [
                    { position: { pos: 4, bias: 1 }, localX: 0 },
                    { position: { pos: 8, bias: -1 }, localX: 40 },
                    { position: { pos: 20, bias: 0 }, localX: 120 },
                    { position: { pos: 28, bias: -1 }, localX: 220 }
                  ]
                }
              ],
              children: []
            }
          ]
        }
      ]
    }
  };
}

/**
 * Creates a table snapshot whose nested flow is represented only by sub-layout
 * query products, without flattened child layout nodes.
 *
 * @returns Canvas layout snapshot with retained nested-flow query products.
 */
function createSubLayoutQueryProductSnapshot(): QuireLayoutSnapshot {
  return {
    ...snapshot,
    documentRect: { x: 10, y: 20, width: 300, height: 80 },
    root: {
      ...snapshot.root,
      range: { from: 0, to: 20 },
      rect: { x: 10, y: 20, width: 300, height: 80 },
      children: [
        {
          id: "wordTable-0:layout",
          kind: "block",
          range: { from: 0, to: 20 },
          rect: { x: 10, y: 20, width: 300, height: 80 },
          subLayoutQueryProducts: {
            selectionRects: [
              {
                textFragmentId: "text-fragment-7",
                range: { from: 4, to: 8 },
                rect: { x: 15, y: 25, width: 40, height: 24 }
              }
            ],
            caretStops: [
              {
                textFragmentId: "text-fragment-7",
                position: { pos: 4, bias: 1 },
                rect: { x: 15, y: 25, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-7",
                position: { pos: 5, bias: 0 },
                rect: { x: 25, y: 25, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-7",
                position: { pos: 6, bias: 0 },
                rect: { x: 35, y: 25, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-7",
                position: { pos: 7, bias: 0 },
                rect: { x: 45, y: 25, width: 1, height: 24 }
              },
              {
                textFragmentId: "text-fragment-7",
                position: { pos: 8, bias: -1 },
                rect: { x: 55, y: 25, width: 1, height: 24 }
              }
            ],
            hitTargets: [
              {
                id: "wordTable-0:cell-0-0:fragment:hit",
                range: { from: 3, to: 12 },
                rect: { x: 15, y: 25, width: 40, height: 24 }
              },
              {
                id: "wordTable-0:cell-0-0:fragment:trailing-hit",
                range: { from: 3, to: 12 },
                rect: { x: 10, y: 20, width: 150, height: 60 }
              }
            ],
            inputAnchors: []
          },
          children: []
        }
      ]
    }
  };
}

/**
 * Creates a layout snapshot with ordinary text above page-margin blank space.
 *
 * @returns Canvas layout snapshot for drag nearest-caret hit-test fixtures.
 */
function createPageMarginTextSnapshot(): QuireLayoutSnapshot {
  const textSnapshot = createTextFragmentSnapshot([
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
    }
  ]);

  return {
    ...textSnapshot,
    documentRect: { x: 10, y: 20, width: 300, height: 120 },
    root: {
      ...textSnapshot.root,
      rect: { x: 10, y: 20, width: 300, height: 120 },
      children: (textSnapshot.root.children ?? []).map((node) => ({
        ...node,
        rect: { x: 10, y: 20, width: 300, height: 24 }
      }))
    }
  };
}
