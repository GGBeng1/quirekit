import type { QuireDocumentRange, QuireHitArea, QuireViewNode } from "@quirekit/renderer";
import type {
  QuireLayoutExportFallback,
  QuireLayoutRootKind,
  QuireLayoutSearchPolicy,
  QuireLayoutSemanticRole
} from "../../identity";
import type {
  QuireInlineSourcePlacementDeclaration
} from "../source-placement";
/** Opaque host activation provenance used only to distinguish presentation signatures. */
export interface QuireInlineSourceActivationMetadata {
  /** Optional related source range, without a selection or activation evaluator. */
  readonly relatedRange?: QuireDocumentRange | undefined;
}

/** Physical overflow reserved around one selected-only View product. */
export interface QuireInlineSourceVisualOverflow {
  /** Additional paint and hit extent above the accepted rectangle. */
  readonly top: number;
  /** Additional paint and hit extent to the right of the accepted rectangle. */
  readonly right: number;
  /** Additional paint and hit extent below the accepted rectangle. */
  readonly bottom: number;
  /** Additional paint and hit extent to the left of the accepted rectangle. */
  readonly left: number;
}

/** Source-owned transform consumed only by retained interaction geometry. */
export interface QuireInlineSourceInteractionTransform {
  /** Clockwise rotation in the y-down document coordinate system. */
  readonly rotation: number;
}

/** View presentation facts owned by one anchored source type. */
export interface QuireInlineSourcePresentation<TActivation extends QuireInlineSourceActivationMetadata = QuireInlineSourceActivationMetadata> {
  /** Renderer-neutral visual tree owned by the exact source type. */
  readonly view: QuireViewNode;
  /** Optional text whose visible value is resolved for each physical page. */
  readonly occurrenceText?: QuireInlineSourceOccurrenceText | undefined;
  /** Optional content-paint overflow beyond the accepted object rectangle. */
  readonly viewVisualOverflow?: QuireInlineSourceVisualOverflow | undefined;
  /** Stable source-owned identity for paint and selected-chrome invalidation. */
  readonly presentationSignature?: string | undefined;
  /** Optional transform shared by object hits and selected-only artifacts. */
  readonly interactionTransform?: QuireInlineSourceInteractionTransform | undefined;
  /** Optional frame-local exact hit areas replacing the default object rectangle, before rotation. */
  readonly interactionHitAreas?: readonly QuireHitArea[] | undefined;
  /**
   * Optional selected-only editor chrome compiled on the controls plane. A factory runs only
   * when the chrome is first realized, which happens while its owner is selected.
   */
  readonly selectedView?: QuireViewNode | (() => QuireViewNode) | undefined;
  /** Optional controls-plane overflow reserved around selected-only chrome. */
  readonly selectedViewVisualOverflow?: QuireInlineSourceVisualOverflow | undefined;
  /** Optional activation scope for selected-only editor chrome. */
  readonly selectedViewActivation?: TActivation | undefined;
  /** Retained root kind represented by the anchored object. */
  readonly rootKind: QuireLayoutRootKind;
  /** Semantic role exposed to accessibility, search, and export consumers. */
  readonly semanticRole: QuireLayoutSemanticRole;
  /** Explicit search behavior for the anchored object shell. */
  readonly search: QuireLayoutSearchPolicy;
  /** Explicit export fallbacks for formats that cannot retain placement. */
  readonly exportFallbacks: readonly QuireLayoutExportFallback[];
}

/** Text value resolved only after one physical page occurrence exists. */
export interface QuireInlineSourceOccurrenceText {
  /** Canonical target anchor position; omission uses this source, null retains its fallback. */
  readonly referencePosition?: number | null | undefined;
  /** Neutral physical-page, document-count or section fact. */
  readonly kind: "section-page-number" | "document-page-count" | "section-number" | "section-page-count" | "page-source-text";
  /** Clone-safe formatting specification interpreted only by the document profile. */
  readonly formatToken?: unknown;
}

/** Resolved paragraph/run typography available to one inline source resolver. */
export interface QuireInlineSourceTextStyle {
  /** CSS font shorthand inherited by the inline source. */
  readonly font: string;
  /** Glyph color inherited from direct marks, when explicitly set. */
  readonly color?: string | undefined;
  /** Resolved line-box height in CSS pixels. */
  readonly lineHeight: number;
  /** Resolved baseline offset from the line-box top edge. */
  readonly baselineOffset: number;
}

/** Typed failure produced while compiling a live inline node capability. */
export interface QuireInlineSourceCapabilityGap {
  /** Stable gap classification. */
  readonly code:
    | "invalid-source-declaration"
    | "unsupported-flow-exclusion";
  /** Exact node type claimed by the failing resolver. */
  readonly nodeType: string;
  /** Human-readable diagnostic that does not invent fallback semantics. */
  readonly message: string;
}

/** Resolved View adapter product keyed by a canonical source anchor. */
export interface QuireResolvedInlineSourceCapabilitySidecar<TActivation extends QuireInlineSourceActivationMetadata = QuireInlineSourceActivationMetadata> {
  /** Stable logical source anchor identity. */
  readonly sourceAnchorId: string;
  /** Exact document node type claimed by the resolver. */
  readonly nodeType: string;
  /** Discriminant for a fully resolved source capability. */
  readonly status: "resolved";
  /** Renderer-neutral placement product consumed by layout geometry. */
  readonly placement: QuireInlineSourcePlacementDeclaration;
  /** View presentation product consumed only by retained View compilation. */
  readonly presentation: QuireInlineSourcePresentation<TActivation>;
}

/** Failed View adapter product keyed by a canonical source anchor. */
export interface QuireGapInlineSourceCapabilitySidecar {
  /** Stable logical source anchor identity. */
  readonly sourceAnchorId: string;
  /** Exact document node type claimed by the resolver. */
  readonly nodeType: string;
  /** Discriminant for a claimed capability that failed compilation. */
  readonly status: "gap";
  /** Typed failures retained without fallback placement or presentation. */
  readonly gaps: readonly QuireInlineSourceCapabilityGap[];
}

/** Exact-node View adapter product associated with one canonical source anchor. */
export type QuireInlineSourceCapabilitySidecar<TActivation extends QuireInlineSourceActivationMetadata = QuireInlineSourceActivationMetadata> =
  | QuireResolvedInlineSourceCapabilitySidecar<TActivation>
  | QuireGapInlineSourceCapabilitySidecar;

/** Input accepted by an internal source-capability resolver. */
export interface QuireInlineSourceCapabilityResolverInput {
  /** Exact inline node type being compiled. */
  readonly nodeType: string;
  /** Live node attrs consumed only during synchronous source collection. */
  readonly attrs: Readonly<Record<string, unknown>>;
  /** Stable anchor identity supplied before semantic measurement. */
  readonly sourceAnchorId?: string | undefined;
  /** Canonical source position, independent of viewport projection. */
  readonly position?: number | undefined;
  /** Current pagination convergence candidate, measured before paragraph shaping. */
  readonly occurrenceValue?: string | undefined;
  /** Optional inherited typography for text-like inline capabilities. */
  readonly textStyle?: QuireInlineSourceTextStyle | undefined;
}

/** Result returned by one exact node-type resolver. */
export type QuireInlineSourceCapabilityResolverResult<TActivation extends QuireInlineSourceActivationMetadata = QuireInlineSourceActivationMetadata> =
  | {
      /** Capability compilation succeeded. */
      readonly status: "resolved";
      /** Renderer-neutral placement product. */
      readonly placement: QuireInlineSourcePlacementDeclaration;
      /** View presentation product. */
      readonly presentation: QuireInlineSourcePresentation<TActivation>;
    }
  | {
      /** Capability compilation failed without a semantic fallback. */
      readonly status: "gap";
      /** Typed gaps retained for diagnostics. */
      readonly gaps: readonly QuireInlineSourceCapabilityGap[];
    };

/** Internal resolver owned by one exact inline node type. */
export interface QuireInlineSourceCapabilityResolver<TActivation extends QuireInlineSourceActivationMetadata = QuireInlineSourceActivationMetadata> {
  /** Exact document node type claimed by this resolver. */
  readonly nodeType: string;
  /**
   * Compiles live attrs into placement and View presentation products.
   *
   * @param input - Exact node type and live attrs from source collection.
   * @returns Resolved products or typed gaps; never an inferred fallback.
   */
  readonly resolve: (
    input: QuireInlineSourceCapabilityResolverInput
  ) => QuireInlineSourceCapabilityResolverResult<TActivation>;
}

/** Exact-node-type registry used during source collection. */
export interface QuireInlineSourceCapabilityRegistry<TActivation extends QuireInlineSourceActivationMetadata = QuireInlineSourceActivationMetadata> {
  /**
   * Resolves a live inline node before pure layout begins.
   *
   * @param input - Exact node type and attrs to compile.
   * @returns Resolver result, or undefined when no capability claims the type.
   */
  readonly resolve: (
    input: QuireInlineSourceCapabilityResolverInput
  ) => QuireInlineSourceCapabilityResolverResult<TActivation> | undefined;
}
