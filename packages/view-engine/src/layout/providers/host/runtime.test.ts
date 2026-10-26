import { describe, expect, it, vi } from "vitest";
import {
  executeQuireLayoutProviderHost,
  QuireLayoutProviderHostError
} from "./runtime";
import { createQuireLayoutProviderExecutionLifecycle } from "../lifecycle";
import type {
  QuireLayoutProvider,
  QuireLayoutProviderContext,
  QuireLayoutProviderOutput
} from "../types";
import type { QuireLayoutContainer } from "../../engine/types";
import type { QuireLayoutProviderLayerContributionRequest } from "../../region-products";
import { qkView } from "@quirekit/renderer";

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

if (false) {
  const context = {} as QuireLayoutProviderContext;
  const owner: QuireLayoutProviderLayerContributionRequest["owner"] = {
    root: context.root,
    region: context.region,
    // @ts-expect-error Source and capabilities are canonical region compiler facts.
    source: context.source,
    capabilities: context.root.capabilities
  };
  void owner;
}

describe("layout provider block host", () => {
  it("installs the accepted provider contribution as the only block layout", () => {
    const layout = vi.fn(createOutput);
    const result = executeHost(createProvider(layout));

    expect(layout).toHaveBeenCalledOnce();
    expect(result.id).toBe("provider-layout");
    expect(result.regionProducts).toMatchObject({
      roots: [{ id: { value: expect.stringContaining("root:provider") } }],
      regions: [{ ref: { regionId: { value: expect.stringContaining("region:provider") } } }]
    });
  });

  it("supplies prior continuation only through the retained execution lifecycle", () => {
    const executionLifecycle = createQuireLayoutProviderExecutionLifecycle();
    const contexts: QuireLayoutProviderContext[] = [];
    const provider = createProvider((context) => {
      contexts.push(context);
      return {
        ...createOutput(context),
        continuation: {
          providerId: context.providerId,
          snapshotVersion: context.snapshotVersion,
          source: context.source,
          dependencySignature: `fixture:${context.snapshotVersion}`,
          state: { nextChildIndex: context.snapshotVersion }
        }
      };
    });

    executionLifecycle.beginSnapshot(7);
    executeHostAtSnapshot(provider, executionLifecycle, 7);
    executionLifecycle.endSnapshot(7);
    executionLifecycle.beginSnapshot(8);
    executeHostAtSnapshot(provider, executionLifecycle, 8);

    expect(contexts[0]?.previousContinuation).toBeUndefined();
    expect(contexts[1]?.previousContinuation).toMatchObject({
      snapshotVersion: 7,
      dependencySignature: "fixture:7"
    });
  });

  it("rejects invalid output instead of falling back to a built-in layout", () => {
    const provider = createProvider((context) => ({
      ...createOutput(context),
      layout: {
        id: "invalid-layout",
        range: context.source.range!,
        rect: { x: 10, y: 20, width: 120, height: 24 }
      }
    }));

    expect(() => executeHost(provider)).toThrow(QuireLayoutProviderHostError);
  });

  it("installs nested retained products on their explicit layout owners", () => {
    const result = executeHost(createProvider((context) => {
      const range = context.source.range!;
      const childRect = { x: 10, y: 20, width: 60, height: 24 };
      const child = context.services.allocateRootRegion({
        localId: "nested-editor",
        sourceKind: "fixtureChild",
        source: {
          sourceId: `${context.source.sourceId}:nested-editor`,
          range: { from: 3, to: 7 }
        },
        rootKind: "block-container",
        regionKind: "block-container",
        capabilities,
        rect: childRect,
        coordinateSpace: "document",
        selectionPolicy: "delegate-to-text",
        visualInstance: { kind: "single" }
      });
      const rect = { x: 10, y: 20, width: 120, height: 24 };

      return {
        providerId: context.providerId,
        snapshotVersion: context.snapshotVersion,
        source: context.source,
        layout: {
          id: "provider-layout",
          range,
          rect,
          viewRoot: context.root,
          viewRegion: context.region,
          viewCapabilities: context.root.capabilities,
          children: [{
            id: "nested-editor",
            range: { from: 3, to: 7 },
            rect: childRect,
            viewRoot: child.root,
            viewRegion: child.region,
            viewCapabilities: child.root.capabilities
          }]
        },
        declarations: [
          context.services.declarePrimaryRegion(rect),
          child.declaration
        ],
        fragments: [],
        continuation: null
      };
    }));

    expect(result.regionProducts?.regions).toHaveLength(1);
    expect((result as QuireLayoutContainer).children[0]?.regionProducts)
      .toMatchObject({
        roots: [{ id: { value: expect.stringContaining("nested-editor") } }],
        regions: [{ ref: { regionId: { value: expect.stringContaining("nested-editor") } } }],
        selectionPolicies: [{ region: { regionId: { value: expect.stringContaining("nested-editor") } } }]
      });
    expect((result as QuireLayoutContainer).children[0]?.layoutOwner)
      .toMatchObject({
        region: {
          rootId: { value: expect.stringContaining("nested-editor") },
          regionId: { value: expect.stringContaining("nested-editor") }
        },
        source: { sourceId: expect.stringContaining("nested-editor") },
        capabilities
      });
  });

  it("flows nested children under the explicitly requested owner", () => {
    const result = executeHost(createProvider((context) => {
      const range = context.source.range!;
      const nestedSource = {
        sourceId: `${context.source.sourceId}:nested-flow`,
        range: { from: 3, to: 7 }
      };
      const nested = context.services.allocateRootRegion({
        localId: "nested-flow",
        sourceKind: "fixtureChild",
        source: nestedSource,
        rootKind: "block-container",
        regionKind: "block-container",
        capabilities,
        rect: { x: 10, y: 20, width: 60, height: 24 },
        coordinateSpace: "document",
        selectionPolicy: "delegate-to-text",
        visualInstance: { kind: "single" }
      });
      const source = {
        id: "nested-source",
        range: { from: 3, to: 7 },
        rect: { x: 0, y: 0, width: 60, height: 24 },
        children: [{
          id: "nested-child",
          range: { from: 3, to: 7 },
          rect: { x: 0, y: 0, width: 60, height: 24 }
        }]
      };
      const flow = context.services.flowBlockChildren({
        id: "nested-child-flow",
        owner: { root: nested.root, region: nested.region },
        source,
        tracks: [{
          id: "nested-track",
          rect: { x: 10, y: 20, width: 60, height: 24 },
          coordinateSpace: "document",
          region: nested.region,
          source: nestedSource,
          capabilities
        }],
        dependencySignature: "nested-flow:v1"
      });
      const rect = { x: 10, y: 20, width: 120, height: 24 };

      return {
        providerId: context.providerId,
        snapshotVersion: context.snapshotVersion,
        source: context.source,
        layout: {
          id: "provider-layout",
          range,
          rect,
          viewRoot: context.root,
          viewRegion: context.region,
          viewCapabilities: context.root.capabilities,
          subLayoutFragments: flow.fragments.map((fragment) => ({
            subLayout: fragment
          }))
        },
        declarations: [
          context.services.declarePrimaryRegion(rect),
          nested.declaration
        ],
        fragments: flow.fragments,
        continuation: null
      };
    }));
    const nestedResult = result.subLayoutFragments?.[0]?.subLayout;
    const nestedOwnership = nestedResult?.view.root.ownership;

    expect(nestedOwnership?.status).toBe("resolved");
    if (nestedOwnership?.status !== "resolved") {
      throw new Error("Expected nested child flow to retain resolved ownership.");
    }
    expect(nestedOwnership.root).toEqual(expect.objectContaining({
      id: { value: expect.stringContaining("nested-flow") }
    }));
    expect(nestedOwnership.owner.region).toEqual(expect.objectContaining({
      regionId: { value: expect.stringContaining("nested-flow") }
    }));
    expect(nestedOwnership.owner.region).not.toEqual(result.viewRegion);
    expect(nestedOwnership.regionProducts).toMatchObject({
      roots: [{ id: { value: expect.stringContaining("nested-flow") } }],
      regions: [{ ref: { regionId: { value: expect.stringContaining("nested-flow") } } }],
      selectionPolicies: [{ region: { regionId: { value: expect.stringContaining("nested-flow") } } }]
    });
    expect(result.regionProducts?.roots).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: { value: expect.stringContaining("nested-flow") }
        })
      ])
    );
  });

  it("injects provider semantics and export policy into the exact retained owner", () => {
    const result = executeHost(createProvider((context) => {
      const output = createOutput(context);
      const declaration = context.services.declarePrimaryRegion(output.layout.rect);
      const productDeclaration = context.services.declareRegionProducts({
        declaration,
        owner: { root: context.root, region: context.region },
        semantics: {
          role: "blockquote",
          label: "Quoted section",
          search: { kind: "source-text" }
        },
        exportFallbacks: [{
          kind: "semantic-degraded",
          targetFormat: "html",
          reason: "Fixture host preserves quoted text without custom chrome."
        }]
      });

      return {
        ...output,
        declarations: [productDeclaration]
      };
    }));

    expect(result.regionProducts?.roots).toEqual([
      expect.objectContaining({
        semantics: {
          role: "blockquote",
          label: "Quoted section",
          search: { kind: "source-text" }
        },
        exportFallbacks: [expect.objectContaining({ targetFormat: "html" })]
      })
    ]);
    expect(result.regionProducts?.regions).toEqual([
      expect.objectContaining({
        semantics: {
          role: "blockquote",
          label: "Quoted section",
          search: { kind: "source-text" }
        },
        exportFallbacks: [expect.objectContaining({ targetFormat: "html" })]
      })
    ]);
  });

  it("compiles provider layer contributions through a framework service", () => {
    const result = executeHost(createProvider((context) => {
      const output = createOutput(context);
      const rect = output.layout.rect;
      const declaration = context.services.declarePrimaryRegion(rect);
      const contribution = context.services.compileLayerContribution({
        contributionId: "fixture-chrome",
        owner: {
          root: context.root,
          region: context.region
        },
        range: output.layout.range,
        rect,
        coordinateSpace: "document",
        layer: { plane: "controls" },
        paintSurface: "content",
        node: qkView.surface({
          id: "fixture-surface",
          width: rect.width,
          height: rect.height,
          style: { fill: "#f8fafc" },
          child: qkView.domOverlay({
            id: "fixture-action",
            width: 48,
            height: 20,
            html: "<button>Open</button>",
            onClick: { handler: "fixture.open" },
            interaction: { cursor: "pointer" }
          })
        })
      });
      expect(contribution).not.toHaveProperty("owner");
      expect(contribution).not.toHaveProperty("source");
      expect(contribution).not.toHaveProperty("capabilities");

      return {
        ...output,
        declarations: [{
          ...declaration,
          layerContributions: [contribution]
        }]
      };
    }));

    expect(result.regionProducts?.layerContributions).toEqual([
      expect.objectContaining({
        contributionId: "fixture-chrome",
        commands: [expect.objectContaining({ kind: "fill-rect" })],
        domOverlays: [expect.objectContaining({
          id: expect.stringContaining("fixture-action")
        })],
        targets: [expect.objectContaining({
          cursor: "pointer",
          events: { click: { handler: "fixture.open" } }
        })]
      })
    ]);
  });
});

/**
 * Executes a provider through a deterministic test host.
 *
 * @param provider - Provider implementation under test.
 * @returns Installed renderer-neutral block contribution.
 */
function executeHost(provider: QuireLayoutProvider) {
  const executionLifecycle = createQuireLayoutProviderExecutionLifecycle();
  executionLifecycle.beginSnapshot(7);
  const result = executeHostAtSnapshot(provider, executionLifecycle, 7);
  executionLifecycle.endSnapshot(7);
  return result;
}

/**
 * Executes a provider under one explicitly active lifecycle snapshot.
 *
 * @param provider - Provider implementation under test.
 * @param executionLifecycle - Retained provider execution lifecycle.
 * @param snapshotVersion - Active snapshot version for this execution.
 * @returns Installed renderer-neutral block contribution.
 */
function executeHostAtSnapshot(
  provider: QuireLayoutProvider,
  executionLifecycle: ReturnType<
    typeof createQuireLayoutProviderExecutionLifecycle
  >,
  snapshotVersion: number
) {
  return executeQuireLayoutProviderHost({
    id: "fixture-0",
    range: { from: 2, to: 8 },
    sourceInput: {
      provider,
      snapshotVersion,
      sourceKind: "fixture",
      sourceIdentity: {},
      sourcePath: [0],
      sourceContentStart: 3,
      collectBlockInputs: () => []
    },
    constraints: {
      origin: { x: 10, y: 20 },
      inlineSize: 120,
      blockSize: { kind: "unbounded" },
      blockHeight: 24,
      blockGap: 0,
      coordinateSpace: "document"
    },
    executionLifecycle,
    layoutBlockContainer: (request) => ({ ...request, children: [] })
  });
}

/**
 * Creates one provider fixture with explicit retained policy.
 *
 * @param layout - Provider layout implementation.
 * @returns Provider registered for the fixture node type.
 */
function createProvider(
  layout: QuireLayoutProvider["layout"]
): QuireLayoutProvider {
  return {
    id: "fixture-flow",
    nodeTypes: ["fixture"],
    capabilities: ["child-flow"],
    regionContract: {
      rootKind: "block-container",
      regionKind: "block-container",
      capabilities,
      selectionPolicy: "delegate-to-text"
    },
    layout
  };
}

/**
 * Creates canonical provider output from authoritative context facts.
 *
 * @param context - Framework-owned provider context.
 * @returns Valid provider output with one primary region declaration.
 */
function createOutput(
  context: QuireLayoutProviderContext
): QuireLayoutProviderOutput {
  const range = context.source.range!;
  const layout = {
    id: "provider-layout",
    range,
    rect: { x: 10, y: 20, width: 120, height: 24 },
    viewRoot: context.root,
    viewRegion: context.region,
    viewCapabilities: context.root.capabilities
  };

  return {
    providerId: context.providerId,
    snapshotVersion: context.snapshotVersion,
    source: context.source,
    layout,
    declarations: [context.services.declarePrimaryRegion(layout.rect)],
    fragments: [],
    continuation: null
  };
}
