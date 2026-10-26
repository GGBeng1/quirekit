import type {
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutProviderCapabilityKind as QuireCoreLayoutProviderCapabilityKind
} from "@quirekit/core/layout-provider";
import type {
  QuireLayoutProviderContainerPlacementRequest as QuirePublicContainerPlacementRequest,
  QuireLayoutProviderContributionRequest as QuirePublicContributionRequest,
  QuireLayoutProviderRegionProductsRequest as QuirePublicRegionProductsRequest,
  QuireLayoutProviderServices as QuirePublicLayoutProviderServices
} from "../../layout-provider/types";
import type { QuireRetainedRegionProducts } from "../region-products";
import type {
  QuireRetainedRegionProductDeclaration,
  QuireRetainedRegionProductGapCode,
  QuireRetainedRegionSelectionPolicyKind,
  QuireLayoutProviderLayerContributionRequest,
  QuireRetainedLayerContributionDeclaration
} from "../region-products";
import type { QuireSubLayoutProjection } from "../engine/sub-layout";
import type { QuireChildFlowPlacement } from "@quirekit/layout/child-flow";
import type { QuireLineBreakMode } from "@quirekit/layout/inline";
import type {
  QuireBlockLayoutInput,
  QuireLayoutBox,
  QuireLayoutContainer
} from "../engine";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutCoordinateSpaceKind,
  QuireLayoutRegionRef,
  QuireLayoutRegionKind,
  QuireLayoutRoot,
  QuireLayoutRootKind,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireLayoutProviderExecutionLifecycle
} from "./lifecycle";
import type { QuireViewPointerPolicy } from "../../view-graph";

/** Capability class implemented by one internal layout provider. */
export type QuireLayoutProviderCapabilityKind =
  QuireCoreLayoutProviderCapabilityKind;

/** Renderer-neutral block contribution installed after provider validation. */
export type QuireLayoutProviderContribution = QuireLayoutBox;

/** Renderer-neutral child input collected through framework authority. */
export type QuireLayoutProviderChildInput = QuireBlockLayoutInput;

/** Renderer-neutral recursive container produced by framework block flow. */
export type QuireLayoutProviderContainer = QuireLayoutContainer;

/** Nested-flow fragment returned through framework-owned fragmentation. */
export type QuireLayoutProviderFragment = QuireSubLayoutProjection;

/** One explicit visual track consumed by framework child flow. */
export interface QuireLayoutProviderFlowTrack {
  /** Stable visual track identity. */
  readonly id: string;
  /** Track rectangle in the declared coordinate space. */
  readonly rect: QuireRect;
  /** Coordinate space that owns the track rectangle. */
  readonly coordinateSpace: QuireLayoutCoordinateSpaceKind;
  /** Retained visual region represented by this track. */
  readonly region: QuireLayoutRegionRef;
  /** Exact source identity represented by this track. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Exact capabilities represented by this track. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
  /** Pointer policy represented by this track. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Optional canonical root placement for the track. */
  readonly rootPlacement?: QuireChildFlowPlacement | undefined;
  /** Optional interaction clip distinct from content geometry. */
  readonly interactionClip?: QuireRect | undefined;
  /** Optional owning page index. */
  readonly pageIndex?: number | undefined;
  /** Optional parent fragment identity used by continuation. */
  readonly parentFragmentId?: string | undefined;
  /** Provider-owned continuation state. */
  readonly continuationState?: Readonly<Record<string, unknown>> | undefined;
}

/** Explicit retained owner of one provider child-flow operation. */
export interface QuireLayoutProviderFlowOwner {
  /** Retained root that owns source flow and query products. */
  readonly root: QuireLayoutRoot;
  /** Retained region that owns visual tracks and interaction products. */
  readonly region: QuireLayoutRegionRef;
}

/** Request for flowing recursive block children through visual tracks. */
export interface QuireLayoutProviderChildFlowRequest {
  /** Stable id for the source-flow root. */
  readonly id: string;
  /** Explicit retained owner; nested flows never inherit an ambiguous default. */
  readonly owner: QuireLayoutProviderFlowOwner;
  /** Measured source-order child container produced by framework layout. */
  readonly source: QuireLayoutProviderContainer;
  /** Visual tracks consumed in declared order. */
  readonly tracks: readonly QuireLayoutProviderFlowTrack[];
  /** Stable dependency signature for continuation reuse. */
  readonly dependencySignature: string;
}

/** Framework result for one source-order child-flow placement. */
export interface QuireLayoutProviderChildFlowResult {
  /** Visual child boxes translated into their owning tracks. */
  readonly children: readonly QuireLayoutBox[];
  /** Canonical sub-layout fragments carrying shared query products. */
  readonly fragments: readonly QuireLayoutProviderFragment[];
  /** Next source-flow coordinate to continue from. */
  readonly nextSourceFlowY: number;
  /** Whether the declared tracks consumed the complete source flow. */
  readonly complete: boolean;
}

/** Stable visual occurrence expected from one provider execution. */
export type QuireLayoutProviderVisualInstance =
  | {
      /** Single visual occurrence that does not need an instance id. */
      readonly kind: "single";
    }
  | {
      /** Repeated visual occurrence that must preserve an explicit instance id. */
      readonly kind: "repeated";
      /** Snapshot-local id for the repeated visual occurrence. */
      readonly visualInstanceId: string;
    };

/** Tagged layout constraints supplied by the framework to one provider. */
export interface QuireLayoutProviderConstraints {
  /** Block-flow origin supplied by the parent layout authority. */
  readonly origin: Readonly<{ x: number; y: number }>;
  /** Inline size available to the provider in CSS pixels. */
  readonly inlineSize: number;
  /** Whether the parent currently bounds the provider's block extent. */
  readonly blockSize:
    | { readonly kind: "unbounded" }
    | { readonly kind: "bounded"; readonly size: number };
  /** Default block height used by recursive framework layout. */
  readonly blockHeight: number;
  /** Default gap used by recursive framework layout. */
  readonly blockGap: number;
  /** Coordinate space that owns the origin and sizes. */
  readonly coordinateSpace: QuireLayoutCoordinateSpaceKind;
}

/** Explicit retained identity policy declared by one provider. */
export interface QuireLayoutProviderRegionContract {
  /** Root kind allocated by framework authority for each source occurrence. */
  readonly rootKind: QuireLayoutRootKind;
  /** Primary region kind allocated inside the retained root. */
  readonly regionKind: QuireLayoutRegionKind;
  /** Capabilities explicitly promised by this provider. */
  readonly capabilities: QuireLayoutCapabilitySet;
  /** Selection policy owned by the primary region. */
  readonly selectionPolicy: QuireRetainedRegionSelectionPolicyKind;
}

/** Request for collecting recursive block inputs through framework authority. */
export interface QuireLayoutProviderChildCollectionRequest {
  /** Exact immutable source identity whose block children should be collected. */
  readonly sourceIdentity: object;
  /** Absolute document position where the container content starts. */
  readonly contentStart: number;
  /** Stable source path from the document root to the container. */
  readonly path: readonly number[];
  /** Inline size used to shape recursive text content. */
  readonly inlineSize: number;
  /** Optional child-flow wrapping policy, independent of the alignment width. */
  readonly lineBreakMode?: QuireLineBreakMode | undefined;
}

/** Request for laying out recursive children through framework block flow. */
export interface QuireLayoutProviderContainerRequest {
  /** Stable id for the produced container. */
  readonly id: string;
  /** Source document range represented by the container. */
  readonly range: QuireDocumentRange;
  /** Parent-space rectangle used as the child-flow frame. */
  readonly rect: QuireRect;
  /** Default block height for recursive children. */
  readonly blockHeight: number;
  /** Gap between recursive children. */
  readonly blockGap: number;
  /** Recursive block inputs in source order. */
  readonly children: readonly QuireLayoutProviderChildInput[];
}

/** Request for one additional provider-owned retained region identity. */
export interface QuireLayoutProviderRootRegionIdentityRequest {
  /** Stable provider-local key used for deterministic allocation. */
  readonly localId: string;
  /** Source node or nested-flow kind represented by this identity. */
  readonly sourceKind: string;
  /** Source identity represented by the allocated root and region. */
  readonly source: QuireLayoutSourceRef;
  /** Root kind explicitly requested by the provider. */
  readonly rootKind: QuireLayoutRootKind;
  /** Region kind explicitly requested by the provider. */
  readonly regionKind: QuireLayoutRegionKind;
  /** Capabilities explicitly promised by the allocated region. */
  readonly capabilities: QuireLayoutCapabilitySet;
  /** Region rectangle in the explicitly tagged coordinate space. */
  readonly rect: QuireRect;
  /** Coordinate space that owns the region rectangle. */
  readonly coordinateSpace: QuireLayoutCoordinateSpaceKind;
  /** Selection policy explicitly owned by the allocated region. */
  readonly selectionPolicy: QuireRetainedRegionSelectionPolicyKind;
  /** Optional repeated visual occurrence owned by this region. */
  readonly visualInstance?: QuireLayoutProviderVisualInstance | undefined;
}

/** Framework-allocated identity and declaration for one retained region. */
export interface QuireLayoutProviderRootRegionIdentity {
  /** Retained root allocated by framework authority. */
  readonly root: QuireLayoutRoot;
  /** Retained region allocated inside the root. */
  readonly region: QuireLayoutRegionRef;
  /** Provider declaration that must be returned for canonical compilation. */
  readonly declaration: QuireLayoutProviderRegionDeclaration;
}

/** Canonical host request for attaching products to an internal declaration. */
export type QuireLayoutProviderRegionProductsRequest = Omit<
  QuirePublicRegionProductsRequest,
  "declaration" | "owner"
> & {
  /** Canonical retained declaration created by framework authority. */
  readonly declaration: QuireLayoutProviderRegionDeclaration;
  /** Exact canonical root and region occurrence that own the products. */
  readonly owner: QuireLayoutProviderFlowOwner;
};

/** Framework-owned services available only during provider layout. */
export interface QuireLayoutProviderServices {
  /**
   * Compiles a neutral view tree into region-owned renderer artifacts.
   *
   * @param request - Exact owner, geometry, and neutral view tree.
   * @returns Declaration that must be returned with its owning region.
   */
  readonly compileLayerContribution: (
    request: QuireLayoutProviderLayerContributionRequest
  ) => QuireRetainedLayerContributionDeclaration;
  /**
   * Declares the framework-allocated primary region at its resolved geometry.
   *
   * @param rect - Resolved primary region rectangle.
   * @returns Provider declaration that must be returned for canonical compilation.
   */
  readonly declarePrimaryRegion: (
    rect: QuireRect
  ) => QuireLayoutProviderRegionDeclaration;
  /**
   * Attaches interaction, layer, and export products to a framework declaration.
   *
   * @param request - Canonical declaration, exact owner, and provider products.
   * @returns Canonical declaration accepted by retained product compilation.
   */
  readonly declareRegionProducts: (
    request: QuireLayoutProviderRegionProductsRequest
  ) => QuireLayoutProviderRegionDeclaration;
  /**
   * Collects recursive block inputs while preserving source positions.
   *
   * @param request - Explicit source container and shaping constraints.
   * @returns Recursive block inputs in source order.
   */
  readonly collectBlockInputs: (
    request: QuireLayoutProviderChildCollectionRequest
  ) => readonly QuireLayoutProviderChildInput[];
  /**
   * Lays out recursive block inputs through canonical block flow.
   *
   * @param request - Container identity, geometry, and recursive inputs.
   * @returns Renderer-neutral layout container.
   */
  readonly layoutBlockContainer: (
    request: QuireLayoutProviderContainerRequest
  ) => QuireLayoutProviderContainer;
  /**
   * Relocates a framework-created container without exposing its internal shape.
   *
   * @param request - Opaque container, accepted rectangle, and optional owner.
   * @returns Opaque relocated container.
   */
  readonly placeBlockContainer: (
    request: QuirePublicContainerPlacementRequest
  ) => ReturnType<QuirePublicLayoutProviderServices["placeBlockContainer"]>;
  /**
   * Flows recursive block children through explicit visual tracks.
   *
   * @param request - Source-order children, measurement width, and visual tracks.
   * @returns Visual children, retained fragments, and continuation progress.
   */
  readonly flowBlockChildren: (
    request: QuireLayoutProviderChildFlowRequest
  ) => QuireLayoutProviderChildFlowResult;
  /**
   * Allocates an additional retained root and region without inventing identity.
   *
   * @param request - Explicit provider-local identity and capability facts.
   * @returns Framework-owned identity plus the declaration to return.
   */
  readonly allocateRootRegion: (
    request: QuireLayoutProviderRootRegionIdentityRequest
  ) => QuireLayoutProviderRootRegionIdentity;
  /**
   * Creates the only renderer-neutral contribution accepted from public providers.
   *
   * @param request - Opaque children/fragments and exact retained owner.
   * @returns Opaque contribution compiled by framework authority.
   */
  readonly createContribution: (
    request: QuirePublicContributionRequest
  ) => ReturnType<QuirePublicLayoutProviderServices["createContribution"]>;
}

/** Source handle retained between document collection and provider layout. */
export interface QuireLayoutProviderSourceInput {
  /** Provider selected deterministically for the source node. */
  readonly provider: QuireLayoutProvider;
  /** Snapshot version allocated before source collection. */
  readonly snapshotVersion: number;
  /** Schema or source kind selected by the provider registry. */
  readonly sourceKind: string;
  /** Exact immutable source identity selected by the provider registry. */
  readonly sourceIdentity: object;
  /** Stable source path from the document root. */
  readonly sourcePath: readonly number[];
  /** Absolute position where the source node content starts. */
  readonly sourceContentStart: number;
  /** Framework child collector closed over renderer-neutral shaping services. */
  readonly collectBlockInputs: QuireLayoutProviderServices["collectBlockInputs"];
}

/** Options used by the framework-owned block provider host. */
export interface ExecuteQuireLayoutProviderHostOptions {
  /** Stable block id represented by the provider contribution. */
  readonly id: string;
  /** Source document range represented by the provider contribution. */
  readonly range: QuireDocumentRange;
  /** Source handle retained from document collection. */
  readonly sourceInput: QuireLayoutProviderSourceInput;
  /** Tagged block-flow constraints for this execution. */
  readonly constraints: QuireLayoutProviderConstraints;
  /** Framework recursive container layout service bound to the active cache. */
  readonly layoutBlockContainer: QuireLayoutProviderServices["layoutBlockContainer"];
  /** Retained-graph lifecycle that owns execution epochs and continuation. */
  readonly executionLifecycle: QuireLayoutProviderExecutionLifecycle;
}

/** Cancelable layout job owned by one snapshot build. */
export interface QuireLayoutProviderJob {
  /** Stable job id exposed to diagnostics. */
  readonly jobId: string;
  /**
   * Reports whether this job was superseded or canceled.
   *
   * @returns Whether provider work must stop.
   */
  readonly isCanceled: () => boolean;
}

/** Authoritative context supplied for one internal provider execution. */
export interface QuireLayoutProviderContext {
  /** Provider selected by the layout registry. */
  readonly providerId: string;
  /** Retained snapshot version that owns this execution. */
  readonly snapshotVersion: number;
  /** Source document identity being laid out. */
  readonly source: QuireLayoutSourceRef;
  /** Schema or source kind selected by the provider registry. */
  readonly sourceKind: string;
  /** Exact immutable source identity selected by the provider registry. */
  readonly sourceIdentity: object;
  /** Stable source path from the document root to the source node. */
  readonly sourcePath: readonly number[];
  /** Absolute position where the source node's content starts. */
  readonly sourceContentStart: number;
  /** Retained root allocated by framework layout authority. */
  readonly root: QuireLayoutRoot;
  /** Primary retained region allocated for this provider execution. */
  readonly region: QuireLayoutRegionRef;
  /** Expected single or repeated visual occurrence. */
  readonly visualInstance: QuireLayoutProviderVisualInstance;
  /** Tagged physical constraints for this provider execution. */
  readonly constraints: QuireLayoutProviderConstraints;
  /** Framework-owned recursive layout and identity services. */
  readonly services: QuireLayoutProviderServices;
  /** Prior accepted continuation for the same provider and exact source. */
  readonly previousContinuation?: QuireLayoutProviderContinuation | undefined;
  /** Cancelable layout job that owns this execution. */
  readonly job: QuireLayoutProviderJob;
}

/** Provider-owned immutable state used to continue a later fragment. */
export interface QuireLayoutProviderContinuation {
  /** Provider that owns this continuation. */
  readonly providerId: string;
  /** Snapshot version that produced this continuation. */
  readonly snapshotVersion: number;
  /** Source identity being continued. */
  readonly source: QuireLayoutSourceRef;
  /** Stable dependency signature required for reuse. */
  readonly dependencySignature: string;
  /** Immutable provider-owned continuation payload. */
  readonly state: Readonly<Record<string, unknown>>;
}

/** Canonical output returned by one internal layout provider. */
export interface QuireLayoutProviderResult {
  /** Provider that produced this result. */
  readonly providerId: string;
  /** Snapshot version used to produce this result. */
  readonly snapshotVersion: number;
  /** Source identity represented by this result. */
  readonly source: QuireLayoutSourceRef;
  /** Validated renderer-neutral contribution installed into block flow. */
  readonly layout: QuireLayoutProviderContribution;
  /** Canonical retained-region products produced for this result. */
  readonly products: QuireRetainedRegionProducts;
  /** Canonical child-flow fragments produced for this result. */
  readonly fragments: readonly QuireLayoutProviderFragment[];
  /** Provider continuation, or null when the result is terminal. */
  readonly continuation: QuireLayoutProviderContinuation | null;
}

/** Provider-owned retained-region declaration before canonical compilation. */
export type QuireLayoutProviderRegionDeclaration = Omit<
  QuireRetainedRegionProductDeclaration,
  "producerId"
> & {
  /** Provider id that owns this declaration. */
  readonly providerId?: string | undefined;
};

/** Narrow provider output accepted before canonical product compilation. */
export interface QuireLayoutProviderOutput {
  /** Provider that produced this output. */
  readonly providerId: string;
  /** Snapshot version used to produce this output. */
  readonly snapshotVersion: number;
  /** Source identity represented by this output. */
  readonly source: QuireLayoutSourceRef;
  /** Renderer-neutral layout contribution produced for the source node. */
  readonly layout: QuireLayoutProviderContribution;
  /** Region declarations compiled and validated by framework authority. */
  readonly declarations: readonly QuireLayoutProviderRegionDeclaration[];
  /** Child-flow fragments produced through framework sub-layout services. */
  readonly fragments: readonly QuireLayoutProviderFragment[];
  /** Provider continuation, or null when the output is terminal. */
  readonly continuation: QuireLayoutProviderContinuation | null;
}

/** Stable validation gap reported for provider output. */
export type QuireLayoutProviderGapCode =
  | "stale-snapshot-version"
  | "provider-id-mismatch"
  | "source-identity-mismatch"
  | "root-identity-mismatch"
  | "region-identity-mismatch"
  | "missing-visual-instance"
  | "visual-instance-mismatch"
  | "continuation-provider-mismatch"
  | "stale-continuation-version"
  | "continuation-source-mismatch"
  | "stale-provider-context"
  | "provider-job-canceled"
  | "provider-execution-failed"
  | "missing-semantic-export-semantics"
  | "missing-semantic-export-fallback"
  | "retained-region-product-gap"
  | "layout-source-range-mismatch"
  | "layout-root-identity-mismatch"
  | "layout-region-identity-mismatch"
  | "layout-capability-mismatch"
  | "layout-constraint-mismatch"
  | "layout-fragment-manifest-mismatch"
  | "fragment-view-root-mismatch"
  | "fragment-view-region-mismatch"
  | "fragment-source-range-mismatch";

/** One rejected provider result fact exposed to diagnostics. */
export interface QuireLayoutProviderGap {
  /** Stable machine-readable gap code. */
  readonly code: QuireLayoutProviderGapCode;
  /** Human-readable reason the result was rejected. */
  readonly message: string;
  /** Provider involved in the rejected result. */
  readonly providerId: string;
  /** Source id involved in the rejected result. */
  readonly sourceId: string;
  /** Root id involved in the gap, when applicable. */
  readonly rootId?: string | undefined;
  /** Region id involved in the gap, when applicable. */
  readonly regionId?: string | undefined;
  /** Sub-layout fragment id involved in the gap, when applicable. */
  readonly fragmentId?: string | undefined;
  /** Underlying retained-region compiler gap, when applicable. */
  readonly retainedGapCode?: QuireRetainedRegionProductGapCode | undefined;
}

/** Result of validating provider output against framework authority. */
export type QuireLayoutProviderValidation =
  | {
      /** Discriminator for accepted provider output. */
      readonly valid: true;
      /** Unchanged provider result accepted by validation. */
      readonly result: QuireLayoutProviderResult;
    }
  | {
      /** Discriminator for rejected provider output. */
      readonly valid: false;
      /** Explicit gaps that prevent the result from becoming canonical. */
      readonly gaps: readonly QuireLayoutProviderGap[];
    };

/** Options used to validate one provider result. */
export interface ValidateQuireLayoutProviderResultOptions {
  /** Authoritative framework context used for provider execution. */
  readonly context: QuireLayoutProviderContext;
  /** Provider output to validate without repairing it. */
  readonly result: QuireLayoutProviderResult;
}

/** Internal layout algorithm registered for one or more node types. */
export interface QuireLayoutProvider {
  /** Stable capability-owned provider id. */
  readonly id: string;
  /** Node type names explicitly supported by this provider. */
  readonly nodeTypes: readonly string[];
  /** Capability classes implemented by this provider. */
  readonly capabilities: readonly QuireLayoutProviderCapabilityKind[];
  /** Explicit retained identity and selection policy for the primary region. */
  readonly regionContract: QuireLayoutProviderRegionContract;
  /**
   * Produces canonical layout products for one framework-owned context.
   *
   * @param context - Authoritative provider execution context.
   * @returns Provider result that must pass canonical validation.
   */
  readonly layout: (
    context: QuireLayoutProviderContext
  ) => QuireLayoutProviderOutput;
}

/** Options used to compile one provider output. */
export interface CompileQuireLayoutProviderOutputOptions {
  /** Authoritative framework context used for provider execution. */
  readonly context: QuireLayoutProviderContext;
  /** Narrow provider output to compile and validate. */
  readonly output: QuireLayoutProviderOutput;
}

/** Stable registration gap reported before provider execution. */
export type QuireLayoutProviderRegistrationGapCode =
  | "duplicate-provider-id"
  | "ambiguous-node-provider";

/** One provider registration conflict. */
export interface QuireLayoutProviderRegistrationGap {
  /** Stable registration gap code. */
  readonly code: QuireLayoutProviderRegistrationGapCode;
  /** Human-readable conflict description. */
  readonly message: string;
  /** Provider id involved in an id conflict, when applicable. */
  readonly providerId?: string | undefined;
  /** Node type owned by multiple providers, when applicable. */
  readonly nodeType?: string | undefined;
  /** Providers that ambiguously claim the node type. */
  readonly providerIds?: readonly string[] | undefined;
}

/** Deterministic lookup surface for validated layout providers. */
export interface QuireLayoutProviderRegistry {
  /** All registered providers in declaration order. */
  readonly providers: readonly QuireLayoutProvider[];
  /**
   * Resolves the unique provider registered for one node type.
   *
   * @param nodeType - ProseMirror node type name.
   * @returns Registered provider, or undefined when none exists.
   */
  readonly resolve: (nodeType: string) => QuireLayoutProvider | undefined;
}

/** Result of building one deterministic provider registry. */
export type QuireLayoutProviderRegistryResult =
  | {
      /** Discriminator for an accepted provider registry. */
      readonly valid: true;
      /** Deterministic provider registry. */
      readonly registry: QuireLayoutProviderRegistry;
    }
  | {
      /** Discriminator for rejected provider registration. */
      readonly valid: false;
      /** Registration conflicts that prevent deterministic lookup. */
      readonly gaps: readonly QuireLayoutProviderRegistrationGap[];
    };

/** Provider execution outcome exposed to layout diagnostics. */
export type QuireLayoutProviderExecutionStatus =
  | "accepted"
  | "rejected"
  | "skipped"
  | "failed";

/** Timing and lifecycle diagnostics for one provider execution. */
export interface QuireLayoutProviderExecutionDiagnostics {
  /** Provider selected for execution. */
  readonly providerId: string;
  /** Layout job id that owned the execution. */
  readonly jobId: string;
  /** Snapshot version expected by the execution. */
  readonly snapshotVersion: number;
  /** Lifecycle outcome. */
  readonly status: QuireLayoutProviderExecutionStatus;
  /** Synchronous execution duration in milliseconds. */
  readonly durationMs: number;
}

/** Accepted or rejected provider execution result. */
export type QuireLayoutProviderExecutionResult =
  | {
      /** Accepted result discriminator. */
      readonly status: "accepted";
      /** Validated canonical provider output. */
      readonly result: QuireLayoutProviderResult;
      /** Provider timing and lifecycle diagnostics. */
      readonly diagnostics: QuireLayoutProviderExecutionDiagnostics;
    }
  | {
      /** Rejected result discriminator. */
      readonly status: "rejected";
      /** Explicit gaps that prevented canonical consumption. */
      readonly gaps: readonly QuireLayoutProviderGap[];
      /** Provider timing and lifecycle diagnostics. */
      readonly diagnostics: QuireLayoutProviderExecutionDiagnostics;
    };

/** Options used to execute one provider inside layout authority. */
export interface ExecuteQuireLayoutProviderOptions {
  /** Provider selected by a validated registry. */
  readonly provider: QuireLayoutProvider;
  /** Authoritative provider context. */
  readonly context: QuireLayoutProviderContext;
  /** Snapshot version still active at execution time. */
  readonly activeSnapshotVersion: number;
  /** Optional monotonic clock used by diagnostics and tests. */
  readonly now?: (() => number) | undefined;
}
