import type {
  QuireDocumentRange,
  QuireRect,
  QuireTextLineSlot
} from "@quirekit/renderer";
import type { QuireBlockFlowInput } from "@quirekit/layout/block-flow";
import type { QuireLeafFlowCache } from "../cache/leaf-flow";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireInlineExclusionGeometry,
  QuireInlineTextRun
} from "@quirekit/layout/inline";
import type {
  QuireInlineSourceCapabilitySidecar
} from "./inline/source-capability";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutExportFallback,
  QuireLayoutRegionRef,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type { QuireRetainedRegionProducts } from "../region-products";
import type { QuireLayoutProviderSourceInput } from "../providers";
import type {
  QuireLayoutProviderExecutionLifecycle
} from "../providers/lifecycle";
import type {
  QuireRetainedBlockDependencyEpochs,
  QuireRetainedBlockLayoutGraph
} from "../retained-block";
import type { QuireLayoutDirtyRange } from "../../invalidation";
import type { QuireInlinePlacementGap } from "./inline/placement-reference";

/** One renderer-neutral physical paragraph border side. */
export interface QuireParagraphDecorationBorder {
  /** OOXML-compatible border style token. */
  readonly style: string;
  /** CSS stroke token, omitted when automatic text color should be used. */
  readonly strokeStyle?: string | undefined;
  /** Border width in CSS pixels. */
  readonly lineWidth: number;
  /** Distance from paragraph content in CSS pixels. */
  readonly space: number;
}

/** Renderer-neutral paragraph background and physical border topology. */
export interface QuireParagraphDecoration {
  /** Symmetric physical expansion around the paragraph indentation interval. */
  readonly inlineOutset?: number | undefined;
  /** CSS fill token for paragraph shading. */
  readonly fillStyle?: string | undefined;
  /** Physical x offset from the full paragraph wrapping rectangle. */
  readonly inlineOffset?: number | undefined;
  /** Physical width of the paragraph decoration interval. */
  readonly inlineSize?: number | undefined;
  /** Physical top border. */
  readonly top?: QuireParagraphDecorationBorder | undefined;
  /** Physical right border. */
  readonly right?: QuireParagraphDecorationBorder | undefined;
  /** Physical bottom border. */
  readonly bottom?: QuireParagraphDecorationBorder | undefined;
  /** Physical left border. */
  readonly left?: QuireParagraphDecorationBorder | undefined;
  /** Whether this visual fragment owns the paragraph top edge. */
  readonly firstFragment: boolean;
  /** Whether this visual fragment owns the paragraph bottom edge. */
  readonly lastFragment: boolean;
}

/** One accepted drawing exclusion carried across sibling block inputs. */
export interface QuireBlockFlowExclusion {
  /** Stable source-anchor identity that produced the exclusion. */
  readonly sourceAnchorId: string;
  /** Stable semantic object identity represented by the exclusion. */
  readonly objectId: string;
  /** Clearance-expanded rectangle in the owning textblock's local coordinates. */
  readonly rect: QuireRect;
  /** Exact exclusion algorithm and resolved local geometry. */
  readonly geometry: QuireInlineExclusionGeometry;
}

/** Source-bound service that reshapes one textblock against physical row slots. */
export interface QuireBlockTextFlowReflow {
  /** Nominal row height used to project exclusions onto visual rows. */
  readonly lineHeight: number;
  /**
   * Reshapes the source textblock against exact flow slots.
   *
   * @param lineSlots - Ordered physical slots for each affected visual row.
   * @param slotSignature - Stable geometry signature used for shape-cache identity.
   * @returns Fresh or cached text fragments in textblock-local coordinates.
   */
  readonly reflow: (
    lineSlots: readonly (readonly QuireTextLineSlot[])[],
    slotSignature: string
  ) => QuireBlockTextFlowReflowResult;
  /**
   * Reshapes evaluated inline replacements for one derived visual occurrence.
   *
   * @param replacements - Exact occurrence extents keyed by source anchor id.
   * @returns Fresh runs and fragments in textblock-local coordinates.
   */
  readonly reflowInlineReplacements: (
    replacements: ReadonlyMap<string, QuireInlineOccurrenceReplacementExtent>
  ) => QuireBlockInlineOccurrenceReflowResult;
}

/** Exact occurrence extent supplied for one semantic inline replacement. */
export interface QuireInlineOccurrenceReplacementExtent {
  /** Inline advance measured from the evaluated visible value. */
  readonly inlineSize: number;
  /** Block extent inherited from the evaluated value's line typography. */
  readonly blockSize: number;
  /** Optional distance from the replacement top edge to the shared line baseline. */
  readonly baselineOffset?: number | undefined;
}

/** Products reshaped together for one derived inline-field occurrence. */
export interface QuireBlockInlineOccurrenceReflowResult {
  /** Logical runs with occurrence-specific replacement extents. */
  readonly textRuns: readonly QuireInlineTextRun[];
  /** Fresh text fragments in textblock-local coordinates. */
  readonly textFragments: readonly QuireTextFragment[];
}

/** Products recalculated together when sibling exclusions reshape a textblock. */
export interface QuireBlockTextFlowReflowResult {
  /** Fresh text fragments in textblock-local coordinates. */
  readonly textFragments: readonly QuireTextFragment[];
  /** Object exclusions resolved from the fresh anchor caret topology. */
  readonly localFlowExclusions: readonly QuireBlockFlowExclusion[];
}

/** Input node consumed by the recursive block layout engine. */
export interface QuireBlockLayoutInput extends QuireBlockFlowInput {
  /** Minimum resolved first/following-line width for insertion, in local CSS pixels. */
  readonly inlineContentWidth?: number | undefined;
  /** Optional paragraph background and border paint metadata. */
  readonly paragraphDecoration?: QuireParagraphDecoration | undefined;
  /** Claimed View capability products keyed by source anchor id. */
  readonly sourceCapabilities?: readonly QuireInlineSourceCapabilitySidecar[];
  /** Paragraph-local flow failures retained independently of page placement. */
  readonly flowExclusionGaps?: readonly QuireInlinePlacementGap[] | undefined;
  /** Accepted local exclusions that remain active across sibling paragraphs. */
  readonly localFlowExclusions?: readonly QuireBlockFlowExclusion[] | undefined;
  /** Optional exact reshaping authority for cross-paragraph flow slots. */
  readonly textFlowReflow?: QuireBlockTextFlowReflow | undefined;
  /** Child block inputs that should be laid out recursively. */
  readonly children?: readonly QuireBlockLayoutInput[];
  /** Optional validated provider source handled by canonical layout authority. */
  readonly layoutProvider?: QuireLayoutProviderSourceInput;
  /** Optional retained view-graph root represented by this input. */
  readonly viewRoot?: QuireLayoutRoot | undefined;
  /** Optional retained view-graph region represented by this input. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Optional retained view-graph capabilities represented by this input. */
  readonly viewCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Optional export fallback declarations represented by this input. */
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  /**
   * Optional capability-owned retained products represented by this input.
   *
   * Product geometry is textblock-local at this boundary and is projected to
   * document space together with text fragments when the block is placed.
   */
  readonly regionProducts?: QuireRetainedRegionProducts | undefined;
}

/** Options for laying out one block container. */
export interface QuireBlockContainerLayoutOptions {
  /** Stable id for the produced container. */
  readonly id: string;
  /** Document range represented by the produced container. */
  readonly range: QuireDocumentRange;
  /** Container origin and available width. Height is recomputed from content. */
  readonly rect: QuireRect;
  /** Default height for leaf blocks without measured content. */
  readonly blockHeight: number;
  /** Vertical gap between sibling block boxes. */
  readonly blockGap: number;
  /** Available parent fragment height, or undefined for unbounded flow. */
  readonly fragmentBlockSize?: number | undefined;
  /** Child block inputs in document order. */
  readonly children: readonly QuireBlockLayoutInput[];
  /** Optional retained view-graph root represented by this container. */
  readonly viewRoot?: QuireLayoutRoot | undefined;
  /** Optional retained view-graph region represented by this container. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Optional retained view-graph capabilities represented by this container. */
  readonly viewCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Optional export fallback declarations represented by this container. */
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  /** Optional changed document range used for container-prefix reuse. */
  readonly dirtyRange?: QuireDocumentRange | null | undefined;
  /** Optional canonical dirty range consumed by retained reconciliation. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
  /** Optional retained top-level block graph owned by the current view. */
  readonly retainedBlockGraph?: QuireRetainedBlockLayoutGraph | undefined;
  /** Exact leaf placement cache propagated from the owning retained graph. */
  readonly leafFlowCache?: QuireLeafFlowCache | undefined;
  /** Provider execution lifecycle propagated through recursive block flow. */
  readonly providerExecutionLifecycle?: QuireLayoutProviderExecutionLifecycle | undefined;
  /** Resource epochs used to validate retained block dependencies. */
  readonly retainedDependencyEpochs?: QuireRetainedBlockDependencyEpochs | undefined;
}
