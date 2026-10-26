import { describe, expect, it } from "vitest";
import type {
  QuireLayoutCapabilitySet
} from "@quirekit/layout/identity";
import type {
  QuireViewInteractionHit
} from "../../../view-graph";
import { compileQuireRetainedRegionProducts } from "./compile";

const allCapabilities: QuireLayoutCapabilitySet = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
};

const readonlyCapabilities: QuireLayoutCapabilitySet = {
  editable: false,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: false,
  accessible: true
};

describe("retained-region view graph producer compiler", () => {
  it("compiles explicit producer declarations into retained view products", () => {
    const interactionHit: QuireViewInteractionHit = {
      kind: "control",
      controlId: "callout-open",
      region: {
        rootId: { value: "root:callout:1" },
        regionId: { value: "region:callout:control" },
        kind: "control"
      }
    };

    const result = compileQuireRetainedRegionProducts({
      producerId: "callout-producer",
      sourceKind: "callout",
      source: {
        sourceId: "node:callout:1",
        range: { from: 2, to: 12 }
      },
      productKinds: [
        "view-root",
        "view-region",
        "layer-target",
        "selection-policy",
        "export-fallback"
      ],
      root: {
        rootId: "root:callout:1",
        kind: "block-container",
        source: {
          sourceId: "node:callout:1",
          range: { from: 2, to: 12 }
        },
        capabilities: allCapabilities,
        semantics: {
          role: "group",
          label: "Callout",
          search: { kind: "source-text" }
        }
      },
      regions: [
        {
          regionId: "region:callout:body",
          kind: "block-container",
          source: {
            sourceId: "node:callout:1:body",
            range: { from: 3, to: 11 }
          },
          rect: { x: 10, y: 20, width: 240, height: 64 },
          coordinateSpace: "document",
          capabilities: allCapabilities,
          semantics: {
            role: "group",
            description: "Callout body",
            search: {
              kind: "metadata",
              text: "Callout body",
              keywords: ["note"]
            }
          },
          visualInstance: {
            kind: "repeated",
            visualInstanceId: "page:4:callout:1"
          }
        },
        {
          regionId: "region:callout:control",
          kind: "control",
          source: {
            sourceId: "node:callout:1:control",
            range: { from: 2, to: 12 }
          },
          parentRegionId: "region:callout:body",
          rect: { x: 220, y: 24, width: 24, height: 24 },
          coordinateSpace: "document",
          capabilities: readonlyCapabilities,
          semantics: {
            role: "control",
            label: "Open callout",
            search: {
              kind: "excluded",
              reason: "Transient editor control"
            }
          },
          visualInstance: {
            kind: "repeated",
            visualInstanceId: "page:4:callout:1"
          }
        }
      ],
      layerTargets: [
        {
          targetId: "open-button",
          regionId: "region:callout:control",
          range: { from: 2, to: 12 },
          rect: { x: 220, y: 24, width: 24, height: 24 },
          layer: { plane: "controls", zIndex: 1 },
          pointerPolicy: {
            kind: "dispatch",
            shouldFocusEditor: true,
            shouldPreventDefault: true
          },
          interactionHit
        }
      ],
      selectionPolicies: [
        {
          policyId: "callout-body-text",
          regionId: "region:callout:body",
          kind: "delegate-to-text"
        }
      ]
    });

    expect(result.valid).toBe(true);
    expect(result.gaps).toEqual([]);
    expect(result.root).toMatchObject({
      id: { value: "root:callout:1" },
      kind: "block-container",
      semantics: {
        role: "group",
        label: "Callout",
        search: { kind: "source-text" }
      }
    });
    expect(result.regions).toHaveLength(2);
    expect(result.regions[0]?.ref).toMatchObject({
      rootId: { value: "root:callout:1" },
      regionId: { value: "region:callout:body" },
      visualInstanceId: "page:4:callout:1"
    });
    expect(result.regions.map((region) => region.semantics)).toEqual([
      {
        role: "group",
        description: "Callout body",
        search: {
          kind: "metadata",
          text: "Callout body",
          keywords: ["note"]
        }
      },
      {
        role: "control",
        label: "Open callout",
        search: {
          kind: "excluded",
          reason: "Transient editor control"
        }
      }
    ]);
    expect(result.hitTargets).toEqual([
      expect.objectContaining({
        id: "callout-producer:open-button",
        viewRegion: expect.objectContaining({
          regionId: { value: "region:callout:control" },
          visualInstanceId: "page:4:callout:1"
        }),
        layer: { plane: "controls", zIndex: 1 },
        pointerPolicy: {
          kind: "dispatch",
          shouldFocusEditor: true,
          shouldPreventDefault: true
        },
        interactionHit: expect.objectContaining({
          kind: "control",
          controlId: "callout-open",
          layer: { plane: "controls", zIndex: 1 }
        })
      })
    ]);
    expect(result.selectionPolicies).toEqual([
      {
        policyId: "callout-body-text",
        region: expect.objectContaining({
          regionId: { value: "region:callout:body" }
        }),
        kind: "delegate-to-text"
      }
    ]);
  });

  it("rejects incomplete semantic facts instead of inferring consumer defaults", () => {
    const result = compileQuireRetainedRegionProducts({
      producerId: "semantic-gap-provider",
      sourceKind: "semanticGap",
      source: { sourceId: "node:semantic-gap" },
      root: {
        rootId: "root:semantic-gap",
        kind: "block-container",
        source: { sourceId: "node:semantic-gap" },
        capabilities: allCapabilities,
        semantics: {
          role: "group",
          label: " ",
          search: { kind: "source-text" }
        }
      },
      regions: [{
        regionId: "region:semantic-gap",
        kind: "block-container",
        source: { sourceId: "node:semantic-gap:body", range: { from: 2, to: 8 } },
        rect: { x: 0, y: 0, width: 100, height: 30 },
        coordinateSpace: "document",
        capabilities: allCapabilities,
        semantics: {
          role: "group",
          search: {
            kind: "metadata",
            text: "",
            keywords: ["valid", " "]
          }
        }
      }]
    });

    expect(result.valid).toBe(false);
    expect(result.root).toBeUndefined();
    expect(result.regions).toEqual([]);
    expect(result.gaps.map((gap) => gap.code)).toEqual([
      "blank-semantic-label",
      "missing-semantic-source-range",
      "missing-semantic-search-text",
      "missing-semantic-search-keyword"
    ]);
  });

  it("reports production gaps instead of inferring missing root, source, capability, or visual identity", () => {
    const result = compileQuireRetainedRegionProducts({
      producerId: "chip-producer",
      sourceKind: "smartChip",
      source: {
        sourceId: "node:chip:1",
        range: { from: 4, to: 5 }
      },
      root: {
        rootId: "root:chip:1",
        kind: "embed",
        source: {
          sourceId: "node:chip:1",
          range: { from: 4, to: 5 }
        }
      },
      regions: [
        {
          regionId: "region:chip:body",
          kind: "interactive-widget",
          source: {
            sourceId: "node:chip:1:body",
            range: { from: 4, to: 5 }
          },
          visualInstance: {
            kind: "repeated"
          }
        },
        {
          regionId: "region:chip:readonly",
          kind: "readonly-text",
          capabilities: readonlyCapabilities
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.root).toBeUndefined();
    expect(result.regions).toEqual([]);
    expect(result.gaps.map((gap) => gap.code)).toEqual([
      "missing-root-capabilities",
      "missing-region-capabilities",
      "missing-visual-instance",
      "missing-region-source"
    ]);
  });

  it("drops invalid layer targets and selection policies without inventing regions or ranges", () => {
    const result = compileQuireRetainedRegionProducts({
      producerId: "media-producer",
      sourceKind: "video",
      source: {
        sourceId: "node:video:1",
        range: { from: 1, to: 2 }
      },
      root: {
        rootId: "root:video:1",
        kind: "media",
        source: {
          sourceId: "node:video:1",
          range: { from: 1, to: 2 }
        },
        capabilities: readonlyCapabilities
      },
      regions: [
        {
          regionId: "region:video:body",
          kind: "media",
          source: {
            sourceId: "node:video:1:body",
            range: { from: 1, to: 2 }
          },
          rect: { x: 0, y: 0, width: 320, height: 180 },
          coordinateSpace: "document",
          capabilities: readonlyCapabilities
        }
      ],
      layerTargets: [
        {
          targetId: "play-button",
          regionId: "region:video:missing",
          rect: { x: 120, y: 70, width: 64, height: 64 }
        }
      ],
      selectionPolicies: [
        {
          policyId: "missing-region-policy",
          regionId: "region:video:missing",
          kind: "object-selection"
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.root?.id.value).toBe("root:video:1");
    expect(result.regions).toHaveLength(1);
    expect(result.hitTargets).toEqual([]);
    expect(result.selectionPolicies).toEqual([]);
    expect(result.gaps.map((gap) => gap.code)).toEqual([
      "missing-target-region",
      "missing-target-range",
      "missing-selection-policy-region"
    ]);
  });
});
