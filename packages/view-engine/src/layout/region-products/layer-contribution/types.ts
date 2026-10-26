import type {
  QuireDisplayCommand,
  QuireDisplayCommandLayer,
  QuireDocumentRange,
  QuireLayoutDomOverlay,
  QuireRect,
  QuireViewNode,
  QuireViewTarget
} from "@quirekit/renderer";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef,
  QuireLayoutRoot,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type {
  QuireViewCoordinateSpaceKind,
  QuireViewLayerActivation,
  QuireViewLayerRef
} from "../../../view-graph";

/** Exact retained owner assigned to one compiled layer contribution. */
export interface QuireRetainedLayerContributionOwner {
  /** Retained root that owns the contribution. */
  readonly root: QuireLayoutRoot;
  /** Exact retained region that owns the contribution. */
  readonly region: QuireLayoutRegionRef;
  /** Region-owned source identity; this is never inferred from the root. */
  readonly source: QuireLayoutSourceRef;
  /** Region-owned capability facts; these are never inherited from a container. */
  readonly capabilities: QuireLayoutCapabilitySet;
}

/** Canonical renderer-neutral artifacts owned by one retained region. */
export interface QuireRetainedLayerContribution {
  /** Stable contribution id inside its producer. */
  readonly contributionId: string;
  /** Exact retained owner compiled from the declared region. */
  readonly owner: QuireRetainedLayerContributionOwner;
  /** Enclosing story owner that gates interaction without replacing the exact contribution owner. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Document range represented by the contribution. */
  readonly range: QuireDocumentRange;
  /** Contribution bounds in the tagged coordinate space. */
  readonly rect: QuireRect;
  /** Optional complete paint bounds containing declared visual overflow. */
  readonly visualBounds?: QuireRect | undefined;
  /** Coordinate space that owns the contribution geometry. */
  readonly coordinateSpace: "document";
  /** Editor layer used for ordering and interaction ownership. */
  readonly layer: QuireViewLayerRef;
  /** Renderer-neutral command layer used by display-list consumers. */
  readonly paintSurface: QuireDisplayCommandLayer;
  /** Optional runtime activation evaluated without recompiling provider output. */
  readonly activation?: QuireViewLayerActivation | undefined;
  /** Renderer-neutral paint commands shared by all render backends. */
  readonly commands: readonly QuireDisplayCommand[];
  /** DOM overlays shared by mounted and serialized render consumers. */
  readonly domOverlays: readonly QuireLayoutDomOverlay[];
  /** Action and cursor targets shared by interaction consumers. */
  readonly targets: readonly QuireViewTarget[];
}

/** Provider declaration compiled into an exact retained layer contribution. */
export interface QuireRetainedLayerContributionDeclaration {
  /** Stable contribution id inside its producer. */
  readonly contributionId?: string | undefined;
  /** Exact declared retained region id that owns the contribution. */
  readonly regionId?: string | undefined;
  /** Exact repeated visual-instance id, omitted only for a single occurrence. */
  readonly visualInstanceId?: string | undefined;
  /** Enclosing story owner inherited by interaction targets compiled from this contribution. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Document range represented by the contribution. */
  readonly range?: QuireDocumentRange | undefined;
  /** Contribution bounds in the tagged coordinate space. */
  readonly rect?: QuireRect | undefined;
  /** Optional complete paint bounds containing declared visual overflow. */
  readonly visualBounds?: QuireRect | undefined;
  /** Coordinate space that owns the contribution geometry. */
  readonly coordinateSpace?: QuireViewCoordinateSpaceKind | undefined;
  /** Editor layer used for ordering and interaction ownership. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Renderer-neutral command layer used by display-list consumers. */
  readonly paintSurface?: QuireDisplayCommandLayer | undefined;
  /** Optional runtime activation evaluated against the exact retained owner. */
  readonly activation?: QuireViewLayerActivation | undefined;
  /** Renderer-neutral paint commands produced during versioned layout. */
  readonly commands?: readonly QuireDisplayCommand[] | undefined;
  /** DOM overlays produced during versioned layout. */
  readonly domOverlays?: readonly QuireLayoutDomOverlay[] | undefined;
  /** Action and cursor targets produced during versioned layout. */
  readonly targets?: readonly QuireViewTarget[] | undefined;
}

/** Explicit owner supplied to the provider framework compilation service. */
export interface QuireLayoutProviderLayerContributionOwner {
  /** Retained root allocated by framework authority. */
  readonly root: QuireLayoutRoot;
  /** Exact retained region allocated by framework authority. */
  readonly region: QuireLayoutRegionRef;
}

/** Request compiled by the framework during one versioned provider layout. */
export interface QuireLayoutProviderLayerContributionRequest {
  /** Stable contribution id inside the provider output. */
  readonly contributionId: string;
  /** Exact retained owner allocated by framework authority. */
  readonly owner: QuireLayoutProviderLayerContributionOwner;
  /** Document range represented by the contribution. */
  readonly range: QuireDocumentRange;
  /** Requested contribution bounds in the tagged coordinate space. */
  readonly rect: QuireRect;
  /** Optional complete paint bounds containing declared visual overflow. */
  readonly visualBounds?: QuireRect | undefined;
  /** Coordinate space that owns the contribution geometry. */
  readonly coordinateSpace: "document";
  /** Editor layer used for ordering and interaction ownership. */
  readonly layer: QuireViewLayerRef;
  /** Renderer-neutral command layer used by display-list consumers. */
  readonly paintSurface: QuireDisplayCommandLayer;
  /** Optional runtime activation for transient owner-bound layer products. */
  readonly activation?: QuireViewLayerActivation | undefined;
  /** Neutral view tree compiled into commands, overlays, and targets. */
  readonly node: QuireViewNode;
}

/** Canonical request for compiling one region-owned neutral view tree. */
export interface QuireRetainedLayerContributionViewRequest {
  /** Stable contribution id inside the retained region. */
  readonly contributionId: string;
  /** Exact retained root id used only to namespace renderer artifacts. */
  readonly rootId: string;
  /** Exact retained region id that owns the compiled artifacts. */
  readonly regionId: string;
  /** Exact repeated visual-instance id, omitted for a single occurrence. */
  readonly visualInstanceId?: string | undefined;
  /** Enclosing story owner inherited by interaction targets compiled from this view. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Document range represented by the contribution. */
  readonly range: QuireDocumentRange;
  /** Requested contribution bounds in document coordinates. */
  readonly rect: QuireRect;
  /** Optional complete paint bounds containing declared visual overflow. */
  readonly visualBounds?: QuireRect | undefined;
  /** Editor layer used for ordering and interaction ownership. */
  readonly layer: QuireViewLayerRef;
  /** Renderer-neutral command layer used by display-list consumers. */
  readonly paintSurface: QuireDisplayCommandLayer;
  /** Optional runtime activation for transient owner-bound products. */
  readonly activation?: QuireViewLayerActivation | undefined;
  /**
   * Neutral view tree supplied by the exact source or provider authority. A runtime-activated
   * request may pass a factory, which runs only when the contribution's artifacts are first read.
   */
  readonly node: QuireViewNode | (() => QuireViewNode);
}

/** Context attached to layer-contribution compilation gaps. */
export interface QuireLayerContributionCompilationContext {
  /** Stable producer id, when valid. */
  readonly producerId?: string | undefined;
  /** Source kind, when valid. */
  readonly sourceKind?: string | undefined;
}

/** Eager identity, ownership, geometry and layer facts of one compiled contribution. */
export type QuireRetainedLayerContributionHeader = Omit<QuireRetainedLayerContribution, keyof QuireLayerContributionBody>;

/** Renderer artifacts of one layer contribution, realized on first read when deferred. */
export interface QuireLayerContributionBody {
  /** Renderer-neutral paint commands. */
  readonly commands: readonly QuireDisplayCommand[];
  /** DOM overlays shared by mounted and serialized render consumers. */
  readonly domOverlays: readonly QuireLayoutDomOverlay[];
  /** Action and cursor targets shared by interaction consumers. */
  readonly targets: readonly QuireViewTarget[];
}
