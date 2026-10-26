import { describe, expect, it } from "vitest";
import { Schema } from "@quirekit/pm";
import type { QuireLayoutBox } from "../engine";
import { compileQuireRetainedRegionProductSet } from "../region-products";
import type {
  QuireLayoutProviderContext,
  QuireLayoutProviderResult,
  QuireLayoutProviderServices
} from "./types";
import { validateQuireLayoutProviderResult } from "./validate";

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

describe("layout provider result validation", () => {
  it("accepts products that preserve the authoritative provider context", () => {
    const context = createContext();
    const result = createResult();

    expect(validateQuireLayoutProviderResult({ context, result })).toEqual({
      valid: true,
      result
    });
  });

  it("rejects stale snapshot versions without remapping the result", () => {
    const context = createContext();
    const result = createResult({ snapshotVersion: context.snapshotVersion - 1 });

    expect(validateQuireLayoutProviderResult({ context, result })).toMatchObject({
      valid: false,
      gaps: [{ code: "stale-snapshot-version", providerId: "fixture-provider" }]
    });
  });

  it("rejects provider and source identity mismatches", () => {
    const context = createContext();
    const result = createResult({
      providerId: "other-provider",
      source: { sourceId: "fixture:other", range: { from: 8, to: 12 } }
    });

    expect(validateQuireLayoutProviderResult({ context, result })).toMatchObject({
      valid: false,
      gaps: [
        { code: "provider-id-mismatch" },
        { code: "source-identity-mismatch" }
      ]
    });
  });

  it("rejects root and region products owned by another context", () => {
    const context = createContext();
    const result = createResult({
      products: createProducts({
        rootId: "root:other",
        regionId: "region:other"
      })
    });

    expect(validateQuireLayoutProviderResult({ context, result })).toMatchObject({
      valid: false,
      gaps: [
        { code: "root-identity-mismatch" },
        { code: "region-identity-mismatch" }
      ]
    });
  });

  it("requires every repeated region product to carry the context visual instance", () => {
    const context = createContext({
      visualInstance: { kind: "repeated", visualInstanceId: "page:2" }
    });
    const result = createResult();

    expect(validateQuireLayoutProviderResult({ context, result })).toMatchObject({
      valid: false,
      gaps: [{ code: "missing-visual-instance" }]
    });
  });

  it("rejects continuation state owned by another provider, source, or snapshot", () => {
    const context = createContext();
    const result = createResult({
      continuation: {
        providerId: "other-provider",
        snapshotVersion: context.snapshotVersion - 1,
        source: { sourceId: "fixture:other", range: { from: 8, to: 12 } },
        dependencySignature: "other-dependencies",
        state: { cursor: 2 }
      }
    });

    expect(validateQuireLayoutProviderResult({ context, result })).toMatchObject({
      valid: false,
      gaps: [
        { code: "continuation-provider-mismatch" },
        { code: "stale-continuation-version" },
        { code: "continuation-source-mismatch" }
      ]
    });
  });
});

/**
 * Creates one authoritative provider context fixture.
 *
 * @param overrides - Context fields to replace.
 * @returns Provider context fixture.
 */
function createContext(
  overrides: Partial<QuireLayoutProviderContext> = {}
): QuireLayoutProviderContext {
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
    job: { jobId: "job:1", isCanceled: () => false },
    ...overrides
  };
}

/**
 * Creates one provider result fixture.
 *
 * @param overrides - Result fields to replace.
 * @returns Provider result fixture.
 */
function createResult(
  overrides: Partial<QuireLayoutProviderResult> = {}
): QuireLayoutProviderResult {
  return {
    providerId: "fixture-provider",
    snapshotVersion: 4,
    source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
    layout: createLayout(createContext()),
    products: createProducts(),
    fragments: [],
    continuation: null,
    ...overrides
  };
}

/**
 * Builds layout geometry and retained ownership directly from context facts.
 *
 * @param context - Authoritative provider context.
 * @returns Renderer-neutral provider layout fixture.
 */
function createLayout(context: QuireLayoutProviderContext): QuireLayoutBox {
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
    viewCapabilities: context.root.capabilities
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
 * Compiles canonical region products for the provider fixture.
 *
 * @param identity - Optional root and region identity overrides.
 * @returns Canonical retained-region products.
 */
function createProducts(
  identity: {
    readonly rootId?: string;
    readonly regionId?: string;
  } = {}
) {
  const rootId = identity.rootId ?? "root:fixture:1";
  const regionId = identity.regionId ?? "region:fixture:1";

  return compileQuireRetainedRegionProductSet([{
    producerId: "fixture-provider",
    sourceKind: "fixture-container",
    source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
    root: {
      rootId,
      kind: "block-container",
      source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
      capabilities
    },
    regions: [{
      regionId,
      kind: "block-container",
      source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
      rect: { x: 10, y: 20, width: 300, height: 180 },
      coordinateSpace: "document",
      capabilities
    }]
  }]);
}
