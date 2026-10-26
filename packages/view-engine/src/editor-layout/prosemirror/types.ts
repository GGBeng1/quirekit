import type {
  QuireDocumentFontTheme,
  QuireDocumentFontTable,
  QuireMarkCanvasStyleResolver,
  QuireNodeCanvasTextStyleResolver
} from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireLineBreakMode } from "@quirekit/layout/inline";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type {
  QuireLineGrid,
  QuireListMarker,
  QuireParagraphModelProfile,
  QuireParagraphStyleContext,
  QuireTableModelProfile,
  QuireTableStyleContext
} from "../../document-profile/types";
import type { QuireInlineSourceCapabilityRegistry } from "../../layout/engine/inline/source-capability";
import type { QuireLayoutProviderRegistry } from "../../layout/providers";
import type { QuireLayoutSnapshotOptions } from "../types";

/** Predicate deciding whether a top-level source block belongs to body flow. */
export type QuireTopLevelBlockInclusionPredicate = (
  node: ProseMirrorNode,
  index: number
) => boolean;

/** Options for converting a ProseMirror document into block layout inputs. */
export interface QuireProseMirrorBlockInputOptions extends Pick<QuireLayoutSnapshotOptions,
  "state" | "lineBreaker" | "hiddenTextViewMode" | "listMarkerCollision"
  | "layoutDirtyRange" | "trace" | "blockShapeCache" | "maxBlocks" | "maxShapedBlockExtent"
> {
  /** Numbering markers resolved once for the current document-order pass. */
  readonly wordNumberingMarkers?: ReadonlyMap<number, QuireListMarker> | undefined;
  /** Optional editor-source filter for blocks that do not belong to body flow. */
  readonly includeTopLevelBlock?: QuireTopLevelBlockInclusionPredicate | undefined;
  /** Snapshot version allocated before provider-aware source collection. */
  readonly snapshotVersion: number;
  /** Deterministic provider registry used for capability-owned layout nodes. */
  readonly layoutProviderRegistry: QuireLayoutProviderRegistry;
  /** Internal registry used to compile non-text inline source capabilities. */
  readonly sourceCapabilityRegistry?: QuireInlineSourceCapabilityRegistry | undefined;
  /** Internal active line grid for nested body measurement. */
  readonly lineGrid?: QuireLineGrid | null | undefined;
  /** Inherited character constraints, independent of paragraph line snapping. */
  readonly characterGrid?: QuireCharacterGrid | null | undefined;
  /** Container character-grid owner; undefined preserves the inherited value. */
  readonly resolveContainerCharacterGrid?: ((node: ProseMirrorNode) => QuireCharacterGrid | null | undefined) | undefined;
  /** Paragraph semantics for indentation; the neutral model applies when omitted. */
  readonly paragraphModel?: QuireParagraphModelProfile | undefined;
  /** Resolves the line grid a container establishes; undefined leaves the inherited grid in place. */
  readonly resolveContainerLineGrid?: ((node: ProseMirrorNode) => QuireLineGrid | null | undefined) | undefined;
  /** Table model; the neutral model lays out no grid tables. */
  readonly tableModel?: QuireTableModelProfile | undefined;
  /** Document-wide table style authority resolved by the table model. */
  readonly tableStyleContext?: QuireTableStyleContext | undefined;
  /** Document-wide paragraph style authority; resolved from the paragraph model when omitted. */
  readonly paragraphStyleContext?: QuireParagraphStyleContext | undefined;
  /** Internal marker that suppresses section grids inside Word table cells. */
  readonly insideWordTableCell?: boolean | undefined;
  /** Internal table-style layer token of the containing table cell. */
  readonly wordTableCellStyleLayer?: unknown;
  /** Optional resolver for per-mark canvas style deltas. */
  readonly resolveMarkQuireStyle?: QuireMarkCanvasStyleResolver;
  /** Optional resolver for per-node base canvas text style. */
  readonly resolveNodeQuireTextStyle?: QuireNodeCanvasTextStyleResolver;
  /** Available inline width for local text fragment layout. */
  readonly width: number;
  /** Base CSS font shorthand used by unmarked text. */
  readonly font: string;
  /** Optional canonical theme used to itemize unformatted text by font slot. */
  readonly documentFontTheme?: QuireDocumentFontTheme | undefined;
  /** Optional document alternate-name table used by script-slot itemization. */
  readonly documentFontTable?: QuireDocumentFontTable | undefined;
  /** Visual line height for local inline rows. */
  readonly lineHeight: number;
  /** Vertical offset from textblock top edge to text baseline. */
  readonly textBaselineOffset: number;
  /** Text measurer used by inline layout. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Line-breaking strategy used by inline layout. */
  readonly lineBreakMode: QuireLineBreakMode;
}

/** Source container used to collect nested ProseMirror block layout inputs. */
export interface QuireProseMirrorBlockContainerSource {
  /** ProseMirror container whose direct block children should be converted. */
  readonly node: ProseMirrorNode;
  /** Absolute document position of the container's first content position. */
  readonly contentStart: number;
  /** Child-index path from the document root to the source container. */
  readonly path: readonly number[];
}
import type { QuireCharacterGrid } from "@quirekit/renderer";
