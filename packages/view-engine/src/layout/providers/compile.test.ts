import { describe, expect, it } from "vitest";
import { Schema } from "@quirekit/pm";
import type { QuireLayoutBox, QuireSubLayoutProjection } from "../engine";
import { createQuireTestSubLayoutProjection } from "../../../test-support/layout/sub-layout-projection";
import type {
  QuireLayoutProviderContext,
  QuireLayoutProviderOutput,
  QuireLayoutProviderServices
} from "./types";
import { compileQuireLayoutProviderOutput } from "./compile";

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

const schema = new Schema({ nodes: {
  doc: { content: "fixture_container" },
  fixture_container: { content: "" },
  text: {}
} });
const sourceNode = schema.nodes.fixture_container!.create();

describe("layout provider output compiler", () => {
  it("compiles declarations into canonical retained products", () => {
    const context = createContext();
    const output = createOutput();
    const compilation = compileQuireLayoutProviderOutput({ context, output });

    expect(compilation).toMatchObject({
      valid: true,
      result: {
        providerId: "fixture-provider",
        snapshotVersion: 4,
        source: { sourceId: "fixture:1" },
        fragments: [],
        products: {
          roots: [{ id: { value: "root:fixture:1" } }],
          regions: [{
            ref: {
              rootId: { value: "root:fixture:1" },
              regionId: { value: "region:fixture:1" }
            }
          }]
        }
      }
    });
  });

  it("preserves retained declaration gaps instead of repairing invalid output", () => {
    const context = createContext();
    const output = createOutput({
      declarations: [{
        providerId: "fixture-provider",
        sourceKind: "fixture-container",
        source: context.source,
        root: {
          rootId: context.root.id.value,
          kind: context.root.kind,
          source: context.source,
          capabilities
        },
        regions: [{
          regionId: context.region.regionId.value,
          kind: context.region.kind,
          source: context.source
        }]
      }]
    });

    expect(compileQuireLayoutProviderOutput({ context, output })).toMatchObject({
      valid: false,
      gaps: [{
        code: "retained-region-product-gap",
        retainedGapCode: "missing-region-capabilities"
      }]
    });
  });

  it("rejects child fragments owned by an undeclared retained root", () => {
    const context = createContext();
    const output = createOutput({ fragments: [createFragment("root:other")] });

    expect(compileQuireLayoutProviderOutput({ context, output })).toMatchObject({
      valid: false,
      gaps: [{ code: "fragment-view-root-mismatch", rootId: "root:other" }]
    });
  });

  it("rejects child fragments outside the authoritative provider source range", () => {
    const context = createContext();
    const output = createOutput({
      fragments: [createFragment("root:fixture:1", { from: 1, to: 8 })]
    });

    expect(compileQuireLayoutProviderOutput({ context, output })).toMatchObject({
      valid: false,
      gaps: [{
        code: "fragment-source-range-mismatch",
        sourceId: "fixture:1"
      }]
    });
  });
});

/**
 * Creates one authoritative provider context.
 *
 * @returns Provider context fixture.
 */
function createContext(): QuireLayoutProviderContext {
  return {
    providerId: "fixture-provider",
    snapshotVersion: 4,
    source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
    sourceKind: sourceNode.type.name,
    sourceIdentity: sourceNode,
    sourcePath: [0],
    sourceContentStart: 3,
    root: {
      id: { value: "root:fixture:1" },
      kind: "block-container",
      source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
      capabilities
    },
    region: {
      rootId: { value: "root:fixture:1" },
      regionId: { value: "region:fixture:1" },
      kind: "block-container"
    },
    visualInstance: { kind: "single" },
    constraints: {
      origin: { x: 10, y: 20 },
      inlineSize: 300,
      blockSize: { kind: "bounded", size: 180 },
      blockHeight: 180,
      blockGap: 12,
      coordinateSpace: "document"
    },
    services: createServices(),
    job: { jobId: "job:1", isCanceled: () => false }
  };
}

/**
 * Creates provider-owned output before canonical compilation.
 *
 * @param overrides - Output fields to replace.
 * @returns Provider output fixture.
 */
function createOutput(
  overrides: Partial<QuireLayoutProviderOutput> = {}
): QuireLayoutProviderOutput {
  const context = createContext();
  const fragments = overrides.fragments ?? [];
  return {
    providerId: "fixture-provider",
    snapshotVersion: 4,
    source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
    layout: createLayout(context, fragments),
    declarations: [{
      providerId: "fixture-provider",
      sourceKind: "fixture-container",
      source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
      root: {
        rootId: "root:fixture:1",
        kind: "block-container",
        source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
        capabilities
      },
      regions: [{
        regionId: "region:fixture:1",
        kind: "block-container",
        source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
        rect: { x: 10, y: 20, width: 300, height: 180 },
        coordinateSpace: "document",
        capabilities
      }]
    }],
    fragments,
    continuation: null,
    ...overrides
  };
}

/**
 * Builds layout geometry and retained ownership directly from context facts.
 *
 * @param context - Authoritative provider context.
 * @param fragments - Child-flow fragments retained by the layout box.
 * @returns Renderer-neutral provider layout fixture.
 */
function createLayout(
  context: QuireLayoutProviderContext,
  fragments: readonly QuireSubLayoutProjection[] = []
): QuireLayoutBox {
  return {
    id: "layout:fixture:1",
    range: context.source.range!,
    rect: {
      x: context.constraints.origin.x,
      y: context.constraints.origin.y,
      width: context.constraints.inlineSize,
      height: context.constraints.blockHeight
    },
    viewRoot: context.root,
    viewRegion: context.region,
    viewCapabilities: context.root.capabilities,
    subLayoutFragments: fragments.map((subLayout) => ({ subLayout }))
  };
}

/**
 * Creates explicit services for a provider that does not recurse or allocate.
 *
 * @returns Minimal framework service stub.
 */
function createServices(): QuireLayoutProviderServices {
  return {
    compileLayerContribution: () => {
      throw new Error("Fixture does not compile layer contributions.");
    },
    declarePrimaryRegion: (rect) => ({
      providerId: "fixture-provider",
      sourceKind: "fixture-container",
      source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
      root: {
        rootId: "root:fixture:1",
        kind: "block-container",
        source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
        capabilities
      },
      regions: [{
        regionId: "region:fixture:1",
        kind: "block-container",
        source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
        rect,
        coordinateSpace: "document",
        capabilities
      }]
    }),
    declareRegionProducts: () => {
      throw new Error("Fixture does not declare region products.");
    },
    collectBlockInputs: () => [],
    layoutBlockContainer: () => {
      throw new Error("Fixture does not perform recursive layout.");
    },
    placeBlockContainer: () => {
      throw new Error("Fixture does not place recursive layout.");
    },
    createContribution: () => {
      throw new Error("Fixture does not create public contributions.");
    },
    flowBlockChildren: () => ({
      children: [],
      fragments: [],
      nextSourceFlowY: 0,
      complete: true
    }),
    allocateRootRegion: () => {
      throw new Error("Fixture does not allocate additional retained identity.");
    }
  };
}

/**
 * Creates one child-flow fragment owned by the requested root id.
 *
 * @param rootId - Sub-layout root id.
 * @param range - Optional fragment source range.
 * @returns Canonical sub-layout result fixture.
 */
function createFragment(
  rootId: string,
  range = { from: 2, to: 7 }
): QuireSubLayoutProjection {
  const viewRoot = {
    id: { value: rootId },
    kind: "block-container" as const,
    source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
    capabilities
  };
  const viewRegion = {
    rootId: viewRoot.id,
    regionId: { value: "region:fixture:1" },
    kind: "block-container" as const
  };

  return createQuireTestSubLayoutProjection({
    root: {
      id: "sub-layout:fixture:1",
      kind: "extension-container",
      range,
      placement: {
        parentId: "fixture:1",
        rect: { x: 10, y: 20, width: 300, height: 40 },
        contentRect: { x: 10, y: 20, width: 300, height: 40 }
      },
      localRect: { x: 0, y: 0, width: 300, height: 40 },
      writingMode: "horizontal-tb",
      dependencySignature: "fixture:v1"
    },
    resultId: "fragment:fixture:1",
    acceptedBand: { top: 0, bottom: 40 },
    localToResult: { x: 10, y: 20 },
    contentClip: { x: 10, y: 20, width: 300, height: 40 },
    interactionClip: { x: 10, y: 20, width: 300, height: 40 },
    viewRoot: {
      ownership: {
        status: "resolved",
        root: viewRoot,
        owner: {
          region: viewRegion,
          source: viewRoot.source,
          capabilities
        }
      }
    },
    dependencySignature: "fixture:v1"
  });
}
