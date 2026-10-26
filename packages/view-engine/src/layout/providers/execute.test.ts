import { describe, expect, it, vi } from "vitest";
import { Schema } from "@quirekit/pm";
import type { QuireLayoutBox } from "../engine";
import type {
  QuireLayoutProvider,
  QuireLayoutProviderContext,
  QuireLayoutProviderOutput,
  QuireLayoutProviderServices
} from "./types";
import { executeQuireLayoutProvider } from "./execute";

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

describe("layout provider execution", () => {
  it("skips stale contexts before provider layout runs", () => {
    const provider = createProvider();
    const result = executeQuireLayoutProvider({
      provider,
      context: createContext(),
      activeSnapshotVersion: 5
    });

    expect(provider.layout).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "rejected",
      gaps: [{ code: "stale-provider-context" }],
      diagnostics: { status: "skipped", durationMs: 0 }
    });
  });

  it("skips canceled jobs before provider layout runs", () => {
    const provider = createProvider();
    const result = executeQuireLayoutProvider({
      provider,
      context: createContext({
        job: { jobId: "job:1", isCanceled: () => true }
      }),
      activeSnapshotVersion: 4
    });

    expect(provider.layout).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "rejected",
      gaps: [{ code: "provider-job-canceled" }],
      diagnostics: { status: "skipped" }
    });
  });

  it("does not expose provider products canceled during authority execution", () => {
    let canceled = false;
    const provider = createProvider();
    vi.mocked(provider.layout).mockImplementation(() => {
      canceled = true;
      return createOutput();
    });

    const result = executeQuireLayoutProvider({
      provider,
      context: createContext({
        job: { jobId: "job:superseded", isCanceled: () => canceled }
      }),
      activeSnapshotVersion: 4
    });

    expect(provider.layout).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: "rejected",
      gaps: [{ code: "provider-job-canceled" }],
      diagnostics: { status: "rejected" }
    });
    expect("result" in result).toBe(false);
  });

  it("returns validated output with bounded timing diagnostics", () => {
    const provider = createProvider();
    const now = createClock([10, 14]);
    const result = executeQuireLayoutProvider({
      provider,
      context: createContext(),
      activeSnapshotVersion: 4,
      now
    });

    expect(provider.layout).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: "accepted",
      diagnostics: {
        providerId: "fixture-provider",
        snapshotVersion: 4,
        status: "accepted",
        durationMs: 4
      }
    });
  });

  it("reports invalid and throwing providers without exposing their result", () => {
    const invalidProvider = createProvider({
      output: createOutput({ snapshotVersion: 3 })
    });
    const throwingProvider = createProvider({ error: new Error("layout failed") });

    expect(executeQuireLayoutProvider({
      provider: invalidProvider,
      context: createContext(),
      activeSnapshotVersion: 4
    })).toMatchObject({
      status: "rejected",
      gaps: [{ code: "stale-snapshot-version" }],
      diagnostics: { status: "rejected" }
    });
    expect(executeQuireLayoutProvider({
      provider: throwingProvider,
      context: createContext(),
      activeSnapshotVersion: 4
    })).toMatchObject({
      status: "rejected",
      gaps: [{ code: "provider-execution-failed", message: "layout failed" }],
      diagnostics: { status: "failed" }
    });
  });

  it("rejects semantic-export providers that omit capability-owned products", () => {
    const provider = createProvider({
      capabilities: ["child-flow", "semantic-export"]
    });

    expect(executeQuireLayoutProvider({
      provider,
      context: createContext(),
      activeSnapshotVersion: 4
    })).toMatchObject({
      status: "rejected",
      gaps: [
        { code: "missing-semantic-export-semantics", rootId: "root:fixture:1" },
        { code: "missing-semantic-export-fallback", rootId: "root:fixture:1" },
        {
          code: "missing-semantic-export-semantics",
          rootId: "root:fixture:1",
          regionId: "region:fixture:1"
        },
        {
          code: "missing-semantic-export-fallback",
          rootId: "root:fixture:1",
          regionId: "region:fixture:1"
        }
      ]
    });
  });

  it("rejects semantic-export providers that produce no retained owners", () => {
    const provider = createProvider({
      capabilities: ["child-flow", "semantic-export"],
      output: createOutput({ declarations: [] })
    });

    expect(executeQuireLayoutProvider({
      provider,
      context: createContext(),
      activeSnapshotVersion: 4
    })).toMatchObject({
      status: "rejected",
      gaps: [
        { code: "missing-semantic-export-semantics" },
        { code: "missing-semantic-export-fallback" }
      ]
    });
  });

  it("accepts semantic-export providers with explicit products", () => {
    const declaration = createOutput().declarations[0]!;
    const provider = createProvider({
      capabilities: ["child-flow", "semantic-export"],
      output: createOutput({
        declarations: [{
          ...declaration,
          root: {
            ...declaration.root!,
            semantics: {
              role: "group",
              search: { kind: "source-text" }
            },
            exportFallbacks: [{
              kind: "native",
              targetFormat: "html",
              reason: "Fixture semantics remain native."
            }]
          },
          regions: declaration.regions?.map((region) => ({
            ...region,
            semantics: {
              role: "group",
              search: { kind: "source-text" }
            },
            exportFallbacks: [{
              kind: "native",
              targetFormat: "html",
              reason: "Fixture semantics remain native."
            }]
          }))
        }]
      })
    });

    expect(executeQuireLayoutProvider({
      provider,
      context: createContext(),
      activeSnapshotVersion: 4
    })).toMatchObject({ status: "accepted" });
  });
});

/**
 * Creates an executable provider fixture.
 *
 * @param options - Optional result or thrown error.
 * @returns Provider fixture with a spy layout function.
 */
function createProvider(options: {
  readonly output?: QuireLayoutProviderOutput;
  readonly error?: Error;
  readonly capabilities?: QuireLayoutProvider["capabilities"];
} = {}): QuireLayoutProvider {
  return {
    id: "fixture-provider",
    nodeTypes: ["fixture-container"],
    capabilities: options.capabilities ?? ["child-flow", "fragmentation"],
    regionContract: {
      rootKind: "block-container",
      regionKind: "block-container",
      capabilities,
      selectionPolicy: "delegate-to-text"
    },
    layout: vi.fn(() => {
      if (options.error !== undefined) {
        throw options.error;
      }
      return options.output ?? createOutput();
    })
  };
}

/**
 * Creates one provider execution context.
 *
 * @param overrides - Context fields to replace.
 * @returns Provider execution context.
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
 * Creates provider output matching the fixture context.
 *
 * @param overrides - Result fields to replace.
 * @returns Provider result fixture.
 */
function createOutput(
  overrides: Partial<QuireLayoutProviderOutput> = {}
): QuireLayoutProviderOutput {
  const context = createContext();
  return {
    providerId: "fixture-provider",
    snapshotVersion: 4,
    source: { sourceId: "fixture:1", range: { from: 2, to: 7 } },
    layout: createLayout(context),
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
 * Creates a deterministic monotonic clock.
 *
 * @param values - Millisecond values returned in order.
 * @returns Clock callback.
 */
function createClock(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
