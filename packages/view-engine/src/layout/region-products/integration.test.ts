import { describe, expect, it } from "vitest";
import {
  createQuireInteractionGeometryAuthority,
  resolveQuireHitTestSelectionTarget
} from "../../interaction";
import {
  mapQuireInteractionNearestCaretAtPointToHitTestResult
} from "../../interaction/geometry";
import { adaptQuireLayoutDocumentToSnapshot } from "../../editor-layout/adapter";
import { createQuireBodyViewGraphProducts } from "../view-graph";
import type {
  QuireLayoutCapabilitySet
} from "@quirekit/layout/identity";
import { compileQuireRetainedRegionProductSet } from "./compile";

const selectable: QuireLayoutCapabilitySet = {
  editable: false,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
};

describe("retained region product integration", () => {
  it("feeds graph, geometry, selection routing, and diagnostics from one product bundle", () => {
    const body = createQuireBodyViewGraphProducts({ from: 0, to: 20 });
    const canonicalProducts = compileQuireRetainedRegionProductSet([{
      producerId: "embed-layout",
      sourceKind: "plugin-embed",
      source: { sourceId: "embed:weather:1", range: { from: 5, to: 6 } },
      root: {
        rootId: "root:embed:weather:1",
        kind: "embed",
        source: { sourceId: "embed:weather:1", range: { from: 5, to: 6 } },
        capabilities: selectable
      },
      regions: [{
        regionId: "region:embed:weather:body",
        kind: "embed",
        source: { sourceId: "embed:weather:1", range: { from: 5, to: 6 } },
        rect: { x: 40, y: 50, width: 120, height: 60 },
        coordinateSpace: "document",
        capabilities: selectable
      }],
      layerTargets: [{
        targetId: "weather-body",
        regionId: "region:embed:weather:body",
        range: { from: 5, to: 6 },
        rect: { x: 40, y: 50, width: 120, height: 60 },
        layer: { plane: "content" },
        interactionHit: {
          kind: "embed",
          embedId: "weather:1",
          part: "body",
          region: {
            rootId: { value: "root:embed:weather:1" },
            regionId: { value: "region:embed:weather:body" },
            kind: "embed"
          }
        }
      }],
      selectionPolicies: [{
        policyId: "weather-readonly-text",
        regionId: "region:embed:weather:body",
        kind: "readonly-text"
      }]
    }]);
    const rejectedProducts = compileQuireRetainedRegionProductSet([{
      producerId: "broken-control",
      sourceKind: "content-control",
      source: { sourceId: "control:broken", range: { from: 8, to: 9 } },
      root: {
        rootId: "root:control:broken",
        kind: "block-container",
        source: { sourceId: "control:broken", range: { from: 8, to: 9 } },
        capabilities: selectable
      },
      regions: [{
        regionId: "region:control:broken",
        kind: "content-control",
        source: { sourceId: "control:broken", range: { from: 8, to: 9 } }
      }]
    }]);
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state: { tag: "state" } as never,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      document: {
        id: "doc",
        range: { from: 0, to: 20 },
        rect: { x: 0, y: 0, width: 300, height: 200 },
        viewRoot: body.viewRoot,
        viewRegion: body.viewRegion,
        viewCapabilities: body.viewCapabilities,
        layoutOwner: {
          region: body.viewRegion,
          source: body.viewRoot.source,
          capabilities: body.viewCapabilities
        },
        children: [
          {
            id: "embed",
            range: { from: 5, to: 6 },
            rect: { x: 40, y: 50, width: 120, height: 60 }
          },
          {
            id: "broken-control",
            range: { from: 8, to: 9 },
            rect: { x: 180, y: 50, width: 40, height: 24 },
            regionProducts: rejectedProducts
          }
        ],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: canonicalProducts,
        anchorPlacementGaps: [],
        hitTargets: [],
        pages: []
      }
    });

    expect(snapshot.viewGraph.roots.map((root) => root.kind)).toEqual([
      "body",
      "embed"
    ]);
    expect(snapshot.viewGraph.regions.map((region) => region.ref.kind)).toEqual([
      "embed",
      "body"
    ]);
    expect(snapshot.regionProductGaps?.map((gap) => gap.code)).toEqual([
      "missing-region-capabilities"
    ]);
    const authority = createQuireInteractionGeometryAuthority({ snapshot });
    const point = { x: 80, y: 70 };
    const hit = authority.hitTargetAt(point);
    const hitTestResult = mapQuireInteractionNearestCaretAtPointToHitTestResult(
      authority.nearestCaret(point)
    );
    const selectionTarget = resolveQuireHitTestSelectionTarget({
      hitTestResult
    });

    expect(hit).toMatchObject({
      kind: "hit",
      targetKind: "interaction-hit",
      selectionPolicy: "readonly-text",
      interactionHit: { kind: "embed", embedId: "weather:1" }
    });
    expect(hitTestResult).toMatchObject({
      kind: "position",
      selectionPolicy: "readonly-text",
      interactionHit: { kind: "embed", embedId: "weather:1" }
    });
    expect(selectionTarget).toMatchObject({
      domain: "readonly-text",
      commandTarget: "readonly-text",
      selectionPolicy: "readonly-text"
    });
  });
});
