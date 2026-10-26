import { containsQuireTargetPoint, qkView } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireLayoutAnchor } from "../../types";
import type { QuireResolvedInlineSourceCapabilitySidecar } from "../source-capability";
import { compileQuireInlineRetainedProducts } from "./compile";
import { createQuireInlineSourceCapabilitySignature } from "@quirekit/layout/inline";

describe("inline retained product compiler", () => {
  it.each([[80, 0], [0, 80]])(
    "retains paint and exact hit corridors for a %s by %s line frame",
    (width, height) => {
      const capability = createCapability();
      const result = compileQuireInlineRetainedProducts([createAnchor()], [{
        ...capability,
        placement: {
          ...capability.placement,
          extent: { inlineSize: width, blockSize: height }
        },
        presentation: {
          ...capability.presentation,
          view: qkView.customPaint({
            id: "zero-axis-line", width, height,
            paint: (rect, id) => [{
              id, kind: "line", strokeStyle: "#ff0000", lineWidth: 2,
              from: { x: rect.x, y: rect.y },
              to: { x: rect.x + rect.width, y: rect.y + rect.height }
            }]
          }),
          viewVisualOverflow: { top: 1, right: 1, bottom: 1, left: 1 },
          interactionHitAreas: [{ kind: "polygon", points: [
            { x: -3, y: -3 }, { x: width + 3, y: -3 },
            { x: width + 3, y: height + 3 }, { x: -3, y: height + 3 }
          ] }]
        }
      }]);

      expect(result.placementGaps).toEqual([]);
      expect(result.products.gaps).toEqual([]);
      expect(result.products.regions[0]?.rect).toEqual({ x: 112, y: 204, width, height });
      expect(result.products.layerContributions[0]).toMatchObject({
        visualBounds: { x: 111, y: 203, width: width + 2, height: height + 2 },
        commands: [{ kind: "line", from: { x: 112, y: 204 },
          to: { x: 112 + width, y: 204 + height } }]
      });
      expect(result.products.hitTargets.some(target => containsQuireTargetPoint(
        target.rect, target.hitArea, { x: 112 + width / 2, y: 204 + height / 2 }
      ))).toBe(true);
    }
  );

  it("invalidates retained products when exact hit areas change without changing placement", () => {
    const source = createCapability();
    const signature = createQuireInlineSourceCapabilitySignature(source);
    expect(createQuireInlineSourceCapabilitySignature({ ...source, presentation: {
      ...source.presentation, interactionHitAreas: [{ kind: "polygon", points: [
        { x: -7, y: -7 }, { x: 87, y: -7 }, { x: 87, y: 7 }, { x: -7, y: 7 }
      ] }]
    } })).not.toBe(signature);
    const empty = compileQuireInlineRetainedProducts([createAnchor()], [{ ...source,
      presentation: { ...source.presentation, interactionHitAreas: [] } }]);
    expect(empty.products.hitTargets).toEqual([]);
    expect(empty.products.regions[0]!.rect).toEqual({ x: 112, y: 204, width: 80, height: 40 });
  });
  it("rotates declared local corridors around the original frame and clips each target to its page", () => {
    const anchor = createAnchor(), capability = createCapability();
    const result = compileQuireInlineRetainedProducts([{ ...anchor,
      occurrence: { kind: "page", pageIndex: 0, visualInstanceId: "page:0" },
      placementReferences: { ...anchor.placementReferences, page: { x: 0, y: 0, width: 400, height: 260 } }
    }], [{ ...capability, presentation: { ...capability.presentation,
      interactionTransform: { rotation: 90 },
      interactionHitAreas: [
        { kind: "polygon", points: [{ x: -7, y: -7 }, { x: 87, y: -7 }, { x: 87, y: 7 }, { x: -7, y: 7 }] },
        { kind: "polygon", points: [{ x: 73, y: 0 }, { x: 87, y: 0 }, { x: 87, y: 47 }, { x: 73, y: 47 }] }
      ]
    } }]);
    const targets = result.products.hitTargets;
    expect(targets).toHaveLength(2);
    expect(new Set(targets.map(target => target.id)).size).toBe(2);
    expect(result.products.regions[0]!.rect).toEqual({ x: 112, y: 204, width: 80, height: 40 });
    expect(targets.every(target => target.interactionHit?.kind === "object"
      && target.viewRegion?.visualInstanceId === "page:0")).toBe(true);
    expect(targets.some(target => containsQuireTargetPoint(target.rect, target.hitArea, { x: 177, y: 224 }))).toBe(true);
    expect(targets.some(target => containsQuireTargetPoint(target.rect, target.hitArea, { x: 145, y: 224 }))).toBe(false);
    expect(targets.some(target => containsQuireTargetPoint(target.rect, target.hitArea, { x: 172, y: 263 }))).toBe(false);
  });
  it("compiles one source occurrence into complete renderer-neutral products", () => {
    const result = compileQuireInlineRetainedProducts(
      [createAnchor()],
      [createCapability()]
    );

    expect(result.placementGaps).toEqual([]);
    expect(result.products.roots).toMatchObject([{
      id: { value: "root:anchored-object:diagram:1" },
      kind: "embed",
      semantics: {
        role: "embed",
        search: { kind: "excluded" }
      },
      exportFallbacks: [{ kind: "semantic-degraded" }]
    }]);
    expect(result.products.regions).toMatchObject([{
      ref: {
        rootId: { value: "root:anchored-object:diagram:1" },
        regionId: { value: "region:anchored-object:diagram:1" },
        kind: "floating-object"
      },
      rect: { x: 112, y: 204, width: 80, height: 40 }
    }]);
    expect(result.products.hitTargets).toMatchObject([{
      id: "anchored-object:source:diagram:1:object:source:diagram:1",
      layer: { plane: "drawing", zIndex: 7 },
      interactionHit: { kind: "object", objectId: "diagram:1" },
      interactionScope: createAnchor().owner
    }]);
    expect(result.products.layerContributions).toMatchObject([{
      contributionId: "visual:source:diagram:1",
      interactionScope: createAnchor().owner,
      rect: { x: 112, y: 204, width: 80, height: 40 },
      layer: { plane: "drawing", zIndex: 7 },
      paintSurface: "content",
      commands: [expect.objectContaining({ kind: "fill-rect" })]
    }]);
    expect(result.products.selectionPolicies).toEqual([{
      policyId: "object-selection:source:diagram:1",
      region: {
        rootId: { value: "root:anchored-object:diagram:1" },
        regionId: { value: "region:anchored-object:diagram:1" },
        kind: "floating-object"
      },
      kind: "object-selection"
    }]);
  });

  it("retains an explicit enclosing story scope beside the exact object owner", () => {
    const anchor = createAnchor();
    const interactionScope = {
      region: {
        rootId: { value: "root:header" },
        regionId: { value: "region:header" },
        kind: "header" as const,
        visualInstanceId: "page:2:header"
      },
      source: {
        sourceId: "word-story:header-default",
        range: { from: 10, to: 30 }
      },
      capabilities: anchor.owner.capabilities
    };
    const result = compileQuireInlineRetainedProducts(
      [{ ...anchor, interactionScope }],
      [createCapability()]
    );

    expect(result.products.hitTargets[0]?.interactionScope)
      .toEqual(interactionScope);
    expect(result.products.layerContributions[0]?.interactionScope)
      .toEqual(interactionScope);
    expect(result.products.hitTargets[0]?.viewRegion?.kind)
      .toBe("floating-object");
  });

  it("retains source-declared content paint overflow without changing hit geometry", () => {
    const capability = createCapability();
    const result = compileQuireInlineRetainedProducts(
      [createAnchor()],
      [{
        ...capability,
        presentation: {
          ...capability.presentation,
          viewVisualOverflow: {
            top: 12,
            right: 4,
            bottom: 8,
            left: 6
          }
        }
      }]
    );

    expect(result.products.gaps).toEqual([]);
    expect(result.products.layerContributions[0]).toMatchObject({
      rect: { x: 112, y: 204, width: 80, height: 40 },
      visualBounds: { x: 106, y: 192, width: 90, height: 60 },
      paintSurface: "content"
    });
    expect(result.products.hitTargets[0]?.rect).toEqual({
      x: 112,
      y: 204,
      width: 80,
      height: 40
    });
  });

  it("retains exact transformed Picture geometry beside coarse hit bounds", () => {
    const capability = createCapability();
    const result = compileQuireInlineRetainedProducts(
      [createAnchor()],
      [{
        ...capability,
        presentation: {
          ...capability.presentation,
          interactionTransform: { rotation: 90 }
        }
      }]
    );

    expect(result.products.hitTargets[0]).toMatchObject({
      rect: { x: 132, y: 184, width: 40, height: 80 },
      hitArea: {
        kind: "polygon",
        points: [
          { x: 172, y: 184 },
          { x: 172, y: 264 },
          { x: 132, y: 264 },
          { x: 132, y: 184 }
        ]
      }
    });
  });

  it("retains page visual-instance identity and behind-content placement", () => {
    const source = createAnchor();
    const capability = createCapability();
    const result = compileQuireInlineRetainedProducts(
      [{
        ...source,
        id: "source:diagram:1@page:4",
        occurrence: {
          kind: "page",
          pageIndex: 4,
          visualInstanceId: "page:4"
        }
      }],
      [{
        ...capability,
        placement: {
          ...capability.placement,
          paintOrder: "behind-content"
        }
      }]
    );

    expect(result.products.regions[0]?.ref.visualInstanceId).toBe("page:4");
    expect(result.products.hitTargets[0]?.layer).toEqual({
      plane: "drawing-behind-content",
      zIndex: 7
    });
    expect(result.products.layerContributions[0]?.owner.region.visualInstanceId)
      .toBe("page:4");
  });

  it("hard-clips one generic page occurrence without rewriting its source frame", () => {
    const source = createAnchor();
    const capability = createCapability();
    const result = compileQuireInlineRetainedProducts(
      [{
        ...source,
        id: "source:diagram:1@page:0",
        occurrence: {
          kind: "page",
          pageIndex: 0,
          visualInstanceId: "page:0"
        },
        placementReferences: {
          ...source.placementReferences,
          page: { x: 0, y: 0, width: 400, height: 260 }
        }
      }],
      [{
        ...capability,
        placement: {
          ...capability.placement,
          extent: { inlineSize: 80, blockSize: 180 }
        },
        presentation: {
          ...capability.presentation,
          view: qkView.surface({
            id: "diagram-surface-tall",
            width: 80,
            height: 180,
            style: { fill: "#dbeafe" }
          }),
          selectedView: qkView.surface({
            id: "diagram-selection-tall",
            width: 80,
            height: 180,
            style: { stroke: { color: "#2563eb", width: 2 } }
          }),
          selectedViewVisualOverflow: {
            top: 4,
            right: 4,
            bottom: 4,
            left: 4
          }
        }
      }]
    );

    expect(result.products.gaps).toEqual([]);
    expect(result.products.regions[0]?.rect).toEqual({
      x: 112,
      y: 204,
      width: 80,
      height: 180
    });
    expect(result.products.hitTargets[0]?.rect).toEqual({
      x: 112,
      y: 204,
      width: 80,
      height: 56
    });
    expect(result.products.layerContributions).toHaveLength(2);
    expect(result.products.layerContributions[0]).toMatchObject({
      rect: { x: 112, y: 204, width: 80, height: 180 },
      commands: [{
        kind: "clip",
        rect: { x: 112, y: 204, width: 80, height: 56 }
      }]
    });
    expect(result.products.layerContributions[1]).toMatchObject({
      rect: { x: 112, y: 204, width: 80, height: 180 },
      visualBounds: { x: 108, y: 200, width: 88, height: 188 },
      commands: [{
        kind: "clip",
        rect: { x: 108, y: 200, width: 88, height: 60 }
      }]
    });
  });

  it("compiles selected-object chrome as an exact runtime-activated controls product", () => {
    const capability = createCapability();
    const result = compileQuireInlineRetainedProducts(
      [createAnchor()],
      [{
        ...capability,
        presentation: {
          ...capability.presentation,
          selectedView: qkView.surface({
            id: "diagram-selection",
            width: 80,
            height: 40,
            style: { stroke: { color: "#2563eb", width: 2 } }
          }),
          selectedViewVisualOverflow: {
            top: 4,
            right: 4,
            bottom: 4,
            left: 4
          }
        }
      }]
    );

    expect(result.products.layerContributions).toHaveLength(2);
    expect(result.products.layerContributions[1]).toMatchObject({
      contributionId: "selection:source:diagram:1",
      owner: {
        root: { id: { value: "root:anchored-object:diagram:1" } },
        region: { regionId: { value: "region:anchored-object:diagram:1" } }
      },
      rect: { x: 112, y: 204, width: 80, height: 40 },
      visualBounds: { x: 108, y: 200, width: 88, height: 48 },
      layer: { plane: "controls", zIndex: 7 },
      paintSurface: "overlay",
      activation: { kind: "selected-owner" }
    });
  });

  it("excludes every retained product when placement authority is missing", () => {
    const source = createAnchor();
    const result = compileQuireInlineRetainedProducts(
      [{
        ...source,
        placementReferences: {
          ...source.placementReferences,
          column: undefined
        }
      }],
      [createCapability()]
    );

    expect(result.products).toEqual({
      roots: [],
      regions: [],
      hitTargets: [],
      layerContributions: [],
      selectionPolicies: [],
      gaps: []
    });
    expect(result.placementGaps).toMatchObject([{
      code: "missing-inline-reference",
      sourceAnchorId: "source:diagram:1",
      objectId: "diagram:1",
      reference: "column"
    }]);
  });

  it("keeps unclaimed and explicitly failed sources out of retained products", () => {
    const unclaimed = compileQuireInlineRetainedProducts([createAnchor()], []);
    const failed = compileQuireInlineRetainedProducts([createAnchor()], [{
      sourceAnchorId: "source:diagram:1",
      nodeType: "diagramAnchor",
      status: "gap",
      gaps: [{
        code: "invalid-source-declaration",
        nodeType: "diagramAnchor",
        message: "Diagram placement is invalid."
      }]
    }]);

    expect(unclaimed.products.roots).toEqual([]);
    expect(unclaimed.placementGaps).toEqual([]);
    expect(failed.products.roots).toEqual([]);
    expect(failed.placementGaps).toEqual([]);
  });

  it("rejects orphan, duplicate, and node-type-mismatched sidecars", () => {
    const capability = createCapability();

    expect(() => compileQuireInlineRetainedProducts([], [capability]))
      .toThrowError(/has no active source anchor/u);
    expect(() => compileQuireInlineRetainedProducts(
      [createAnchor()],
      [capability, capability]
    )).toThrowError(/multiple View capability sidecars/u);
    expect(() => compileQuireInlineRetainedProducts(
      [createAnchor()],
      [{ ...capability, nodeType: "differentAnchor" }]
    )).toThrowError(/disagree on node type/u);
  });
});

/**
 * Creates a complete independent anchored-object fixture.
 *
 * @returns Source occurrence with exact placement and owner authority.
 */
function createAnchor(): QuireLayoutAnchor {
  return {
    id: "source:diagram:1",
    sourceAnchorId: "source:diagram:1",
    kind: "inline-source",
    nodeType: "diagramAnchor",
    range: { from: 8, to: 9 },
    position: { pos: 8, bias: 1 },
    affinity: "before",
    occurrence: { kind: "single" },
    rect: { x: 126, y: 210, width: 0, height: 18 },
    placementReferences: {
      anchor: { x: 126, y: 210, width: 0, height: 18 },
      line: { x: 100, y: 210, width: 240, height: 18 },
      paragraph: { x: 100, y: 200, width: 300, height: 60 },
      containingRegion: { x: 80, y: 180, width: 320, height: 340 },
      column: { x: 100, y: 160, width: 300, height: 500 }
    },
    owner: {
      region: {
        rootId: { value: "root:body" },
        regionId: { value: "region:body" },
        kind: "body"
      },
      source: { sourceId: "doc:body", range: { from: 0, to: 20 } },
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      }
    }
  };
}

/**
 * Creates the resolved View sidecar for the fixture anchor.
 *
 * @returns Resolved placement and presentation products keyed by anchor id.
 */
function createCapability(): QuireResolvedInlineSourceCapabilitySidecar {
  return {
    sourceAnchorId: "source:diagram:1",
    nodeType: "diagramAnchor",
    status: "resolved",
    placement: {
      objectId: "diagram:1",
      extent: { inlineSize: 80, blockSize: 40 },
      layoutMode: "anchored",
      anchorMovement: "move-with-text",
      inlinePlacement: { kind: "offset", reference: "column", offset: 12 },
      blockPlacement: { kind: "offset", reference: "paragraph", offset: 4 },
      flowExclusion: { kind: "none" },
      paintOrder: "above-content",
      stackingOrder: 7,
      allowOverlap: true,
      constrainToRegion: true,
      lockAspectRatio: false,
      storyId: null
    },
    presentation: {
      view: qkView.surface({
        id: "diagram-surface",
        width: 80,
        height: 40,
        style: { fill: "#dbeafe" }
      }),
      rootKind: "embed",
      semanticRole: "embed",
      search: { kind: "excluded", reason: "Diagram fixture is not searchable." },
      exportFallbacks: [{ kind: "semantic-degraded" }]
    }
  };
}
