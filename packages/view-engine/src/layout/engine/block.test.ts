import { describe, expect, it } from "vitest";
import { layoutQuireBlockDocument } from "./block";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { createQuireRetainedBlockLayoutGraph } from "../retained-block";

describe("canvas block layout engine", () => {
  it("stacks leaf blocks with deterministic gaps", () => {
    const document = layoutQuireBlockDocument({
      id: "doc",
      range: { from: 0, to: 8 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      children: [
        { id: "paragraph-0", range: { from: 0, to: 4 } },
        { id: "paragraph-1", range: { from: 4, to: 8 } }
      ]
    });

    expect(document.rect).toEqual({ x: 10, y: 20, width: 300, height: 56 });
    expect(document.children.map((child) => child.rect)).toEqual([
      { x: 10, y: 20, width: 300, height: 24 },
      { x: 10, y: 52, width: 300, height: 24 }
    ]);
  });

  it("attaches retained body root and region products to the document box", () => {
    const document = layoutQuireBlockDocument({
      id: "doc",
      range: { from: 0, to: 8 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      children: [
        { id: "paragraph-0", range: { from: 0, to: 4 } }
      ]
    });

    expect(document.viewRoot).toEqual(
      expect.objectContaining({
        id: { value: "root:body" },
        kind: "body",
        source: {
          sourceId: "doc:body",
          range: { from: 0, to: 8 }
        }
      })
    );
    expect(document.viewRegion).toEqual({
      rootId: { value: "root:body" },
      regionId: { value: "region:body" },
      kind: "body"
    });
    expect(document.viewCapabilities).toEqual({
      editable: true,
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    });
  });

  it("translates local text fragments and expands leaf height", () => {
    const document = layoutQuireBlockDocument({
      id: "doc",
      range: { from: 0, to: 12 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      children: [
        {
          id: "paragraph-0",
          range: { from: 0, to: 8 },
          textFragments: [createLocalFragment()]
        },
        { id: "paragraph-1", range: { from: 8, to: 12 } }
      ]
    });

    expect(document.rect.height).toBe(80);
    expect(document.children[0]?.rect).toEqual({ x: 10, y: 20, width: 300, height: 48 });
    expect(document.children[0]?.textFragments).toEqual([
      expect.objectContaining({
        rect: { x: 10, y: 44, width: 50, height: 24 },
        baseline: 62
      })
    ]);
    expect(document.children[1]?.rect.y).toBe(76);
  });

  it("keeps explicit paragraph spacing in the preceding block hit area", () => {
    const document = layoutQuireBlockDocument({
      id: "doc",
      range: { from: 0, to: 12 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 0,
      children: [
        {
          id: "paragraph-0",
          range: { from: 0, to: 8 },
          textFragments: [createSingleLineFragment()],
          spacingAfter: 12
        },
        { id: "paragraph-1", range: { from: 8, to: 12 } }
      ]
    });

    expect(document.rect.height).toBe(60);
    expect(document.children.map((child) => child.rect)).toEqual([
      { x: 10, y: 20, width: 300, height: 36 },
      { x: 10, y: 56, width: 300, height: 24 }
    ]);
  });

  it("lays out nested block containers recursively", () => {
    const document = layoutQuireBlockDocument({
      id: "doc",
      range: { from: 0, to: 12 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      children: [
        {
          id: "blockquote-0",
          range: { from: 0, to: 8 },
          children: [
            { id: "paragraph-0", range: { from: 1, to: 4 } },
            { id: "paragraph-1", range: { from: 4, to: 7 } }
          ]
        },
        { id: "paragraph-2", range: { from: 8, to: 12 } }
      ]
    });

    expect(document.children[0]?.rect).toEqual({ x: 10, y: 20, width: 300, height: 56 });
    expect("children" in document.children[0]!).toBe(true);
    expect(document.children[1]?.rect).toEqual({ x: 10, y: 84, width: 300, height: 24 });
  });

  it("keeps retained and full block document snapshots identical", () => {
    const graph = createQuireRetainedBlockLayoutGraph();
    const children = [
      {
        id: "paragraph-0",
        range: { from: 0, to: 8 },
        layoutSignature: "paragraph-0:v1",
        textFragments: [createSingleLineFragment()]
      },
      {
        id: "paragraph-1",
        range: { from: 8, to: 12 },
        layoutSignature: "paragraph-1:v1"
      }
    ];
    const options = {
      id: "doc",
      range: { from: 0, to: 12 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      children
    } as const;

    const full = layoutQuireBlockDocument(options);
    const retained = layoutQuireBlockDocument({
      ...options,
      retainedBlockGraph: graph
    });

    expect(retained).toEqual(full);
    expect(graph.snapshot()).toEqual({
      commits: 1,
      reconciledRecords: 2,
      rebuiltRecords: 2,
      reusedRecords: 0,
      projectedRecords: 2,
      removedRecords: 0,
      heightIndexRebuilds: 1,
      heightIndexDeltaBatches: 0,
      heightIndexUpdatedEntries: 0,
      heightIndexQueries: 2,
      debugFlowComparisons: 0,
      providerExecution: emptyProviderExecutionCounters(),
      leafFlow: expect.any(Object)
    });
  });

  it("rebuilds only the dirty height-preserving block record", () => {
    const graph = createQuireRetainedBlockLayoutGraph();
    const stableBefore = {
      id: "paragraph-0",
      range: { from: 0, to: 4 },
      layoutSignature: "paragraph-0:v1"
    } as const;
    const dirtyBefore = {
      id: "paragraph-1",
      range: { from: 4, to: 8 },
      layoutSignature: "paragraph-1:v1"
    } as const;
    const stableAfter = {
      id: "paragraph-2",
      range: { from: 8, to: 12 },
      layoutSignature: "paragraph-2:v1"
    } as const;
    const base = {
      id: "doc",
      range: { from: 0, to: 12 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      retainedBlockGraph: graph
    } as const;

    layoutQuireBlockDocument({
      ...base,
      children: [stableBefore, dirtyBefore, stableAfter]
    });
    const before = graph.snapshot();
    const next = layoutQuireBlockDocument({
      ...base,
      children: [
        stableBefore,
        { ...dirtyBefore, layoutSignature: "paragraph-1:v2" },
        stableAfter
      ],
      dirtyRange: { from: 4, to: 8 }
    });
    const delta = subtractRetainedBlockCounters(graph.snapshot(), before);

    expect(next.children.map((child) => child.rect.y)).toEqual([20, 52, 84]);
    expect(delta).toEqual({
      commits: 1,
      reconciledRecords: 3,
      rebuiltRecords: 1,
      reusedRecords: 2,
      projectedRecords: 3,
      removedRecords: 0,
      heightIndexRebuilds: 0,
      heightIndexDeltaBatches: 0,
      heightIndexUpdatedEntries: 0,
      heightIndexQueries: 3,
      debugFlowComparisons: 0,
      providerExecution: emptyProviderExecutionCounters()
    });
  });

  it("projects a stable downstream record after an upstream height change", () => {
    const graph = createQuireRetainedBlockLayoutGraph();
    const downstream = {
      id: "paragraph-1",
      range: { from: 8, to: 12 },
      layoutSignature: "paragraph-1:v1"
    } as const;
    const base = {
      id: "doc",
      range: { from: 0, to: 12 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      retainedBlockGraph: graph
    } as const;

    layoutQuireBlockDocument({
      ...base,
      children: [
        {
          id: "paragraph-0",
          range: { from: 0, to: 8 },
          layoutSignature: "paragraph-0:v1"
        },
        downstream
      ]
    });
    const before = graph.snapshot();
    const next = layoutQuireBlockDocument({
      ...base,
      children: [
        {
          id: "paragraph-0",
          range: { from: 0, to: 8 },
          layoutSignature: "paragraph-0:v2",
          minHeight: 48
        },
        downstream
      ],
      dirtyRange: { from: 0, to: 8 }
    });
    const delta = subtractRetainedBlockCounters(graph.snapshot(), before);

    expect(next.children[1]?.rect.y).toBe(76);
    expect(delta.rebuiltRecords).toBe(1);
    expect(delta.reusedRecords).toBe(1);
    expect(delta.projectedRecords).toBe(2);
    expect(delta.heightIndexRebuilds).toBe(0);
    expect(delta.heightIndexDeltaBatches).toBe(1);
    expect(delta.heightIndexUpdatedEntries).toBe(1);
  });

  it("remaps a retained leaf range after an insertion above it", () => {
    const graph = createQuireRetainedBlockLayoutGraph();
    const first = {
      id: "paragraph-0",
      range: { from: 0, to: 4 },
      layoutSignature: "paragraph-0:v1"
    } as const;
    const shifted = {
      id: "paragraph-1",
      range: { from: 4, to: 8 },
      layoutSignature: "paragraph-1:v1"
    } as const;
    const base = {
      id: "doc",
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      retainedBlockGraph: graph
    } as const;

    layoutQuireBlockDocument({
      ...base,
      range: { from: 0, to: 8 },
      children: [first, shifted]
    });
    const before = graph.snapshot();
    const next = layoutQuireBlockDocument({
      ...base,
      range: { from: 0, to: 10 },
      children: [
        { ...first, range: { from: 0, to: 6 }, layoutSignature: "paragraph-0:v2" },
        { ...shifted, range: { from: 6, to: 10 } }
      ],
      dirtyRange: { from: 4, to: 6 }
    });
    const delta = subtractRetainedBlockCounters(graph.snapshot(), before);

    expect(next.children[1]?.range).toEqual({ from: 6, to: 10 });
    expect(next.children[1]?.rect).toEqual({ x: 10, y: 52, width: 300, height: 24 });
    expect(delta.rebuiltRecords).toBe(1);
    expect(delta.reusedRecords).toBe(1);
  });

  it("keeps a downstream local box identity after inserting above it", () => {
    const graph = createQuireRetainedBlockLayoutGraph();
    const stable = {
      id: "paragraph-1",
      range: { from: 4, to: 8 },
      layoutSignature: "paragraph-1:v1"
    } as const;
    const base = {
      id: "doc",
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      retainedBlockGraph: graph
    } as const;

    layoutQuireBlockDocument({
      ...base,
      range: { from: 0, to: 8 },
      children: [
        { id: "paragraph-0", range: { from: 0, to: 4 }, layoutSignature: "p0" },
        stable
      ]
    });
    const retainedLocalBox = graph.inspectRecord("paragraph-1")?.localBox;
    const next = layoutQuireBlockDocument({
      ...base,
      range: { from: 0, to: 10 },
      children: [
        { id: "inserted", range: { from: 0, to: 2 }, layoutSignature: "inserted" },
        { id: "paragraph-0", range: { from: 2, to: 6 }, layoutSignature: "p0" },
        { ...stable, range: { from: 6, to: 10 } }
      ],
      dirtyRange: { from: 0, to: 2 }
    });

    expect(graph.inspectRecord("paragraph-1")?.localBox).toBe(retainedLocalBox);
    expect(next.children[2]?.rect.y).toBe(84);
  });

  it("uses one indexed spacing model for projection, Y lookup, and debug parity", () => {
    const graph = createQuireRetainedBlockLayoutGraph({ debugCompareFullFlow: true });
    const children = [
      {
        id: "paragraph-0",
        range: { from: 0, to: 4 },
        layoutSignature: "paragraph-0",
        spacingBefore: 5,
        spacingAfter: 3
      },
      {
        id: "paragraph-1",
        range: { from: 4, to: 8 },
        layoutSignature: "paragraph-1",
        spacingBefore: 7,
        spacingAfter: 4
      }
    ] as const;
    const options = {
      id: "doc",
      range: { from: 0, to: 8 },
      rect: { x: 10, y: 20, width: 300, height: 0 },
      blockHeight: 24,
      blockGap: 8,
      children
    } as const;

    const full = layoutQuireBlockDocument(options);
    const retained = layoutQuireBlockDocument({
      ...options,
      retainedBlockGraph: graph
    });

    expect(retained).toEqual(full);
    expect(retained.children.map((child) => child.rect)).toEqual([
      { x: 10, y: 25, width: 300, height: 31 },
      { x: 10, y: 64, width: 300, height: 28 }
    ]);
    expect(retained.rect.height).toBe(72);
    expect(graph.blockIndexAtY(24)).toBeUndefined();
    expect(graph.blockIndexAtY(25)).toBe(0);
    expect(graph.blockIndexAtY(63)).toBe(0);
    expect(graph.blockIndexAtY(64)).toBe(1);
    expect(graph.blockIndexAtY(91)).toBe(1);
    expect(graph.blockIndexAtY(92)).toBeUndefined();
    expect(graph.snapshot().debugFlowComparisons).toBe(1);
  });
});

/**
 * Subtracts cumulative retained-block graph counters.
 *
 * @param current - Counter snapshot after a commit.
 * @param previous - Counter snapshot before the commit.
 * @returns Per-commit counter delta.
 */
function subtractRetainedBlockCounters(
  current: ReturnType<ReturnType<typeof createQuireRetainedBlockLayoutGraph>["snapshot"]>,
  previous: ReturnType<ReturnType<typeof createQuireRetainedBlockLayoutGraph>["snapshot"]>
): ReturnType<ReturnType<typeof createQuireRetainedBlockLayoutGraph>["snapshot"]> {
  return {
    commits: current.commits - previous.commits,
    reconciledRecords: current.reconciledRecords - previous.reconciledRecords,
    rebuiltRecords: current.rebuiltRecords - previous.rebuiltRecords,
    reusedRecords: current.reusedRecords - previous.reusedRecords,
    projectedRecords: current.projectedRecords - previous.projectedRecords,
    removedRecords: current.removedRecords - previous.removedRecords,
    heightIndexRebuilds: current.heightIndexRebuilds - previous.heightIndexRebuilds,
    heightIndexDeltaBatches:
      current.heightIndexDeltaBatches - previous.heightIndexDeltaBatches,
    heightIndexUpdatedEntries:
      current.heightIndexUpdatedEntries - previous.heightIndexUpdatedEntries,
    heightIndexQueries: current.heightIndexQueries - previous.heightIndexQueries,
    debugFlowComparisons:
      current.debugFlowComparisons - previous.debugFlowComparisons,
    providerExecution: {
      snapshotEpochs:
        current.providerExecution.snapshotEpochs
        - previous.providerExecution.snapshotEpochs,
      openedExecutions:
        current.providerExecution.openedExecutions
        - previous.providerExecution.openedExecutions,
      suppliedContinuations:
        current.providerExecution.suppliedContinuations
        - previous.providerExecution.suppliedContinuations,
      committedContinuations:
        current.providerExecution.committedContinuations
        - previous.providerExecution.committedContinuations,
      discardedContinuations:
        current.providerExecution.discardedContinuations
        - previous.providerExecution.discardedContinuations,
      canceledJobs:
        current.providerExecution.canceledJobs
        - previous.providerExecution.canceledJobs
    }
  };
}

/**
 * Creates zeroed provider lifecycle counters for non-provider block tests.
 *
 * @returns Empty provider execution diagnostics.
 */
function emptyProviderExecutionCounters() {
  return {
    snapshotEpochs: 0,
    openedExecutions: 0,
    suppliedContinuations: 0,
    committedContinuations: 0,
    discardedContinuations: 0,
    canceledJobs: 0
  };
}

/**
 * Creates a local text fragment for block layout translation tests.
 *
 * @returns Text fragment measured from a local block origin.
 */
function createLocalFragment(): QuireTextFragment {
  return {
    id: "paragraph-0:text-0",
    text: "hello",
    range: { from: 1, to: 6 },
    rect: { x: 0, y: 24, width: 50, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: 42,
    caretStops: []
  };
}

/**
 * Creates a single-line local text fragment for paragraph spacing tests.
 *
 * @returns Text fragment measured from a local block origin.
 */
function createSingleLineFragment(): QuireTextFragment {
  return {
    id: "paragraph-0:text-0",
    text: "hello",
    range: { from: 1, to: 6 },
    rect: { x: 0, y: 0, width: 50, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: 18,
    caretStops: []
  };
}
