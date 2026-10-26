import type { CanvasMountedViewRenderEvent } from "@quirekit/view";
import type { HtmlMountedViewRuntimeOptions } from "@quirekit/view-html";
import type { QuireMountedViewRenderEvent } from "@quirekit/view";
import { describe, expect, it } from "vitest";
import { createQuireDevtools } from "./devtools";
import { summarizeCanvasRenderEvent, summarizeMountedRenderEvent } from "./render";

/** Existing retained HTML callback event shape used by the fixture. */
type TestHtmlMountedRenderEvent = Parameters<
  NonNullable<HtmlMountedViewRuntimeOptions["onRender"]>
>[0];

describe("canvas render devtools adapter", () => {
  it("summarizes canvas mounted render events", () => {
    expect(summarizeCanvasRenderEvent(createRenderEvent())).toEqual({
      viewId: "primary",
      mode: "canvas",
      strategy: "selection-update",
      commandCount: 3,
      blockCount: 2,
      caretCount: 1,
      selectionRangeCount: 2,
      overlayCount: 1,
      documentRect: { x: 0, y: 0, width: 320, height: 240 },
      viewportRect: { x: 10, y: 20, width: 300, height: 200 },
      displayWidth: 640,
      displayHeight: 480,
      devicePixelRatio: 2
    });
  });

  it("summarizes measured canvas render phases", () => {
    expect(summarizeCanvasRenderEvent(createRenderEventWithPhases())).toEqual(
      expect.objectContaining({
        durationMs: 12,
        phases: [
          {
            name: "build-render-result",
            startedAt: 30,
            endedAt: 38,
            durationMs: 8
          },
          {
            name: "paint",
            startedAt: 38,
            endedAt: 42,
            durationMs: 4
          }
        ]
      })
    );
  });

  it("preserves retained Canvas page content cache diagnostics", () => {
    const event = {
      ...createRenderEvent(),
      pageContentCache: {
        liveSurfaceSkips: 3,
        bitmapRestores: 2,
        displayListPaints: 4,
        bitmapStores: 4,
        bitmapReplacements: 0,
        bitmapEvictions: 1,
        oversizedBitmapSkips: 0,
        retainedBitmapEntries: 3,
        retainedBitmapBytes: 72_000,
        maxBitmapBytes: 96_000
      }
    } satisfies CanvasMountedViewRenderEvent;

    expect(summarizeCanvasRenderEvent(event)).toEqual(expect.objectContaining({
      pageContentCache: event.pageContentCache
    }));
  });

  it("preserves retained HTML diagnostics in the render summary", () => {
    const event = {
      ...createRenderEventWithPhases(),
      view: { id: "html-primary", mode: "html" },
      diagnostics: {
        schedulerEvidence: "available",
        reconciliationFrames: 1,
        rootReplacements: 0
      }
    } as unknown as TestHtmlMountedRenderEvent;

    expect(summarizeMountedRenderEvent(event)).toEqual(
      expect.objectContaining({
        retainedHtml: expect.objectContaining({
          schedulerEvidence: "available",
          reconciliationFrames: 1,
          rootReplacements: 0
        })
      })
    );
  });

  it("summarizes render cache counters", () => {
    expect(summarizeCanvasRenderEvent(createRenderEventWithCacheCounters())).toEqual(
      expect.objectContaining({
        cacheCounters: {
          layoutProduct: {
            rebuilt: 1,
            reused: 0,
            fallbackReason: null
          },
          blockShape: {
            fragmentHits: 4,
            fragmentMisses: 1,
            fragmentStores: 1,
            inputHits: 3,
            inputMisses: 1,
            inputStores: 1,
            topLevelInputExactHits: 2,
            topLevelInputShiftHits: 1,
            topLevelInputMisses: 1,
            topLevelInputStores: 4,
            localShapeHits: 2,
            localShapeMisses: 1,
            localShapeStores: 1,
            localShapeSuffixHits: 1,
            localShapeConvergedSuffixHits: 1,
            localShapeConvergenceMisses: 2,
            localShapeReuseMisses: 3,
          },
          retainedBlock: {
            commits: 1,
            reconciledRecords: 4,
            rebuiltRecords: 1,
            reusedRecords: 3,
            projectedRecords: 4,
            removedRecords: 0,
            heightIndexRebuilds: 1,
            heightIndexDeltaBatches: 0,
            heightIndexUpdatedEntries: 0,
            heightIndexQueries: 4,
            debugFlowComparisons: 0,
            providerExecution: {
              snapshotEpochs: 1,
              openedExecutions: 2,
              suppliedContinuations: 0,
              committedContinuations: 2,
              discardedContinuations: 0,
              canceledJobs: 0
            }
          },
          measuredSource: {
            hits: 6,
            exactHits: 3,
            shiftedTextHits: 2,
            shiftedLeafHits: 1,
            misses: 1,
            stores: 1,
            textPrefixHits: 2,
            textPrefixMisses: 1,
            textPrefixReusedItems: 4,
            bodyPrefixHits: 2,
            bodyPrefixMisses: 1,
            bodyPrefixReusedItems: 4,
            bodySuffixHits: 1,
            bodySuffixMisses: 1,
            bodySuffixReusedItems: 3
          },
          paginationCheckpoint: {
            prefixHits: 2,
            prefixMisses: 1,
            prefixPagesReused: 6,
            convergenceHits: 1,
            convergenceMisses: 1,
            suffixPagesReused: 4,
            pagesRecomputed: 3,
            stores: 3
          },
          displayCommand: {
            hits: 7,
            identityHits: 3,
            identityShiftHits: 2,
            shiftSignatureHits: 1,
            sourceShiftHits: 0,
            textNodeHits: 2,
            textNodeMisses: 1,
            textNodeStores: 1,
            misses: 1,
            stores: 1
          }
        }
      })
    );
  });

  it("summarizes typed render update patches", () => {
    expect(summarizeCanvasRenderEvent(createRenderEventWithUpdatePatch())).toEqual(
      expect.objectContaining({
        updatePatch: {
          sourceReason: "transaction",
          transactionCount: 1,
          docChanged: true,
          selectionChanged: true,
          compositionChanged: false,
          causes: ["content", "selection"],
          invalidatedProducts: ["layout", "content", "overlay"]
        }
      })
    );
  });

  it("uses the render phase span instead of double-counting nested phases", () => {
    expect(summarizeCanvasRenderEvent(createNestedRenderEventWithPhases())).toEqual(
      expect.objectContaining({
        durationMs: 14,
        phases: expect.arrayContaining([
          expect.objectContaining({ name: "build-render-result", durationMs: 12 }),
          expect.objectContaining({ name: "layout:collect", durationMs: 10 }),
          expect.objectContaining({ name: "paint", durationMs: 2 })
        ])
      })
    );
  });

  it("records render entries and exposes the latest render snapshot", () => {
    let now = 20;
    const devtools = createQuireDevtools({
      clock: () => {
        const current = now;
        now += 7;
        return current;
      }
    });

    devtools.onCanvasRender(createRenderEvent());

    expect(devtools.getEntries()).toEqual([
      expect.objectContaining({
        kind: "render",
        startedAt: 20,
        endedAt: 20,
        durationMs: 0,
        measured: false,
        render: expect.objectContaining({
          viewId: "primary",
          commandCount: 3,
          blockCount: 2
        })
      })
    ]);
    expect(devtools.getSnapshot().latestRender).toEqual(
      expect.objectContaining({
        viewId: "primary",
        commandCount: 3,
        blockCount: 2
      })
    );
  });

  it("records measured render entries when canvas reports phases", () => {
    let now = 20;
    const devtools = createQuireDevtools({
      clock: () => now,
      slowThresholdMs: 10
    });

    devtools.onCanvasRender(createRenderEventWithPhases());

    expect(devtools.getEntries()).toEqual([
      expect.objectContaining({
        kind: "render",
        startedAt: 20,
        endedAt: 32,
        durationMs: 12,
        measured: true,
        slow: true,
        render: expect.objectContaining({
          durationMs: 12,
          phases: expect.arrayContaining([
            expect.objectContaining({ name: "build-render-result", durationMs: 8 }),
            expect.objectContaining({ name: "paint", durationMs: 4 })
          ])
        })
      })
    ]);
  });

  it("records per-render cache counter deltas", () => {
    let now = 20;
    const devtools = createQuireDevtools({
      clock: () => now
    });
    const secondCounters = {
      ...createDefaultRenderCacheCounters(),
      retainedBlock: {
        commits: 2,
        reconciledRecords: 8,
        rebuiltRecords: 2,
        reusedRecords: 6,
        projectedRecords: 8,
        removedRecords: 0,
        heightIndexRebuilds: 1,
        heightIndexDeltaBatches: 1,
        heightIndexUpdatedEntries: 1,
        heightIndexQueries: 8,
        debugFlowComparisons: 0,
        providerExecution: {
          snapshotEpochs: 2,
          openedExecutions: 5,
          suppliedContinuations: 2,
          committedContinuations: 5,
          discardedContinuations: 1,
          canceledJobs: 0
        }
      },
      measuredSource: {
        hits: 9,
        exactHits: 5,
        shiftedTextHits: 3,
        shiftedLeafHits: 1,
        misses: 4,
        stores: 3,
        textPrefixHits: 5,
        textPrefixMisses: 3,
        textPrefixReusedItems: 9,
        bodyPrefixHits: 5,
        bodyPrefixMisses: 3,
        bodyPrefixReusedItems: 9,
        bodySuffixHits: 3,
        bodySuffixMisses: 2,
        bodySuffixReusedItems: 7
      },
      paginationCheckpoint: {
        prefixHits: 5,
        prefixMisses: 2,
        prefixPagesReused: 14,
        convergenceHits: 3,
        convergenceMisses: 1,
        suffixPagesReused: 9,
        pagesRecomputed: 7,
        stores: 7
      },
      displayCommand: {
        hits: 10,
        identityHits: 4,
        identityShiftHits: 3,
        shiftSignatureHits: 1,
        sourceShiftHits: 0,
        textNodeHits: 4,
        textNodeMisses: 3,
        textNodeStores: 2,
        misses: 3,
        stores: 2
      }
    };

    devtools.onCanvasRender(createRenderEventWithCacheCounters());
    devtools.onCanvasRender(createRenderEventWithCacheCounters(secondCounters));

    expect(devtools.getEntries().at(-1)).toEqual(
      expect.objectContaining({
        kind: "render",
        render: expect.objectContaining({
          cacheCounterDelta: expect.objectContaining({
            layoutProduct: {
              rebuilt: 0,
              reused: 0,
              fallbackReason: null
            },
            retainedBlock: {
              commits: 1,
              reconciledRecords: 4,
              rebuiltRecords: 1,
              reusedRecords: 3,
              projectedRecords: 4,
              removedRecords: 0,
              heightIndexRebuilds: 0,
              heightIndexDeltaBatches: 1,
              heightIndexUpdatedEntries: 1,
              heightIndexQueries: 4,
              debugFlowComparisons: 0,
              providerExecution: {
                snapshotEpochs: 1,
                openedExecutions: 3,
                suppliedContinuations: 2,
                committedContinuations: 3,
                discardedContinuations: 1,
                canceledJobs: 0
              }
            },
            measuredSource: {
              hits: 3,
              exactHits: 2,
              shiftedTextHits: 1,
              shiftedLeafHits: 0,
              misses: 3,
              stores: 2,
              textPrefixHits: 3,
              textPrefixMisses: 2,
              textPrefixReusedItems: 5,
              bodyPrefixHits: 3,
              bodyPrefixMisses: 2,
              bodyPrefixReusedItems: 5,
              bodySuffixHits: 2,
              bodySuffixMisses: 1,
              bodySuffixReusedItems: 4
            },
            paginationCheckpoint: {
              prefixHits: 3,
              prefixMisses: 1,
              prefixPagesReused: 8,
              convergenceHits: 2,
              convergenceMisses: 0,
              suffixPagesReused: 5,
              pagesRecomputed: 4,
              stores: 4
            },
            displayCommand: {
              hits: 3,
              identityHits: 1,
              identityShiftHits: 1,
              shiftSignatureHits: 0,
              sourceShiftHits: 0,
              textNodeHits: 2,
              textNodeMisses: 2,
              textNodeStores: 1,
              misses: 2,
              stores: 1
            }
          })
        })
      })
    );
    expect(devtools.getSnapshot().latestRender).toEqual(
      expect.objectContaining({
        cacheCounterDelta: expect.objectContaining({
          displayCommand: {
            hits: 3,
            identityHits: 1,
            identityShiftHits: 1,
            shiftSignatureHits: 0,
            sourceShiftHits: 0,
            textNodeHits: 2,
            textNodeMisses: 2,
            textNodeStores: 1,
            misses: 2,
            stores: 1
          }
        })
      })
    );
  });

  it("records layout-product deltas while retaining the current fallback reason", () => {
    const devtools = createQuireDevtools();
    const snapshots = [
      { rebuilt: 4, reused: 10, fallbackReason: "initial" },
      { rebuilt: 5, reused: 10, fallbackReason: "layout-inputs" },
      { rebuilt: 5, reused: 12, fallbackReason: null },
      { rebuilt: 5, reused: 12, fallbackReason: "unknown-layout-provider:external" },
      { rebuilt: 5, reused: 12, fallbackReason: null }
    ];
    for (const layoutProduct of snapshots) {
      devtools.onCanvasRender(createRenderEventWithCacheCounters({
        ...createDefaultRenderCacheCounters(), layoutProduct
      }));
    }
    expect(devtools.getEntries().map(entry => entry.kind === "render"
      ? entry.render.cacheCounterDelta?.layoutProduct : undefined)).toEqual([
      { rebuilt: 4, reused: 10, fallbackReason: "initial" },
      { rebuilt: 1, reused: 0, fallbackReason: "layout-inputs" },
      { rebuilt: 0, reused: 2, fallbackReason: null },
      { rebuilt: 0, reused: 0, fallbackReason: "unknown-layout-provider:external" },
      { rebuilt: 0, reused: 0, fallbackReason: null }
    ]);
    expect(devtools.getSnapshot().latestRender?.cacheCounters?.layoutProduct).toEqual(snapshots.at(-1));
    devtools.destroy();
  });

  it("uses current layout-product values when a cumulative counter resets", () => {
    const devtools = createQuireDevtools();
    for (const layoutProduct of [
      { rebuilt: 5, reused: 10, fallbackReason: null },
      { rebuilt: 2, reused: 12, fallbackReason: "initial" },
      { rebuilt: 3, reused: 1, fallbackReason: "layout-inputs" }
    ]) {
      devtools.onCanvasRender(createRenderEventWithCacheCounters({
        ...createDefaultRenderCacheCounters(), layoutProduct
      }));
    }
    expect(devtools.getEntries().map(entry => entry.kind === "render"
      ? entry.render.cacheCounterDelta?.layoutProduct : undefined)).toEqual([
      { rebuilt: 5, reused: 10, fallbackReason: null },
      { rebuilt: 2, reused: 2, fallbackReason: "initial" },
      { rebuilt: 1, reused: 1, fallbackReason: "layout-inputs" }
    ]);
    devtools.destroy();
  });

  it.each([
    { id: "secondary", mode: "canvas" },
    { id: "primary", mode: "svg" }
  ] as const)("isolates layout-product baselines for $id/$mode", (view) => {
    const devtools = createQuireDevtools();
    const first = createRenderEventWithCacheCounters({
      ...createDefaultRenderCacheCounters(),
      layoutProduct: { rebuilt: 4, reused: 9, fallbackReason: null }
    });
    devtools.onCanvasRender(first);
    devtools.onRender({ ...first, view } as unknown as QuireMountedViewRenderEvent);
    expect(devtools.getSnapshot().latestRender?.cacheCounterDelta?.layoutProduct)
      .toEqual({ rebuilt: 4, reused: 9, fallbackReason: null });
    devtools.onCanvasRender(createRenderEventWithCacheCounters({
      ...createDefaultRenderCacheCounters(),
      layoutProduct: { rebuilt: 5, reused: 12, fallbackReason: null }
    }));
    expect(devtools.getSnapshot().latestRender?.cacheCounterDelta?.layoutProduct)
      .toEqual({ rebuilt: 1, reused: 3, fallbackReason: null });
    devtools.destroy();
  });

  it("reports missing legacy layout-product evidence as unavailable", () => {
    const devtools = createQuireDevtools();
    const { layoutProduct: _omitted, ...legacy } = createDefaultRenderCacheCounters();
    // Old runtime payloads can omit a field required by the current public type.
    devtools.onCanvasRender(createRenderEventWithCacheCounters(
      legacy as ReturnType<typeof createDefaultRenderCacheCounters>
    ));
    expect(devtools.getSnapshot().latestRender?.cacheCounterDelta?.layoutProduct)
      .toEqual({ rebuilt: 0, reused: 0, fallbackReason: "unavailable" });
    devtools.onCanvasRender(createRenderEventWithCacheCounters());
    expect(devtools.getSnapshot().latestRender?.cacheCounterDelta?.layoutProduct)
      .toEqual({ rebuilt: 1, reused: 0, fallbackReason: null });
    devtools.destroy();
  });

  it("records measured render entries from SVG mounted render events", () => {
    let now = 20;
    const devtools = createQuireDevtools({
      clock: () => now
    });

    devtools.onRender(createSvgRenderEventWithPhases());

    expect(devtools.getEntries()).toEqual([
      expect.objectContaining({
        kind: "render",
        measured: true,
        render: expect.objectContaining({
          viewId: "svg-primary",
          mode: "svg",
          strategy: "full",
          durationMs: 12,
          phases: expect.arrayContaining([
            expect.objectContaining({ name: "build-render-result", durationMs: 8 }),
            expect.objectContaining({ name: "page-stack-paint", durationMs: 4 })
          ])
        })
      })
    ]);
  });
});

/**
 * Creates a minimal canvas render event for devtools tests.
 *
 * @returns Canvas render event fixture.
 */
function createRenderEvent(): CanvasMountedViewRenderEvent {
  return {
    view: { id: "primary", mode: "canvas" },
    strategy: "selection-update",
    viewportRect: { x: 10, y: 20, width: 300, height: 200 },
    displaySize: { width: 640, height: 480 },
    devicePixelRatio: 2,
    renderResult: {
      displayList: { commands: [{}, {}, {}] },
      layoutSnapshot: {
        root: { children: [{}, {}] },
        documentRect: { x: 0, y: 0, width: 320, height: 240 },
        viewportRect: { x: 10, y: 20, width: 300, height: 200 }
      },
      selectionGeometry: {
        carets: [{}],
        ranges: [{}, {}]
      },
      domOverlays: [{}]
    }
  } as unknown as CanvasMountedViewRenderEvent;
}

/**
 * Creates a canvas render event with measured phase timings.
 *
 * @returns Canvas render event fixture with phase timings.
 */
function createRenderEventWithPhases(): CanvasMountedViewRenderEvent {
  return {
    ...createRenderEvent(),
    phases: [
      {
        name: "build-render-result",
        startedAt: 30,
        endedAt: 38,
        durationMs: 8
      },
      {
        name: "paint",
        startedAt: 38,
        endedAt: 42,
        durationMs: 4
      }
    ]
  } as unknown as CanvasMountedViewRenderEvent;
}

/**
 * Creates a canvas render event with nested measured phase timings.
 *
 * @returns Canvas render event fixture with nested phase timings.
 */
function createNestedRenderEventWithPhases(): CanvasMountedViewRenderEvent {
  return {
    ...createRenderEvent(),
    phases: [
      {
        name: "build-render-result",
        startedAt: 30,
        endedAt: 42,
        durationMs: 12
      },
      {
        name: "layout:collect",
        startedAt: 31,
        endedAt: 41,
        durationMs: 10
      },
      {
        name: "paint",
        startedAt: 42,
        endedAt: 44,
        durationMs: 2
      }
    ]
  } as unknown as CanvasMountedViewRenderEvent;
}

/**
 * Creates a canvas render event with cache diagnostics.
 *
 * @returns Canvas render event fixture with cache counters.
 */
function createRenderEventWithCacheCounters(
  cacheCounters: NonNullable<CanvasMountedViewRenderEvent["renderResult"]["cacheCounters"]> =
    createDefaultRenderCacheCounters()
): CanvasMountedViewRenderEvent {
  return {
    ...createRenderEvent(),
    renderResult: {
      ...createRenderEvent().renderResult,
      cacheCounters
    }
  } as unknown as CanvasMountedViewRenderEvent;
}

/**
 * Creates a canvas render event with a typed update patch.
 *
 * @returns Canvas render event fixture with update patch diagnostics.
 */
function createRenderEventWithUpdatePatch(): CanvasMountedViewRenderEvent {
  return {
    ...createRenderEvent(),
    renderResult: {
      ...createRenderEvent().renderResult,
      updatePatch: {
        sourceReason: "transaction",
        transactionCount: 1,
        docChanged: true,
        selectionChanged: true,
        compositionChanged: false,
        causes: ["content", "selection"],
        invalidatedProducts: ["layout", "content", "overlay"],
        layoutDirtyRange: null
      }
    }
  } as unknown as CanvasMountedViewRenderEvent;
}

/**
 * Creates default render cache counters for tests.
 *
 * @returns Render cache counter fixture.
 */
function createDefaultRenderCacheCounters(): NonNullable<
  CanvasMountedViewRenderEvent["renderResult"]["cacheCounters"]
> {
  return {
    layoutProduct: {
      rebuilt: 1,
      reused: 0,
      fallbackReason: null
    },
    retainedBlock: {
      commits: 1,
      reconciledRecords: 4,
      rebuiltRecords: 1,
      reusedRecords: 3,
      projectedRecords: 4,
      removedRecords: 0,
      heightIndexRebuilds: 1,
      heightIndexDeltaBatches: 0,
      heightIndexUpdatedEntries: 0,
      heightIndexQueries: 4,
      debugFlowComparisons: 0,
      providerExecution: {
        snapshotEpochs: 1,
        openedExecutions: 2,
        suppliedContinuations: 0,
        committedContinuations: 2,
        discardedContinuations: 0,
        canceledJobs: 0
      }
    },
    blockShape: {
      fragmentHits: 4,
      fragmentMisses: 1,
      fragmentStores: 1,
      inputHits: 3,
      inputMisses: 1,
      inputStores: 1,
      topLevelInputExactHits: 2,
      topLevelInputShiftHits: 1,
      topLevelInputMisses: 1,
      topLevelInputStores: 4,
      localShapeHits: 2,
      localShapeMisses: 1,
      localShapeStores: 1,
      localShapeSuffixHits: 1,
      localShapeConvergedSuffixHits: 1,
      localShapeConvergenceMisses: 2,
      localShapeReuseMisses: 3,
    },
    measuredSource: {
      hits: 6,
      exactHits: 3,
      shiftedTextHits: 2,
      shiftedLeafHits: 1,
      misses: 1,
      stores: 1,
      textPrefixHits: 2,
      textPrefixMisses: 1,
      textPrefixReusedItems: 4,
      bodyPrefixHits: 2,
      bodyPrefixMisses: 1,
      bodyPrefixReusedItems: 4,
      bodySuffixHits: 1,
      bodySuffixMisses: 1,
      bodySuffixReusedItems: 3
    },
    paginationCheckpoint: {
      prefixHits: 2,
      prefixMisses: 1,
      prefixPagesReused: 6,
      convergenceHits: 1,
      convergenceMisses: 1,
      suffixPagesReused: 4,
      pagesRecomputed: 3,
      stores: 3
    },
    displayCommand: {
      hits: 7,
      identityHits: 3,
      identityShiftHits: 2,
      shiftSignatureHits: 1,
      sourceShiftHits: 0,
      textNodeHits: 2,
      textNodeMisses: 1,
      textNodeStores: 1,
      misses: 1,
      stores: 1
    }
  };
}

/**
 * Creates an SVG mounted render event with measured phase timings.
 *
 * @returns SVG render event fixture with phase timings.
 */
function createSvgRenderEventWithPhases(): QuireMountedViewRenderEvent {
  return {
    ...createRenderEventWithPhases(),
    view: { id: "svg-primary", mode: "svg" },
    strategy: "full",
    phases: [
      {
        name: "build-render-result",
        startedAt: 30,
        endedAt: 38,
        durationMs: 8
      },
      {
        name: "page-stack-paint",
        startedAt: 38,
        endedAt: 42,
        durationMs: 4
      }
    ]
  } as unknown as QuireMountedViewRenderEvent;
}
