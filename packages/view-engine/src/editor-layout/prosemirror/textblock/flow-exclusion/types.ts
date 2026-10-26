import type {
  QuireInlineSourceAnchor,
  QuireInlineExclusionGeometry,
  QuireInlineSourceClearance
} from "@quirekit/layout/inline";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireRect, QuireTextLineSlot } from "@quirekit/renderer";
import type { QuireInlineSourceCapabilitySidecar } from "../../../../layout/engine/inline/source-capability";

/** Inputs needed to derive paragraph-local row slots from square exclusions. */
export interface ResolveQuireTextblockFlowSlotsOptions {
  /** Baseline full-width fragments used to resolve source caret topology. */
  readonly fragments: readonly QuireTextFragment[];
  /** Logical non-text anchors collected from the textblock. */
  readonly sourceAnchors: readonly QuireInlineSourceAnchor[];
  /** Clone-safe capabilities keyed by source anchor id. */
  readonly sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[];
  /** Paragraph-local inline extent. */
  readonly width: number;
  /** Nominal visual row height used by the text primitive. */
  readonly lineHeight: number;
}

/** Stable paragraph-local row slots compiled before final shaping. */
export interface QuireTextblockFlowSlots {
  /** Ordered physical slots for each declared visual row. */
  readonly lineSlots: readonly (readonly QuireTextLineSlot[])[];
  /** Stable geometry signature used by shaping-cache authority. */
  readonly signature: string;
  /** Anchored objects whose exclusions contributed to this slot result. */
  readonly participants: readonly QuireTextblockFlowParticipant[];
}

/** One anchored object participating in paragraph-local flow exclusion. */
export interface QuireTextblockFlowParticipant {
  /** Stable logical source-anchor identity. */
  readonly sourceAnchorId: string;
  /** Stable semantic object identity from the resolved capability. */
  readonly objectId: string;
}

/** One locally resolvable drawing exclusion. */
export interface QuireLocalTextblockFlowExclusion {
  /** Anchored object represented by this exclusion. */
  readonly participant: QuireTextblockFlowParticipant;
  /** Clearance-expanded paragraph-local rectangle. */
  readonly rect: QuireRect;
  /** Exact exclusion algorithm and resolved paragraph-local geometry. */
  readonly geometry: QuireInlineExclusionGeometry;
}

/** Inputs for bounded paragraph flow-exclusion convergence. */
export interface ConvergeQuireTextblockFlowShapeOptions {
  /** Full-width fragments retained as the deterministic failure fallback. */
  readonly baselineFragments: readonly QuireTextFragment[];
  /** Maximum exclusion-shaped passes allowed after the baseline. */
  readonly maxPasses: number;
  /**
   * Resolves slots from the fragments produced by the preceding pass.
   *
   * @param fragments - Current paragraph fragments.
   * @returns Resolved slots, or undefined when the current pass has no exclusion.
   */
  readonly resolveSlots: (
    fragments: readonly QuireTextFragment[]
  ) => QuireTextblockFlowSlots | undefined;
  /**
   * Shapes the paragraph against one slot result or full width.
   *
   * @param flowSlots - Current row-slot result, or undefined for full-width shaping.
   * @returns Paragraph fragments produced by this pass.
   */
  readonly shape: (
    flowSlots: QuireTextblockFlowSlots | undefined
  ) => readonly QuireTextFragment[];
}

/** Result of bounded paragraph flow-exclusion convergence. */
export type QuireTextblockFlowShapeConvergenceResult =
  | {
      /** Stable result accepted by the layout authority. */
      readonly status: "resolved";
      /** Stable paragraph fragments. */
      readonly fragments: readonly QuireTextFragment[];
      /** Stable slots, or undefined when the paragraph remains full width. */
      readonly flowSlots?: QuireTextblockFlowSlots | undefined;
    }
  | {
      /** Bounded passes exhausted without a stable slot signature. */
      readonly status: "non-convergent";
      /** Full-width baseline retained instead of the last unstable frame. */
      readonly fragments: readonly QuireTextFragment[];
      /** Objects that participated in at least one unstable pass. */
      readonly participants: readonly QuireTextblockFlowParticipant[];
      /** Applied and subsequently resolved signatures in observation order. */
      readonly signatures: readonly string[];
    };

/** Rectangle plus clearance input used by local exclusion expansion. */
export interface QuireTextblockExclusionExpansion {
  /** Accepted object placement rectangle. */
  readonly rect: QuireRect;
  /** Logical clearance surrounding the object. */
  readonly clearance: QuireInlineSourceClearance;
}
