import { describe, expect, it } from "vitest";
import type {
  QuireSelectionStructureIntervalIndex,
  QuireSelectionStructureOwnerFact
} from "../structure";
import { planQuireStructuredRange } from ".";

describe("structured range planner", () => {
  it("preserves a plain drag as one ordinary text segment", () => {
    expect(planQuireStructuredRange({
      anchor: 2,
      head: 8,
      structureIndex: createStructureIndex([])
    })).toEqual({
      anchor: 2,
      head: 8,
      direction: "forward",
      requiresStructuredSelection: false,
      segments: [{
        kind: "text",
        range: { from: 2, to: 8 }
      }]
    });
  });

  it("promotes entry from preceding body text through the reached table row", () => {
    const plan = planQuireStructuredRange({
      anchor: 2,
      head: 25,
      structureIndex: createStructureIndex([createWordTableOwner()])
    });

    expect(plan.direction).toBe("forward");
    expect(plan.requiresStructuredSelection).toBe(true);
    expect(plan.segments).toEqual([{
      kind: "text",
      range: { from: 2, to: 10 }
    }, {
      kind: "structure",
      ownerId: "word-table@10",
      adapterId: "word-table-rows",
      nodeType: "wordTable",
      ownerRange: { from: 10, to: 40 },
      range: { from: 11, to: 30 },
      units: [{
        id: "row-0",
        kind: "table-row",
        range: { from: 11, to: 20 }
      }, {
        id: "row-1",
        kind: "table-row",
        range: { from: 20, to: 30 }
      }],
      commandDomain: "word-table",
      clipboardDomain: "word-table",
      mappingFallback: "text",
      replacementFallback: "reject"
    }]);
  });

  it("keeps reverse exit direction while selecting the same preceding rows", () => {
    const plan = planQuireStructuredRange({
      anchor: 25,
      head: 2,
      structureIndex: createStructureIndex([createWordTableOwner()])
    });

    expect(plan.direction).toBe("backward");
    expect(plan.segments.map((segment) => segment.range)).toEqual([
      { from: 2, to: 10 },
      { from: 11, to: 30 }
    ]);
    expect(plan.segments[1]).toMatchObject({
      kind: "structure",
      units: [{ id: "row-0" }, { id: "row-1" }]
    });
  });

  it("selects one whole owner when both endpoints fully cross it", () => {
    const plan = planQuireStructuredRange({
      anchor: 2,
      head: 48,
      structureIndex: createStructureIndex([createWordTableOwner()])
    });

    expect(plan.segments).toEqual([{
      kind: "text",
      range: { from: 2, to: 10 }
    }, {
      kind: "structure",
      ownerId: "word-table@10",
      adapterId: "word-table-rows",
      nodeType: "wordTable",
      ownerRange: { from: 10, to: 40 },
      range: { from: 10, to: 40 },
      units: [],
      commandDomain: "word-table",
      clipboardDomain: "word-table",
      mappingFallback: "text",
      replacementFallback: "reject"
    }, {
      kind: "text",
      range: { from: 40, to: 48 }
    }]);
  });

  it("leaves internal table drags delegated to existing cell semantics", () => {
    expect(planQuireStructuredRange({
      anchor: 15,
      head: 25,
      structureIndex: createStructureIndex([createWordTableOwner()])
    })).toMatchObject({
      requiresStructuredSelection: false,
      segments: [{
        kind: "text",
        range: { from: 15, to: 25 }
      }]
    });
  });

  it("removes skipped owners and preserves discontiguous text gaps", () => {
    const plan = planQuireStructuredRange({
      anchor: 2,
      head: 30,
      structureIndex: createStructureIndex([
        createOwner({
          ownerId: "captured-object@10",
          adapterId: "captured-object",
          nodeType: "capturedObject",
          range: { from: 10, to: 20 },
          modes: {
            internal: "skip",
            entry: "skip",
            exit: "skip",
            fullyCrossed: "skip"
          }
        })
      ])
    });

    expect(plan.requiresStructuredSelection).toBe(true);
    expect(plan.segments).toEqual([{
      kind: "text",
      range: { from: 2, to: 10 }
    }, {
      kind: "text",
      range: { from: 20, to: 30 }
    }]);
  });

  it("lets nested adapters claim ranges when the outer owner delegates", () => {
    const outer = createOwner({
      ownerId: "callout@10",
      adapterId: "callout",
      nodeType: "callout",
      range: { from: 10, to: 40 },
      modes: {
        internal: "delegate",
        entry: "delegate",
        exit: "delegate",
        fullyCrossed: "delegate"
      }
    });
    const inner = createOwner({
      ownerId: "atomic@20",
      adapterId: "atomic",
      nodeType: "atomicBlock",
      range: { from: 20, to: 25 }
    });
    const plan = planQuireStructuredRange({
      anchor: 2,
      head: 30,
      structureIndex: createStructureIndex([outer, inner])
    });

    expect(plan.segments).toEqual([{
      kind: "text",
      range: { from: 2, to: 20 }
    }, {
      kind: "structure",
      ownerId: "atomic@20",
      adapterId: "atomic",
      nodeType: "atomicBlock",
      ownerRange: { from: 20, to: 25 },
      range: { from: 20, to: 25 },
      units: [],
      commandDomain: "document-node",
      clipboardDomain: "document-node",
      mappingFallback: "text",
      replacementFallback: "reject"
    }, {
      kind: "text",
      range: { from: 25, to: 30 }
    }]);
  });
});

/**
 * Creates the canonical Word Classic row-selection owner used by planner tests.
 *
 * @returns Table owner containing three ordered row units.
 */
function createWordTableOwner(): QuireSelectionStructureOwnerFact {
  return createOwner({
    ownerId: "word-table@10",
    adapterId: "word-table-rows",
    nodeType: "wordTable",
    range: { from: 10, to: 40 },
    modes: {
      internal: "delegate",
      entry: "semantic-units",
      exit: "semantic-units",
      fullyCrossed: "owner"
    },
    units: [{
      id: "row-0",
      kind: "table-row",
      range: { from: 11, to: 20 }
    }, {
      id: "row-1",
      kind: "table-row",
      range: { from: 20, to: 30 }
    }, {
      id: "row-2",
      kind: "table-row",
      range: { from: 30, to: 39 }
    }],
    commandDomain: "word-table",
    clipboardDomain: "word-table"
  });
}

/**
 * Creates one immutable adapter owner with conservative defaults.
 *
 * @param overrides - Owner facts that differ from the defaults.
 * @returns Complete structure owner fact.
 */
function createOwner(
  overrides: Partial<QuireSelectionStructureOwnerFact> & Pick<
    QuireSelectionStructureOwnerFact,
    "ownerId" | "adapterId" | "nodeType" | "range"
  >
): QuireSelectionStructureOwnerFact {
  return {
    extensionName: "PlannerFixture",
    modes: {
      internal: "owner",
      entry: "owner",
      exit: "owner",
      fullyCrossed: "owner"
    },
    commandDomain: "document-node",
    clipboardDomain: "document-node",
    mappingFallback: "text",
    replacementFallback: "reject",
    units: [],
    ...overrides
  };
}

/**
 * Creates a deterministic test interval index from source-ordered owners.
 *
 * @param entries - Adapter owners available to the planner.
 * @returns Minimal interval index with half-open overlap semantics.
 */
function createStructureIndex(
  entries: readonly QuireSelectionStructureOwnerFact[]
): QuireSelectionStructureIntervalIndex {
  return {
    entries,
    entryCount: entries.length,
    query: (range) => entries.filter((entry) =>
      entry.range.from < range.to && entry.range.to > range.from
    )
  };
}
