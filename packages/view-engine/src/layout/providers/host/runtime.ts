import { executeQuireLayoutProvider } from "../execute";
import { installQuireLayoutProviderProducts } from "./product";
import { flowQuireLayoutProviderBlockChildren } from "./child-flow";
import {
  allocateQuireLayoutProviderRootRegion,
  createQuireLayoutProviderConstraintRect,
  createQuireLayoutProviderSource
} from "./identity";
import { compileQuireLayoutProviderLayerContribution } from "./layer-contribution";
import {
  createQuireLayoutProviderContribution,
  declareQuireLayoutProviderRegionProducts,
  placeQuireLayoutProviderBlockContainer
} from "./authoring";
import type {
  ExecuteQuireLayoutProviderHostOptions,
  QuireLayoutProviderContext,
  QuireLayoutProviderExecutionDiagnostics,
  QuireLayoutProviderGap,
  QuireLayoutProviderRootRegionIdentity
} from "../types";
import type { QuireLayoutProviderExecutionLease } from "../lifecycle";
import type { QuireLayoutBox } from "../../engine/types";
import type {
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";

/** Error raised when provider output cannot enter canonical block flow. */
export class QuireLayoutProviderHostError extends Error {
  /** Explicit provider gaps that prevented canonical installation. */
  readonly gaps: readonly QuireLayoutProviderGap[];
  /** Lifecycle diagnostics emitted by provider execution. */
  readonly diagnostics: QuireLayoutProviderExecutionDiagnostics;

  /**
   * Creates a provider host failure without a compatibility fallback.
   *
   * @param gaps - Explicit validation or lifecycle gaps.
   * @param diagnostics - Provider execution diagnostics.
   */
  constructor(
    gaps: readonly QuireLayoutProviderGap[],
    diagnostics: QuireLayoutProviderExecutionDiagnostics
  ) {
    super(
      `Layout provider "${diagnostics.providerId}" was rejected: ${
        gaps.map((gap) => `${gap.code} (${gap.message})`).join(", ")
      }`
    );
    this.name = "QuireLayoutProviderHostError";
    this.gaps = gaps;
    this.diagnostics = diagnostics;
  }
}

/**
 * Executes and installs one provider-owned renderer-neutral block contribution.
 *
 * Accepted output is the only layout returned by this host. Rejected output
 * becomes an explicit error and never falls back to a separately computed
 * built-in layout.
 *
 * @param options - Source identity, constraints, and framework services.
 * @returns Validated provider layout carrying canonical retained products.
 */
export function executeQuireLayoutProviderHost(
  options: ExecuteQuireLayoutProviderHostOptions
): QuireLayoutBox {
  const source = createQuireLayoutProviderSource(options);
  const lease = options.executionLifecycle.openExecution({
    ownerId: options.id,
    providerId: options.sourceInput.provider.id,
    snapshotVersion: options.sourceInput.snapshotVersion,
    source
  });
  const primary = allocateQuireLayoutProviderRootRegion({
    providerId: options.sourceInput.provider.id,
    source,
    localId: "primary",
    sourceKind: options.sourceInput.sourceKind,
    rootKind: options.sourceInput.provider.regionContract.rootKind,
    regionKind: options.sourceInput.provider.regionContract.regionKind,
    capabilities: options.sourceInput.provider.regionContract.capabilities,
    rect: createQuireLayoutProviderConstraintRect(options),
    coordinateSpace: options.constraints.coordinateSpace,
    selectionPolicy:
      options.sourceInput.provider.regionContract.selectionPolicy,
    visualInstance: { kind: "single" }
  });
  const context = createProviderContext(options, source, primary, lease);
  const execution = executeQuireLayoutProvider({
    provider: options.sourceInput.provider,
    context,
    activeSnapshotVersion: options.sourceInput.snapshotVersion
  });

  if (execution.status === "rejected") {
    options.executionLifecycle.rejectExecution(lease);
    throw new QuireLayoutProviderHostError(
      execution.gaps,
      execution.diagnostics
    );
  }

  options.executionLifecycle.acceptExecution(
    lease,
    execution.result.continuation
  );

  return installQuireLayoutProviderProducts(
    execution.result.layout,
    execution.result.products
  );
}

/**
 * Creates the authoritative provider execution context.
 *
 * @param options - Provider host options.
 * @param source - Framework-owned source identity.
 * @param primary - Framework-allocated primary retained identity.
 * @param lease - Lifecycle lease carrying prior continuation and cancellation.
 * @returns Context containing no editor dispatch or mounted runtime surface.
 */
function createProviderContext(
  options: ExecuteQuireLayoutProviderHostOptions,
  source: QuireLayoutSourceRef,
  primary: QuireLayoutProviderRootRegionIdentity,
  lease: QuireLayoutProviderExecutionLease
): QuireLayoutProviderContext {
  const providerId = options.sourceInput.provider.id;

  return {
    providerId,
    snapshotVersion: options.sourceInput.snapshotVersion,
    source,
    sourceKind: options.sourceInput.sourceKind,
    sourceIdentity: options.sourceInput.sourceIdentity,
    sourcePath: options.sourceInput.sourcePath,
    sourceContentStart: options.sourceInput.sourceContentStart,
    root: primary.root,
    region: primary.region,
    visualInstance: { kind: "single" },
    constraints: options.constraints,
    ...(lease.previousContinuation === undefined
      ? {}
      : { previousContinuation: lease.previousContinuation }),
    services: {
      compileLayerContribution: compileQuireLayoutProviderLayerContribution,
      collectBlockInputs: options.sourceInput.collectBlockInputs,
      layoutBlockContainer: options.layoutBlockContainer,
      flowBlockChildren: flowQuireLayoutProviderBlockChildren,
      placeBlockContainer: placeQuireLayoutProviderBlockContainer,
      createContribution: createQuireLayoutProviderContribution,
      declareRegionProducts: declareQuireLayoutProviderRegionProducts,
      declarePrimaryRegion: (rect) => ({
        ...primary.declaration,
        regions: primary.declaration.regions?.map((region) => ({
          ...region,
          rect
        }))
      }),
      allocateRootRegion: (request) => allocateQuireLayoutProviderRootRegion({
        ...request,
        providerId,
        source: request.source
      })
    },
    job: lease.job
  };
}
