import { describe, expect, it } from "vitest";
import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireLayoutCapabilitySet
} from "@quirekit/layout/identity";
import { compileQuireRetainedRegionProductSet } from "./compile";
import type { QuireRetainedRegionProductDeclaration } from "./declaration/types";

const editable: QuireLayoutCapabilitySet = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
};

const selectable: QuireLayoutCapabilitySet = {
  ...editable,
  editable: false
};

describe("retained region product set", () => {
  it("compiles story, floating text, and content-control products together", () => {
    const products = compileQuireRetainedRegionProductSet([
      {
        producerId: "word-story",
        sourceKind: "header-story",
        source: { sourceId: "story:header:default", range: { from: 100, to: 120 } },
        root: {
          rootId: "root:header:default",
          kind: "header",
          source: { sourceId: "story:header:default", range: { from: 100, to: 120 } },
          capabilities: editable
        },
        regions: [{
          regionId: "region:header:default",
          kind: "header",
          source: { sourceId: "story:header:default", range: { from: 100, to: 120 } },
          capabilities: editable,
          visualInstance: { kind: "repeated", visualInstanceId: "page:2:header" }
        }],
        selectionPolicies: [{
          policyId: "header-text",
          regionId: "region:header:default",
          kind: "delegate-to-text"
        }]
      },
      {
        producerId: "drawing-layout",
        sourceKind: "floating-text-box",
        source: { sourceId: "drawing:7", range: { from: 20, to: 40 } },
        root: {
          rootId: "root:drawing:7",
          kind: "drawing-text",
          source: { sourceId: "drawing:7", range: { from: 20, to: 40 } },
          capabilities: editable
        },
        regions: [
          {
            regionId: "region:drawing:7:object",
            kind: "floating-object",
            source: { sourceId: "drawing:7", range: { from: 20, to: 40 } },
            capabilities: selectable
          },
          {
            regionId: "region:drawing:7:text",
            kind: "text-box",
            parentRegionId: "region:drawing:7:object",
            source: { sourceId: "drawing:7:text", range: { from: 21, to: 39 } },
            capabilities: editable
          },
          {
            regionId: "region:drawing:7:control",
            kind: "content-control",
            parentRegionId: "region:drawing:7:text",
            source: { sourceId: "control:date:1", range: { from: 25, to: 30 } },
            capabilities: selectable
          }
        ],
        layerTargets: [{
          targetId: "date-button",
          regionId: "region:drawing:7:control",
          range: { from: 25, to: 30 },
          rect: { x: 180, y: 44, width: 24, height: 24 },
          layer: { plane: "controls" },
          interactionHit: {
            kind: "content-control",
            controlId: "date:1",
            controlType: "date",
            part: "button",
            range: { from: 25, to: 30 },
            region: {
              rootId: { value: "root:drawing:7" },
              regionId: { value: "region:drawing:7:control" },
              kind: "content-control"
            }
          }
        }],
        selectionPolicies: [
          {
            policyId: "drawing-object",
            regionId: "region:drawing:7:object",
            kind: "object-selection"
          },
          {
            policyId: "drawing-text",
            regionId: "region:drawing:7:text",
            kind: "delegate-to-text"
          },
          {
            policyId: "date-control",
            regionId: "region:drawing:7:control",
            kind: "control-dispatch"
          }
        ]
      }
    ]);

    expect(products.gaps).toEqual([]);
    expect(products.roots.map((root) => root.kind)).toEqual([
      "header",
      "drawing-text"
    ]);
    expect(products.regions.map((region) => region.ref.kind)).toEqual([
      "header",
      "floating-object",
      "text-box",
      "content-control"
    ]);
    expect(products.hitTargets).toHaveLength(1);
    expect(products.selectionPolicies.map((policy) => policy.kind)).toEqual([
      "delegate-to-text",
      "object-selection",
      "delegate-to-text",
      "control-dispatch"
    ]);
  });

  it("exposes gaps while excluding every partial product from an invalid declaration", () => {
    const products = compileQuireRetainedRegionProductSet([{
      producerId: "plugin-node",
      sourceKind: "embed",
      source: { sourceId: "embed:1", range: { from: 5, to: 6 } },
      root: {
        rootId: "root:embed:1",
        kind: "embed",
        source: { sourceId: "embed:1", range: { from: 5, to: 6 } },
        capabilities: selectable
      },
      regions: [{
        regionId: "region:embed:1",
        kind: "embed",
        source: { sourceId: "embed:1", range: { from: 5, to: 6 } }
      }]
    }]);

    expect(products.gaps.map((gap) => gap.code)).toEqual([
      "missing-region-capabilities"
    ]);
    expect(products.roots).toEqual([]);
    expect(products.regions).toEqual([]);
    expect(products.hitTargets).toEqual([]);
    expect(products.selectionPolicies).toEqual([]);
  });

  it("binds compiled layer contributions to their exact retained region owner", () => {
    const source = {
      sourceId: "callout:1:region",
      range: { from: 5, to: 12 }
    };
    const products = compileQuireRetainedRegionProductSet([{
      producerId: "callout-layout",
      sourceKind: "callout",
      source,
      root: {
        rootId: "root:callout:1",
        kind: "block-container",
        source: { sourceId: "callout:1:root", range: { from: 4, to: 13 } },
        capabilities: editable
      },
      regions: [{
        regionId: "region:callout:1",
        kind: "block-container",
        source,
        rect: { x: 20, y: 30, width: 240, height: 80 },
        coordinateSpace: "document",
        capabilities: editable
      }],
      layerContributions: [{
        contributionId: "callout-chrome",
        regionId: "region:callout:1",
        range: { from: 5, to: 12 },
        rect: { x: 20, y: 30, width: 240, height: 80 },
        coordinateSpace: "document",
        layer: { plane: "controls", zIndex: 4 },
        paintSurface: "content",
        commands: [{
          id: "callout-fill",
          kind: "fill-rect",
          layer: "content",
          rect: { x: 20, y: 30, width: 240, height: 80 },
          fillStyle: "#f8fafc"
        }],
        domOverlays: [{
          id: "callout-control",
          range: { from: 5, to: 12 },
          rect: { x: 180, y: 42, width: 60, height: 24 },
          html: "<button>Open</button>"
        }],
        targets: [{
          id: "callout-action",
          nodePath: "0.1",
          range: { from: 5, to: 12 },
          rect: { x: 180, y: 42, width: 60, height: 24 },
          pointerEvents: "auto",
          cursor: "pointer",
          events: { click: { handler: "callout.open" } }
        }]
      }]
    }]);

    expect(products.gaps).toEqual([]);
    expect(products.layerContributions).toEqual([
      expect.objectContaining({
        contributionId: "callout-chrome",
        owner: expect.objectContaining({
          region: expect.objectContaining({
            regionId: { value: "region:callout:1" }
          }),
          source,
          capabilities: editable
        }),
        commands: [expect.objectContaining({ kind: "fill-rect" })],
        domOverlays: [expect.objectContaining({ id: "callout-control" })],
        targets: [expect.objectContaining({
          id: "callout-action",
          cursor: "pointer"
        })]
      })
    ]);
  });

  it("rejects layer contributions outside document coordinates", () => {
    const source = { sourceId: "fixture:region", range: { from: 2, to: 8 } };
    const products = compileQuireRetainedRegionProductSet([{
      producerId: "fixture-layout",
      sourceKind: "fixture",
      source,
      root: {
        rootId: "root:fixture",
        kind: "block-container",
        source: { sourceId: "fixture:root", range: { from: 1, to: 9 } },
        capabilities: editable
      },
      regions: [{
        regionId: "region:fixture",
        kind: "block-container",
        source,
        rect: { x: 0, y: 0, width: 80, height: 40 },
        coordinateSpace: "region-local",
        capabilities: editable
      }],
      layerContributions: [{
        contributionId: "fixture-chrome",
        regionId: "region:fixture",
        range: source.range,
        rect: { x: 0, y: 0, width: 80, height: 40 },
        coordinateSpace: "region-local",
        layer: { plane: "controls" },
        paintSurface: "content",
        commands: [],
        domOverlays: [],
        targets: []
      }]
    }]);

    expect(products.gaps.map((gap) => gap.code)).toContain(
      "unsupported-layer-contribution-coordinate-space"
    );
    expect(products.layerContributions).toEqual([]);
    expect(products.roots).toEqual([]);
  });

  it("reserves declared visual overflow for complete content and controls paint", () => {
    const valid = compileQuireRetainedRegionProductSet([
      createVisualOverflowFixture({ x: 16, y: 26, width: 88, height: 48 })
    ]);
    expect(valid.gaps).toEqual([]);
    expect(valid.layerContributions[0]).toMatchObject({
      rect: { x: 20, y: 30, width: 80, height: 40 },
      visualBounds: { x: 16, y: 26, width: 88, height: 48 }
    });

    const undeclared = compileQuireRetainedRegionProductSet([
      createVisualOverflowFixture(undefined)
    ]);
    expect(undeclared.gaps.map((gap) => gap.code)).toContain(
      "layer-command-rect-outside-contribution"
    );

    const contentPaint = compileQuireRetainedRegionProductSet([
      createVisualOverflowFixture(
        { x: 16, y: 26, width: 88, height: 48 },
        "drawing",
        "content"
      )
    ]);
    expect(contentPaint.gaps).toEqual([]);
    expect(contentPaint.layerContributions[0]).toMatchObject({
      paintSurface: "content",
      visualBounds: { x: 16, y: 26, width: 88, height: 48 }
    });

    const invalidBounds = compileQuireRetainedRegionProductSet([
      createVisualOverflowFixture({ x: 24, y: 30, width: 76, height: 40 })
    ]);
    expect(invalidBounds.gaps.map((gap) => gap.code)).toContain(
      "invalid-layer-contribution-visual-bounds"
    );
  });
});

/**
 * Creates one exact controls contribution whose corner handle crosses `rect`.
 *
 * @param visualBounds - Optional artifact bounds reserved around the object.
 * @param plane - Editor plane that owns the contribution.
 * @param paintSurface - Last-mile renderer surface.
 * @returns Complete retained-product declaration for validation tests.
 */
function createVisualOverflowFixture(
  visualBounds: QuireRect | undefined,
  plane: "controls" | "drawing" = "controls",
  paintSurface: "content" | "overlay" = "overlay"
): QuireRetainedRegionProductDeclaration {
  const source = { sourceId: "drawing:overflow", range: { from: 2, to: 3 } };
  return {
    producerId: "drawing-overflow",
    sourceKind: "drawing",
    source,
    root: {
      rootId: "root:drawing:overflow",
      kind: "drawing",
      source,
      capabilities: selectable
    },
    regions: [{
      regionId: "region:drawing:overflow",
      kind: "floating-object",
      source,
      rect: { x: 20, y: 30, width: 80, height: 40 },
      coordinateSpace: "document",
      capabilities: selectable
    }],
    layerContributions: [{
      contributionId: "drawing-controls",
      regionId: "region:drawing:overflow",
      range: source.range,
      rect: { x: 20, y: 30, width: 80, height: 40 },
      ...(visualBounds === undefined ? {} : { visualBounds }),
      coordinateSpace: "document",
      layer: { plane },
      paintSurface,
      ...(paintSurface === "overlay"
        ? { activation: { kind: "selected-owner" as const } }
        : {}),
      commands: [{
        id: "north-west-handle",
        kind: "fill-rect",
        layer: paintSurface,
        rect: { x: 16, y: 26, width: 8, height: 8 },
        fillStyle: "#2563eb"
      }],
      domOverlays: [],
      targets: []
    }]
  };
}
