import type { QuireLayoutProviderCapabilityKind } from "@quirekit/core/layout-provider";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type {
  QuireDisplayCommandLayer,
  QuireDocumentRange,
  QuireRect,
  QuireViewNode
} from "@quirekit/renderer";
import type { QuireViewLayerActivation } from "../view-graph";
import type { QuireLayoutProviderInteractionTarget } from "./interaction";
import type { QuireLayoutProviderSemanticDescriptor } from "./semantics";

declare const childInputBrand: unique symbol;
declare const containerBrand: unique symbol;
declare const fragmentBrand: unique symbol;
declare const contributionBrand: unique symbol;
declare const declarationBrand: unique symbol;

/** Capability flags explicitly owned by a provider root or region. */
interface QuireLayoutProviderCapabilities {
  /** Whether text input may mutate the owned source. */
  readonly editable: boolean;
  /** Whether the owned source may participate in selection. */
  readonly selectable: boolean;
  /** Whether focus may enter the owned source. */
  readonly focusable: boolean;
  /** Whether clipboard consumers may serialize the owned source. */
  readonly copyable: boolean;
  /** Whether editor commands may route through the owned source. */
  readonly commandable: boolean;
  /** Whether accessibility consumers may expose the owned source. */
  readonly accessible: boolean;
}

/** Stable source identity supplied by framework layout authority. */
interface QuireLayoutProviderSource {
  /** Snapshot-stable source id. */
  readonly sourceId: string;
  /** Exact document range represented by the source, when available. */
  readonly range?: QuireDocumentRange | undefined;
}

/** Framework-owned root handle. External providers may read but not allocate it. */
interface QuireLayoutProviderRoot {
  /** Stable root id. */
  readonly id: Readonly<{ value: string }>;
  /** Root semantic kind. */
  readonly kind: QuireLayoutProviderRootKind;
  /** Exact source represented by the root. */
  readonly source: QuireLayoutProviderSource;
  /** Capabilities owned by the root. */
  readonly capabilities: QuireLayoutProviderCapabilities;
}

/** Framework-owned region occurrence handle. */
interface QuireLayoutProviderRegion {
  /** Root that owns the region. */
  readonly rootId: Readonly<{ value: string }>;
  /** Stable logical region id. */
  readonly regionId: Readonly<{ value: string }>;
  /** Region semantic kind. */
  readonly kind: QuireLayoutProviderRegionKind;
  /** Repeated visual occurrence id, when the region is repeated. */
  readonly visualInstanceId?: string | undefined;
}

/** Root kinds available to external layout algorithms. */
type QuireLayoutProviderRootKind =
  | "document"
  | "body"
  | "header"
  | "footer"
  | "footnote"
  | "endnote"
  | "table-cell"
  | "text-box"
  | "drawing-text"
  | "block-container"
  | "media"
  | "embed";

/** Region kinds available to external layout algorithms. */
type QuireLayoutProviderRegionKind =
  | "body"
  | "header"
  | "footer"
  | "footnote"
  | "endnote"
  | "section"
  | "page-decoration"
  | "watermark"
  | "table-cell"
  | "floating-object"
  | "text-box"
  | "drawing-text"
  | "readonly-text"
  | "node-body"
  | "block-container"
  | "media"
  | "embed"
  | "content-control"
  | "interactive-widget"
  | "control";

/** Coordinate spaces accepted by provider authoring services. */
type QuireLayoutProviderCoordinateSpace =
  | "document"
  | "page"
  | "body"
  | "region-local"
  | "table-cell-local"
  | "shape-local"
  | "text-box-local";

/** Selection policy explicitly owned by one provider region. */
type QuireLayoutProviderSelectionPolicy =
  | "delegate-to-text"
  | "readonly-text"
  | "node-selection"
  | "object-selection"
  | "control-dispatch";

/** Stable visual occurrence expected from one provider execution. */
type QuireLayoutProviderVisualInstance =
  | { readonly kind: "single" }
  | {
      /** Repeated occurrence discriminator. */
      readonly kind: "repeated";
      /** Snapshot-local repeated occurrence id. */
      readonly visualInstanceId: string;
    };

/** Tagged constraints supplied by the parent layout authority. */
interface QuireLayoutProviderConstraints {
  /** Parent-space block-flow origin. */
  readonly origin: Readonly<{ x: number; y: number }>;
  /** Available inline size in CSS pixels. */
  readonly inlineSize: number;
  /** Optional parent-owned block extent. */
  readonly blockSize:
    | { readonly kind: "unbounded" }
    | { readonly kind: "bounded"; readonly size: number };
  /** Default recursive block height. */
  readonly blockHeight: number;
  /** Default recursive block gap. */
  readonly blockGap: number;
  /** Coordinate space that owns the constraints. */
  readonly coordinateSpace: QuireLayoutProviderCoordinateSpace;
}

/** Explicit retained identity policy for a provider's primary region. */
interface QuireLayoutProviderRegionContract {
  /** Root kind allocated by framework authority. */
  readonly rootKind: QuireLayoutProviderRootKind;
  /** Primary region kind allocated inside the root. */
  readonly regionKind: QuireLayoutProviderRegionKind;
  /** Capabilities promised by the provider. */
  readonly capabilities: QuireLayoutProviderCapabilities;
  /** Selection behavior owned by the primary region. */
  readonly selectionPolicy: QuireLayoutProviderSelectionPolicy;
}

/** Opaque source-order child input collected by framework authority. */
interface QuireLayoutProviderChildInput {
  /** Prevents external construction of framework child inputs. */
  readonly [childInputBrand]: true;
}

/** Framework-created recursive container with readable accepted geometry. */
export interface QuireLayoutProviderContainer {
  /** Prevents external construction of framework containers. */
  readonly [containerBrand]: true;
  /** Stable container id. */
  readonly id: string;
  /** Exact source range represented by the container. */
  readonly range: QuireDocumentRange;
  /** Accepted parent-space container rectangle. */
  readonly rect: QuireRect;
}

/** Opaque child-flow fragment compiled by framework pagination authority. */
interface QuireLayoutProviderFragment {
  /** Prevents external construction of framework fragments. */
  readonly [fragmentBrand]: true;
}

/** Opaque renderer-neutral contribution installed into shared block flow. */
interface QuireLayoutProviderContribution {
  /** Prevents external construction of framework contributions. */
  readonly [contributionBrand]: true;
  /** Stable contribution id. */
  readonly id: string;
  /** Exact source range represented by the contribution. */
  readonly range: QuireDocumentRange;
  /** Accepted parent-space contribution rectangle. */
  readonly rect: QuireRect;
}

/** Opaque retained-region declaration compiled by framework authority. */
export interface QuireLayoutProviderRegionDeclaration {
  /** Prevents external construction or mutation of retained declarations. */
  readonly [declarationBrand]: true;
}

/** One explicit visual track consumed by framework child flow. */
export interface QuireLayoutProviderFlowTrack {
  /** Stable track id. */
  readonly id: string;
  /** Track rectangle in its tagged coordinate space. */
  readonly rect: QuireRect;
  /** Coordinate space owning the track. */
  readonly coordinateSpace: QuireLayoutProviderCoordinateSpace;
  /** Exact region occurrence owning the track. */
  readonly region: QuireLayoutProviderRegion;
  /** Exact source identity flowed through the track. */
  readonly source: QuireLayoutProviderSource;
  /** Capabilities preserved by the track. */
  readonly capabilities: QuireLayoutProviderCapabilities;
}

/** Semantic export fallback attached before backend serialization. */
interface QuireLayoutProviderExportFallback {
  /** Fallback fidelity class. */
  readonly kind:
    | "native"
    | "semantic-degraded"
    | "visual-snapshot"
    | "plain-text"
    | "omitted-interaction";
  /** Target format that requires the fallback. */
  readonly targetFormat?:
    | "docx"
    | "html"
    | "plain-text"
    | "image"
    | "clipboard"
    | undefined;
  /** Human-readable fidelity reason. */
  readonly reason?: string | undefined;
}

/** Request for collecting recursive source-order block inputs. */
interface QuireLayoutProviderChildCollectionRequest {
  /** Source node whose children should be collected. */
  readonly node: ProseMirrorNode;
  /** Absolute document position where node content starts. */
  readonly contentStart: number;
  /** Stable source path from the document root. */
  readonly path: readonly number[];
  /** Accepted inline size used for recursive shaping. */
  readonly inlineSize: number;
}

/** Request for canonical recursive block layout. */
interface QuireLayoutProviderContainerRequest {
  /** Stable container id. */
  readonly id: string;
  /** Exact source range represented by the container. */
  readonly range: QuireDocumentRange;
  /** Parent-space layout frame. */
  readonly rect: QuireRect;
  /** Default child block height. */
  readonly blockHeight: number;
  /** Gap between recursive children. */
  readonly blockGap: number;
  /** Framework-collected source-order children. */
  readonly children: readonly QuireLayoutProviderChildInput[];
}

/** Explicit retained owner used by child-flow services. */
interface QuireLayoutProviderFlowOwner {
  /** Framework-owned root handle. */
  readonly root: QuireLayoutProviderRoot;
  /** Exact region occurrence handle. */
  readonly region: QuireLayoutProviderRegion;
}

/** Request for flowing recursive children through visual tracks. */
interface QuireLayoutProviderChildFlowRequest {
  /** Stable source-flow id. */
  readonly id: string;
  /** Exact retained owner. */
  readonly owner: QuireLayoutProviderFlowOwner;
  /** Framework-created source-order container. */
  readonly source: QuireLayoutProviderContainer;
  /** Visual tracks consumed in declared order. */
  readonly tracks: readonly QuireLayoutProviderFlowTrack[];
  /** Stable dependency signature for continuation reuse. */
  readonly dependencySignature: string;
}

/** Result of framework-owned child-flow placement. */
interface QuireLayoutProviderChildFlowResult {
  /** Visual child containers placed into tracks. */
  readonly children: readonly QuireLayoutProviderContainer[];
  /** Opaque source-preserving fragments. */
  readonly fragments: readonly QuireLayoutProviderFragment[];
  /** Next source-flow coordinate. */
  readonly nextSourceFlowY: number;
  /** Whether all source children were consumed. */
  readonly complete: boolean;
}

/** Request for relocating a framework-created container. */
export interface QuireLayoutProviderContainerPlacementRequest {
  /** Container to relocate without rebuilding its child geometry. */
  readonly container: QuireLayoutProviderContainer;
  /** Accepted replacement rectangle. */
  readonly rect: QuireRect;
  /** Optional exact retained owner installed on the relocated container. */
  readonly owner?: QuireLayoutProviderFlowOwner | undefined;
}

/** Request for allocating one additional root and region occurrence. */
interface QuireLayoutProviderRootRegionIdentityRequest {
  /** Stable provider-local identity key. */
  readonly localId: string;
  /** Source kind represented by the identity. */
  readonly sourceKind: string;
  /** Exact source identity represented by the region. */
  readonly source: QuireLayoutProviderSource;
  /** Root kind requested by the provider. */
  readonly rootKind: QuireLayoutProviderRootKind;
  /** Region kind requested by the provider. */
  readonly regionKind: QuireLayoutProviderRegionKind;
  /** Capabilities promised by the allocated region. */
  readonly capabilities: QuireLayoutProviderCapabilities;
  /** Region rectangle in the tagged coordinate space. */
  readonly rect: QuireRect;
  /** Coordinate space owning the region rectangle. */
  readonly coordinateSpace: QuireLayoutProviderCoordinateSpace;
  /** Selection policy owned by the region. */
  readonly selectionPolicy: QuireLayoutProviderSelectionPolicy;
  /** Optional repeated visual occurrence. */
  readonly visualInstance?: QuireLayoutProviderVisualInstance | undefined;
}

/** Framework-allocated identity and opaque region declaration. */
interface QuireLayoutProviderRootRegionIdentity {
  /** Framework-owned root handle. */
  readonly root: QuireLayoutProviderRoot;
  /** Exact region occurrence handle. */
  readonly region: QuireLayoutProviderRegion;
  /** Opaque declaration that must be returned by the provider. */
  readonly declaration: QuireLayoutProviderRegionDeclaration;
}

/** Request for compiling a neutral view tree into layer artifacts. */
interface QuireLayoutProviderLayerContributionRequest {
  /** Stable contribution id. */
  readonly contributionId: string;
  /** Exact retained owner. */
  readonly owner: QuireLayoutProviderFlowOwner;
  /** Exact document range represented by the contribution. */
  readonly range: QuireDocumentRange;
  /** Contribution rectangle. */
  readonly rect: QuireRect;
  /** Optional complete paint bounds containing declared visual overflow. */
  readonly visualBounds?: QuireRect | undefined;
  /** Coordinate space owning the rectangle. */
  readonly coordinateSpace: "document";
  /** Editor layer used for ordering and interaction ownership. */
  readonly layer: Readonly<{
    plane:
      | "page-background"
      | "content"
      | "page-chrome"
      | "selection"
      | "annotation"
      | "drawing"
      | "controls"
      | "dom-proxy"
      | "floating-ui";
    zIndex?: number | undefined;
  }>;
  /** Last-mile paint surface shared by mounted renderers. */
  readonly paintSurface: QuireDisplayCommandLayer;
  /** Optional runtime activation evaluated against the exact retained owner. */
  readonly activation?: QuireViewLayerActivation | undefined;
  /** Neutral view tree compiled by renderer authority. */
  readonly node: QuireViewNode;
}

/** Opaque layer contribution declaration. */
interface QuireLayoutProviderLayerContribution {
  /** Prevents external construction of compiled layer contributions. */
  readonly [declarationBrand]: true;
}

/** Request for attaching region-owned products to an opaque declaration. */
export interface QuireLayoutProviderRegionProductsRequest {
  /** Opaque base declaration created by framework authority. */
  readonly declaration: QuireLayoutProviderRegionDeclaration;
  /** Exact owner needed to compile interaction products. */
  readonly owner: QuireLayoutProviderFlowOwner;
  /** Provider layer contributions owned by this region. */
  readonly layerContributions?: readonly QuireLayoutProviderLayerContribution[] | undefined;
  /** Interaction targets owned by this region. */
  readonly interactionTargets?: readonly QuireLayoutProviderInteractionTarget[] | undefined;
  /** Semantic facts owned by this exact region occurrence. */
  readonly semantics?: QuireLayoutProviderSemanticDescriptor | undefined;
  /** Semantic export fallbacks owned by this region and root. */
  readonly exportFallbacks?: readonly QuireLayoutProviderExportFallback[] | undefined;
}

/** Request for constructing the renderer-neutral block contribution. */
export interface QuireLayoutProviderContributionRequest {
  /** Stable contribution id. */
  readonly id: string;
  /** Exact source range represented by the contribution. */
  readonly range: QuireDocumentRange;
  /** Parent-space contribution rectangle. */
  readonly rect: QuireRect;
  /** Exact retained owner installed on the contribution. */
  readonly owner: QuireLayoutProviderFlowOwner;
  /** Optional recursive container whose measured child content is installed. */
  readonly content?: QuireLayoutProviderContainer | undefined;
  /** Framework-created child containers. */
  readonly children?: readonly QuireLayoutProviderContainer[] | undefined;
  /** Framework-created child-flow fragments. */
  readonly fragments?: readonly QuireLayoutProviderFragment[] | undefined;
  /** Semantic export fallbacks owned by the contribution. */
  readonly exportFallbacks?: readonly QuireLayoutProviderExportFallback[] | undefined;
}

/** Framework-owned services available only during versioned provider layout. */
export interface QuireLayoutProviderServices {
  /** Compiles one exact region-owned neutral layer tree. */
  readonly compileLayerContribution: (
    request: QuireLayoutProviderLayerContributionRequest
  ) => QuireLayoutProviderLayerContribution;
  /** Declares the primary region at its accepted geometry. */
  readonly declarePrimaryRegion: (
    rect: QuireRect
  ) => QuireLayoutProviderRegionDeclaration;
  /** Attaches products to an opaque framework declaration. */
  readonly declareRegionProducts: (
    request: QuireLayoutProviderRegionProductsRequest
  ) => QuireLayoutProviderRegionDeclaration;
  /** Collects source-order child inputs without exposing layout internals. */
  readonly collectBlockInputs: (
    request: QuireLayoutProviderChildCollectionRequest
  ) => readonly QuireLayoutProviderChildInput[];
  /** Lays out source-order children through canonical recursive block flow. */
  readonly layoutBlockContainer: (
    request: QuireLayoutProviderContainerRequest
  ) => QuireLayoutProviderContainer;
  /** Relocates a framework container while preserving child geometry. */
  readonly placeBlockContainer: (
    request: QuireLayoutProviderContainerPlacementRequest
  ) => QuireLayoutProviderContainer;
  /** Flows recursive children through explicit visual tracks. */
  readonly flowBlockChildren: (
    request: QuireLayoutProviderChildFlowRequest
  ) => QuireLayoutProviderChildFlowResult;
  /** Allocates one explicit retained root and region occurrence. */
  readonly allocateRootRegion: (
    request: QuireLayoutProviderRootRegionIdentityRequest
  ) => QuireLayoutProviderRootRegionIdentity;
  /** Constructs the only block contribution accepted from external providers. */
  readonly createContribution: (
    request: QuireLayoutProviderContributionRequest
  ) => QuireLayoutProviderContribution;
}

/** Cancelable versioned-layout job. */
interface QuireLayoutProviderJob {
  /** Stable diagnostics id. */
  readonly jobId: string;
  /** Reports whether provider work must stop. */
  readonly isCanceled: () => boolean;
}

/** Authoritative context supplied for one provider execution. */
export interface QuireLayoutProviderContext {
  /** Provider selected by deterministic registration. */
  readonly providerId: string;
  /** Snapshot version owning this execution. */
  readonly snapshotVersion: number;
  /** Exact source identity being laid out. */
  readonly source: QuireLayoutProviderSource;
  /** Source node selected by provider registration. */
  readonly sourceNode: ProseMirrorNode;
  /** Stable source path from the document root. */
  readonly sourcePath: readonly number[];
  /** Absolute position where source content starts. */
  readonly sourceContentStart: number;
  /** Framework-owned root handle. */
  readonly root: QuireLayoutProviderRoot;
  /** Framework-owned primary region occurrence. */
  readonly region: QuireLayoutProviderRegion;
  /** Expected visual occurrence. */
  readonly visualInstance: QuireLayoutProviderVisualInstance;
  /** Parent-owned layout constraints. */
  readonly constraints: QuireLayoutProviderConstraints;
  /** Framework-owned authoring services. */
  readonly services: QuireLayoutProviderServices;
  /** Prior accepted continuation for the same provider and exact source. */
  readonly previousContinuation?: QuireLayoutProviderContinuation | undefined;
  /** Cancelable versioned-layout job. */
  readonly job: QuireLayoutProviderJob;
}

/** Provider-owned immutable continuation state. */
export interface QuireLayoutProviderContinuation {
  /** Provider owning the continuation. */
  readonly providerId: string;
  /** Snapshot version that produced the continuation. */
  readonly snapshotVersion: number;
  /** Exact source being continued. */
  readonly source: QuireLayoutProviderSource;
  /** Dependency signature required for reuse. */
  readonly dependencySignature: string;
  /** Immutable provider-owned payload. */
  readonly state: Readonly<Record<string, unknown>>;
}

/** Narrow output accepted by provider compilation authority. */
export interface QuireLayoutProviderOutput {
  /** Provider that produced the output. */
  readonly providerId: string;
  /** Snapshot version used to produce the output. */
  readonly snapshotVersion: number;
  /** Exact source identity represented by the output. */
  readonly source: QuireLayoutProviderSource;
  /** Framework-created renderer-neutral contribution. */
  readonly layout: QuireLayoutProviderContribution;
  /** Framework-created retained declarations. */
  readonly declarations: readonly QuireLayoutProviderRegionDeclaration[];
  /** Framework-created child-flow fragments. */
  readonly fragments: readonly QuireLayoutProviderFragment[];
  /** Provider continuation, or null when terminal. */
  readonly continuation: QuireLayoutProviderContinuation | null;
}

/** External layout algorithm registered for one or more source node types. */
export interface QuireLayoutProvider {
  /** Stable capability-owned provider id. */
  readonly id: string;
  /** Explicitly supported source node types. */
  readonly nodeTypes: readonly string[];
  /** Capability classes implemented by the provider. */
  readonly capabilities: readonly QuireLayoutProviderCapabilityKind[];
  /** Explicit primary retained-region policy. */
  readonly regionContract: QuireLayoutProviderRegionContract;
  /** Produces output exclusively through the supplied framework services. */
  readonly layout: (
    context: QuireLayoutProviderContext
  ) => QuireLayoutProviderOutput;
}
