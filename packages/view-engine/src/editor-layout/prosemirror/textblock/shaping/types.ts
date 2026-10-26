import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireInlineSourceAnchor, QuireInlineTextRun } from "@quirekit/layout/inline";
import type { QuireTextLineMetricContribution } from "@quirekit/renderer";
import type { QuireListMarker, QuireParagraphAlignment, QuireParagraphFormatting } from "../../../../document-profile/types";
import type { QuireInlineSourceCapabilitySidecar } from "../../../../layout/engine/inline/source-capability";
import type { QuireInlinePlacementGap } from "../../../../layout/engine/inline/placement-reference";
import type { QuireBlockFlowExclusion } from "../../../../layout/engine/block-types";
import type { QuireProseMirrorBlockInputOptions } from "../../types";
import type { QuireNodeTextMetrics } from "../../font";
import type { QuireTextblockIndentationGeometry } from "../indentation";

/** Inputs needed to shape one textblock's inline runs into fragments. */
export interface ShapeTextblockFragmentsRequest extends Pick<QuireParagraphFormatting, "avoidPunctuationBreaks" | "tabs" | "autoSpacing"> {
  /** Textblock node used as the shape cache key. */
  readonly node: ProseMirrorNode;
  /** Conversion options carrying the shape cache and inline layout inputs. */
  readonly options: QuireProseMirrorBlockInputOptions;
  /** Stable id used for produced fragment ids. */
  readonly id: string;
  /** Inline runs collected from the textblock content. */
  readonly runs: readonly QuireInlineTextRun[];
  /** Logical non-text anchors collected from the textblock content. */
  readonly sourceAnchors: readonly QuireInlineSourceAnchor[];
  /** Clone-safe capabilities keyed by source anchor id. */
  readonly sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[];
  /** Block-scoped font and line metrics. */
  readonly metrics: QuireNodeTextMetrics;
  /** Resolved base direction for the textblock. */
  readonly baseDirection: "ltr" | "rtl" | "auto";
  /** Resolved logical paragraph alignment; omitted legacy callers use start. */
  readonly alignment?: QuireParagraphAlignment | undefined;
  /** Absolute document position at the start of block content. */
  readonly contentStart: number;
  /** Absolute document position at the end of block content. */
  readonly contentEnd: number;
  /** Section- and paragraph-dependent measurement cache identity. */
  readonly cacheVariant?: string | undefined;
  /** Optional generated marker whose inherited indentation owns body geometry. */
  readonly wordNumberingMarker?: QuireListMarker | undefined;
  /** Optional marker-collision-adjusted paragraph geometry. */
  readonly indentationGeometry?: QuireTextblockIndentationGeometry | undefined;
  /** Effective paragraph character pitch used by relative indentation. */
  readonly characterPitch?: number | undefined;
  /** Optional source-neutral vertical metrics keyed by resolved visual line. */
  readonly lineMetricContributions?: readonly (
    QuireTextLineMetricContribution | undefined
  )[] | undefined;
  /** Optional paragraph-mark metrics applied only to the final visual line. */
  readonly finalLineMetricContribution?: QuireTextLineMetricContribution | undefined;
}

/** Result of shaping one textblock, including explicit flow-exclusion failures. */
export interface ShapeTextblockFragmentsResult {
  /** Accepted text fragments, or the full-width baseline after non-convergence. */
  readonly fragments: readonly QuireTextFragment[];
  /** Accepted local exclusions that remain active across sibling paragraphs. */
  readonly flowExclusions: readonly QuireBlockFlowExclusion[];
  /** Typed flow-exclusion gaps that must survive pagination projection. */
  readonly flowExclusionGaps: readonly QuireInlinePlacementGap[];
}
