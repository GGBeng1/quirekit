import type {
  QuireDocumentRange,
  QuireHitArea,
  QuireRect
} from "@quirekit/renderer";
import type { QuireHitTarget } from "../../engine/types";
import type {
  QuireRetainedLayerContribution,
  QuireRetainedLayerContributionDeclaration
} from "../layer-contribution/types";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutCoordinateSpaceKind,
  QuireLayoutExportFallback,
  QuireLayoutRegion,
  QuireLayoutRegionRef,
  QuireLayoutRegionKind,
  QuireLayoutRoot,
  QuireLayoutRootKind,
  QuireLayoutSemanticDescriptor,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireViewInteractionHit,
  QuireViewLayerRef,
  QuireViewPointerPolicy
} from "../../../view-graph";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";

/** Internal product family a retained-region producer can declare. */
export type QuireRetainedRegionProductKind =
  | "view-root"
  | "view-region"
  | "layer-contribution"
  | "layer-target"
  | "selection-policy"
  | "export-fallback";

/** Selection policy declared for one retained region. */
export type QuireRetainedRegionSelectionPolicyKind =
  | "delegate-to-text"
  | "readonly-text"
  | "node-selection"
  | "object-selection"
  | "control-dispatch";

/** Visual-instance policy for one retained region. */
export type QuireRetainedRegionVisualInstancePolicyKind = "single" | "repeated";

/** Stable gap code reported by the internal retained-region producer compiler. */
export type QuireRetainedRegionProductGapCode =
  | "missing-producer-id"
  | "missing-source-kind"
  | "missing-source"
  | "missing-root"
  | "missing-root-id"
  | "missing-root-kind"
  | "missing-root-capabilities"
  | "missing-region"
  | "missing-region-id"
  | "missing-region-kind"
  | "missing-region-source"
  | "missing-region-capabilities"
  | "missing-semantic-role"
  | "blank-semantic-label"
  | "blank-semantic-description"
  | "missing-semantic-source-range"
  | "missing-semantic-search-text"
  | "missing-semantic-search-keyword"
  | "missing-semantic-exclusion-reason"
  | "missing-parent-region"
  | "missing-visual-instance"
  | "duplicate-region"
  | "missing-target-id"
  | "missing-target-region"
  | "missing-target-range"
  | "missing-target-rect"
  | "missing-layer-contribution-id"
  | "missing-layer-contribution-root"
  | "missing-layer-contribution-region-id"
  | "missing-layer-contribution-region"
  | "missing-layer-contribution-visual-instance"
  | "layer-contribution-visual-instance-mismatch"
  | "missing-layer-contribution-artifacts"
  | "unsupported-layer-contribution-coordinate-space"
  | "unsupported-layer-contribution-activation"
  | "unsupported-layer-contribution-visual-bounds"
  | "invalid-layer-contribution-visual-bounds"
  | "duplicate-layer-contribution-id"
  | "missing-layer-command-id"
  | "duplicate-layer-command-id"
  | "missing-layer-overlay-id"
  | "duplicate-layer-overlay-id"
  | "missing-layer-target-id"
  | "duplicate-layer-target-id"
  | "missing-layer-contribution-owner-range"
  | "missing-layer-contribution-owner-rect"
  | "layer-contribution-range-outside-owner"
  | "layer-artifact-range-outside-owner"
  | "layer-contribution-rect-outside-owner"
  | "layer-command-rect-outside-contribution"
  | "layer-overlay-rect-outside-contribution"
  | "layer-target-rect-outside-contribution"
  | "missing-selection-policy-region";

/** Visual-instance declaration for one retained region. */
export interface QuireRetainedRegionVisualInstanceDeclaration {
  /** Whether the region can appear once or as repeated visual instances. */
  readonly kind: QuireRetainedRegionVisualInstancePolicyKind;
  /** Concrete repeated visual instance id when the source can appear multiple times. */
  readonly visualInstanceId?: string | undefined;
}

/** Root declaration produced by an internal retained-region producer. */
export interface QuireRetainedRegionRootDeclaration {
  /** Stable retained root id owned by the producer. */
  readonly rootId?: string | undefined;
  /** Retained root kind exposed to selection, command routing, and diagnostics. */
  readonly kind?: QuireLayoutRootKind | undefined;
  /** Source identity represented by the root. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Capability declarations represented by the root. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
  /** Semantic facts represented by the root. */
  readonly semantics?: QuireLayoutSemanticDescriptor | undefined;
  /** Export fallbacks declared by the root. */
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  /** Producer-private diagnostics metadata; canonical routing must not depend on it. */
  readonly diagnosticsMetadata?: Readonly<Record<string, unknown>> | undefined;
}

/** Region declaration produced by an internal retained-region producer. */
export interface QuireRetainedRegionRegionDeclaration {
  /** Stable retained region id inside the producer root. */
  readonly regionId?: string | undefined;
  /** Retained region kind exposed to selection, command routing, and diagnostics. */
  readonly kind?: QuireLayoutRegionKind | undefined;
  /** Source identity represented by this region. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Optional parent region id inside the same producer root. */
  readonly parentRegionId?: string | undefined;
  /** Optional region bounds in the declared coordinate space. */
  readonly rect?: QuireRect | undefined;
  /** Coordinate space used by the region bounds. */
  readonly coordinateSpace?: QuireLayoutCoordinateSpaceKind | undefined;
  /** Visual instance declaration for repeated visual occurrences. */
  readonly visualInstance?: QuireRetainedRegionVisualInstanceDeclaration | undefined;
  /** Capability declarations represented by this region. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
  /** Semantic facts represented by this exact region occurrence. */
  readonly semantics?: QuireLayoutSemanticDescriptor | undefined;
  /** Export fallbacks declared by this region. */
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  /** Producer-private diagnostics metadata; canonical routing must not depend on it. */
  readonly diagnosticsMetadata?: Readonly<Record<string, unknown>> | undefined;
}

/** Layer target declaration produced by an internal retained-region producer. */
export interface QuireRetainedRegionLayerTargetDeclaration {
  /** Stable target id inside the producer output. */
  readonly targetId?: string | undefined;
  /** Region id that owns this target. */
  readonly regionId?: string | undefined;
  /** Enclosing story owner that gates interaction without replacing the target region. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Document range represented by the target. */
  readonly range?: QuireDocumentRange | undefined;
  /** Document-space rectangle used for retained hit testing. */
  readonly rect?: QuireRect | undefined;
  /** Optional exact geometry evaluated after the coarse rectangle. */
  readonly hitArea?: QuireHitArea | undefined;
  /** Optional retained visual layer declared by the target. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Optional retained pointer policy declared by the target. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Optional canonical interaction hit represented by this target. */
  readonly interactionHit?: QuireViewInteractionHit | undefined;
}

/** Selection policy declaration produced by an internal retained-region producer. */
export interface QuireRetainedRegionSelectionPolicyDeclaration {
  /** Stable policy id inside the producer output. */
  readonly policyId: string;
  /** Region id whose selection behavior is described by this policy. */
  readonly regionId: string;
  /** Selection behavior exposed by the region. */
  readonly kind: QuireRetainedRegionSelectionPolicyKind;
}

/** Internal retained-region producer declaration before canonical products exist. */
export interface QuireRetainedRegionProductDeclaration {
  /** Stable producer id used by diagnostics and target id scoping. */
  readonly producerId?: string | undefined;
  /** ProseMirror node type name this internal producer handles. */
  readonly sourceKind?: string | undefined;
  /** Source identity represented by the producer-level node. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Product kinds this producer intends to expose. */
  readonly productKinds?: readonly QuireRetainedRegionProductKind[] | undefined;
  /** Retained root declaration for the node. */
  readonly root?: QuireRetainedRegionRootDeclaration | undefined;
  /** Retained region declarations for the node. */
  readonly regions?: readonly QuireRetainedRegionRegionDeclaration[] | undefined;
  /** Layer target declarations exposed by the node. */
  readonly layerTargets?: readonly QuireRetainedRegionLayerTargetDeclaration[] | undefined;
  /** Renderer-neutral layer contributions exposed by the node. */
  readonly layerContributions?: readonly QuireRetainedLayerContributionDeclaration[] | undefined;
  /** Selection policy declarations exposed by the node. */
  readonly selectionPolicies?: readonly QuireRetainedRegionSelectionPolicyDeclaration[] | undefined;
}

/** Resolved selection policy tied to a retained region. */
export interface QuireRetainedRegionSelectionPolicy {
  /** Stable policy id inside the producer output. */
  readonly policyId: string;
  /** Resolved retained region address owned by the policy. */
  readonly region: QuireLayoutRegionRef;
  /** Selection behavior exposed by the region. */
  readonly kind: QuireRetainedRegionSelectionPolicyKind;
}

/** One production gap reported by the internal retained-region compiler. */
export interface QuireRetainedRegionProductGap {
  /** Stable machine-readable gap code. */
  readonly code: QuireRetainedRegionProductGapCode;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Producer id involved in the gap, when known. */
  readonly producerId?: string | undefined;
  /** ProseMirror node type involved in the gap, when known. */
  readonly sourceKind?: string | undefined;
  /** Region id involved in the gap, when known. */
  readonly regionId?: string | undefined;
  /** Target id involved in the gap, when known. */
  readonly targetId?: string | undefined;
  /** Layer contribution id involved in the gap, when known. */
  readonly contributionId?: string | undefined;
  /** Nested command, overlay, or target id involved in the gap, when known. */
  readonly artifactId?: string | undefined;
}

/** Canonical products compiled from one internal retained-region producer. */
export interface QuireRetainedRegionProductCompilation {
  /** Whether the declaration compiled without production gaps. */
  readonly valid: boolean;
  /** Stable producer id, when the declaration provided one. */
  readonly producerId?: string | undefined;
  /** ProseMirror node type name, when the declaration provided one. */
  readonly sourceKind?: string | undefined;
  /** Retained root compiled from the declaration. */
  readonly root?: QuireLayoutRoot | undefined;
  /** Retained regions compiled from the declaration. */
  readonly regions: readonly QuireLayoutRegion[];
  /** Retained hit targets compiled from declared layer targets. */
  readonly hitTargets: readonly QuireHitTarget[];
  /** Renderer-neutral layer contributions bound to exact retained owners. */
  readonly layerContributions: readonly QuireRetainedLayerContribution[];
  /** Selection policies retained for later selection-semantics consumers. */
  readonly selectionPolicies: readonly QuireRetainedRegionSelectionPolicy[];
  /** Production gaps that prevented the declaration from being canonical. */
  readonly gaps: readonly QuireRetainedRegionProductGap[];
}
