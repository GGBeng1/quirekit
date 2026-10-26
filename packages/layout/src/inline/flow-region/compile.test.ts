import { describe, expect, it } from "vitest";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import { compileQuireInlineFlowRegions } from "./compile";
import { subtractQuireInlineRectangles } from "./geometry";
import type {
  QuireInlineFlowExclusion,
  QuireInlineFlowLine
} from "./types";

describe("inline flow-region compiler", () => {
  it("shares rectangle subtraction with pre-shape row-slot compilation", () => {
    const result = subtractQuireInlineRectangles(
      { x: 0, y: 20, width: 200, height: 20 },
      [
        { x: 70, y: 0, width: 40, height: 20 },
        { x: 120, y: 25, width: 30, height: 30 },
        { x: 40, y: 10, width: 50, height: 30 }
      ]
    );

    expect(result).toEqual({
      intervals: [
        { from: 0, to: 40 },
        { from: 90, to: 120 },
        { from: 150, to: 200 }
      ],
      appliedExclusionIndexes: [2, 1]
    });
  });

  it("subtracts multiple exclusions into deterministic available regions", () => {
    const line = createLine();
    const result = compileQuireInlineFlowRegions({
      lines: [line],
      exclusions: [
        createExclusion("shape-b", 80, 20, ["shape-b", "font:body"]),
        createExclusion("shape-a", 30, 20, ["shape-a", "font:body"])
      ]
    });

    expect(result.gaps).toEqual([]);
    expect(result.regions.map((region) => ({
      id: region.id,
      x: region.rect.x,
      width: region.rect.width,
      owner: region.owner,
      exclusions: region.appliedExclusionIds,
      dependencies: region.dependencyIds
    }))).toEqual([
      {
        id: "line-1:region:0",
        x: 10,
        width: 20,
        owner: line.owner,
        exclusions: ["shape-a", "shape-b"],
        dependencies: ["shape-a", "font:body", "shape-b"]
      },
      {
        id: "line-1:region:1",
        x: 50,
        width: 30,
        owner: line.owner,
        exclusions: ["shape-a", "shape-b"],
        dependencies: ["shape-a", "font:body", "shape-b"]
      },
      {
        id: "line-1:region:2",
        x: 100,
        width: 110,
        owner: line.owner,
        exclusions: ["shape-a", "shape-b"],
        dependencies: ["shape-a", "font:body", "shape-b"]
      }
    ]);
  });

  it("keeps vertically unrelated exclusions out of line dependencies", () => {
    const result = compileQuireInlineFlowRegions({
      lines: [createLine()],
      exclusions: [{
        ...createExclusion("shape-later", 30, 20, ["shape-later"]),
        rect: { space: "document", x: 30, y: 40, width: 20, height: 10 }
      }]
    });

    expect(result.gaps).toEqual([]);
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0]?.rect).toEqual({
      space: "document",
      x: 10,
      y: 10,
      width: 200,
      height: 20
    });
    expect(result.regions[0]?.dependencyIds).toEqual([]);
  });

  it("rejects repeated occurrences that omit or contradict owner identity", () => {
    const missing = createLine({
      occurrence: { kind: "repeated", visualInstanceId: "" }
    });
    const mismatch = createExclusion("shape-a", 30, 20, [], {
      occurrence: { kind: "repeated", visualInstanceId: "page:2:shape-a" },
      owner: createOwner("shape-a", "page:3:shape-a")
    });
    const result = compileQuireInlineFlowRegions({
      lines: [missing, createLine({ id: "line-2" })],
      exclusions: [mismatch]
    });

    expect(result.gaps.map((gap) => gap.code)).toEqual([
      "visual-instance-missing",
      "visual-instance-missing",
      "visual-instance-mismatch"
    ]);
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0]?.lineId).toBe("line-2");
  });

  it("rejects missing scopes and coordinate-space mismatches", () => {
    const result = compileQuireInlineFlowRegions({
      lines: [createLine()],
      exclusions: [
        createExclusion("orphan", 30, 20, [], { targetScopeId: "missing" }),
        {
          ...createExclusion("wrong-space", 30, 20, []),
          rect: { space: "page", x: 30, y: 10, width: 20, height: 20 }
        }
      ]
    });

    expect(result.gaps.map((gap) => gap.code)).toEqual([
      "missing-target-flow-scope",
      "flow-scope-space-mismatch"
    ]);
    expect(result.regions).toHaveLength(1);
  });

  it("rejects every declaration that shares a duplicate id", () => {
    const line = createLine();
    const result = compileQuireInlineFlowRegions({
      lines: [line, { ...line }],
      exclusions: []
    });

    expect(result.regions).toEqual([]);
    expect(result.gaps.map((gap) => gap.code)).toEqual([
      "duplicate-line-id",
      "duplicate-line-id"
    ]);
  });
});

/**
 * Creates one valid text-flow line.
 *
 * @param overrides - Optional line facts to replace.
 * @returns Valid line fixture.
 */
function createLine(
  overrides: Partial<QuireInlineFlowLine> = {}
): QuireInlineFlowLine {
  return {
    id: "line-1",
    scopeId: "page:2:body-flow",
    owner: createOwner("paragraph-1"),
    occurrence: { kind: "single" },
    rect: { space: "document", x: 10, y: 10, width: 200, height: 20 },
    ...overrides
  };
}

/**
 * Creates one valid exclusion fixture.
 *
 * @param id - Stable exclusion id.
 * @param x - Exclusion inline origin.
 * @param width - Exclusion width.
 * @param dependencyIds - Stable invalidation dependencies.
 * @param overrides - Optional exclusion facts to replace.
 * @returns Valid exclusion fixture.
 */
function createExclusion(
  id: string,
  x: number,
  width: number,
  dependencyIds: readonly string[],
  overrides: Partial<QuireInlineFlowExclusion> = {}
): QuireInlineFlowExclusion {
  return {
    id,
    targetScopeId: "page:2:body-flow",
    owner: createOwner(id),
    occurrence: { kind: "single" },
    rect: { space: "document", x, y: 10, width, height: 20 },
    dependencyIds,
    ...overrides
  };
}

/**
 * Creates exact retained owner facts for a fixture product.
 *
 * @param sourceId - Stable source id.
 * @param visualInstanceId - Optional repeated visual occurrence id.
 * @returns Retained owner facts.
 */
function createOwner(
  sourceId: string,
  visualInstanceId?: string
): QuireLayoutOwnerFacts {
  return {
    source: { sourceId, range: { from: 1, to: 2 } },
    region: {
      rootId: { value: `root:${sourceId}` },
      regionId: { value: `region:${sourceId}` },
      kind: sourceId.startsWith("shape") ? "floating-object" : "body",
      ...(visualInstanceId === undefined ? {} : { visualInstanceId })
    },
    capabilities: {
      editable: !sourceId.startsWith("shape"),
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    }
  };
}
