import type {
  QuireDocumentFontTheme,
  QuireDocumentFontTable,
  QuireMarkCanvasStyleResolver,
  QuireNodeCanvasTextStyleResolver
} from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type {
  QuireInlineSourceAnchor,
  QuireInlineTextRun
} from "@quirekit/layout/inline";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireCharacterGrid, QuireTextLineMetricContribution } from "@quirekit/renderer";
import type { QuireBlockPaginationPolicy } from "@quirekit/layout/block-flow";
import type {
  QuireInlineSourceCapabilityRegistry,
  QuireInlineSourceCapabilitySidecar
} from "../../../layout/engine/inline/source-capability";
import {
  applyQuireNodeTextMetrics,
  resolveQuireDocumentFontRole
} from "../font";
import type { QuireNodeTextMetrics } from "../font";
import { collectQuireProseMirrorInlineSources } from "../inline";
import { resolveQuireDocumentFontSet } from "../document-font-theme";
import type {
  QuireLineGrid,
  QuireParagraphAlignment,
  QuireParagraphFormatting,
  QuireParagraphModelProfile,
  QuireParagraphStyleContext
} from "../../../document-profile/types";
import { quireNeutralDocumentProfile } from "../../../document-profile/defaults";
import {
  resolveQuireLineGridMetrics,
  resolveQuireLineGridParticipation
} from "./document-grid";
import {
  resolveQuireNaturalRunGlyphMetrics,
  resolveQuireParagraphMarkMetricSample
} from "./natural-line-metrics";
import type { QuireHiddenTextViewMode } from "../../types";
import type { QuireParagraphDecoration } from "../../../layout/engine/block-types";
import { resolveQuireParagraphDecoration } from "./decoration";
import { resolveQuireNumberingMarkerInheritanceTypography } from "./paragraph-mark-typography";

/** Inputs needed to resolve one textblock before geometry shaping. */
export interface ResolveQuireTextblockShapingSourceOptions {
  /** ProseMirror textblock whose source runs should be resolved. */
  readonly node: ProseMirrorNode;
  /** Absolute document position at the start of textblock content. */
  readonly contentStart: number;
  /** Absolute document position at the end of textblock content. */
  readonly contentEnd: number;
  /** Stable id of the textblock that owns the inline sources. */
  readonly sourceId: string;
  /** Base CSS font inherited by the textblock. */
  readonly font: string;
  /** Optional canonical theme used for document font-slot itemization. */
  readonly documentFontTheme?: QuireDocumentFontTheme | undefined;
  /** Optional document alternate-name table used by script-slot itemization. */
  readonly documentFontTable?: QuireDocumentFontTable | undefined;
  /** Base visual line height inherited by the textblock. */
  readonly lineHeight: number;
  /** Base baseline offset inherited by the textblock. */
  readonly textBaselineOffset: number;
  /** Optional text measurer used when section document grids are active. */
  readonly textMeasurer?: QuireTextMeasurer | undefined;
  /** Optional per-node text-style resolver. */
  readonly resolveNodeQuireTextStyle?: QuireNodeCanvasTextStyleResolver | undefined;
  /** Optional per-mark style resolver. */
  readonly resolveMarkQuireStyle?: QuireMarkCanvasStyleResolver | undefined;
  /** Hidden-text presentation policy inherited from the owning view. */
  readonly hiddenTextViewMode?: QuireHiddenTextViewMode | undefined;
  /** Internal exact-node-type registry that compiles clone-safe source capabilities. */
  readonly sourceCapabilityRegistry?: QuireInlineSourceCapabilityRegistry | undefined;
  /** Active section line-grid authority for body paragraphs. */
  readonly lineGrid?: QuireLineGrid | null | undefined;
  /** Independent character allocation inherited through containers, including cells. */
  readonly characterGrid?: QuireCharacterGrid | null | undefined;
  /** Paragraph semantics; the neutral model applies when omitted. */
  readonly paragraphModel?: QuireParagraphModelProfile | undefined;
  /** Document-wide paragraph style authority resolved by the paragraph model. */
  readonly paragraphStyleContext?: QuireParagraphStyleContext | undefined;
  /** Whether the textblock belongs to a Word table cell. */
  readonly insideWordTableCell?: boolean | undefined;
  /** Table-style layer token of the containing cell, when any. */
  readonly wordTableCellStyleLayer?: unknown;
}

/** Pre-resolved textblock source that no longer needs extension callbacks. */
export interface QuireTextblockShapingSource {
  /** Mark- and node-style-resolved inline runs in document order. */
  readonly runs: readonly QuireInlineTextRun[];
  /** Non-text inline children retained for later capability compilation. */
  readonly sourceAnchors: readonly QuireInlineSourceAnchor[];
  /** Claimed View capability products keyed by source anchor id. */
  readonly sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[];
  /** Resolved textblock font and line metrics. */
  readonly metrics: QuireNodeTextMetrics;
  /** Paragraph-mark metrics applied only to the final visual line. */
  readonly finalLineMetricContribution?: QuireTextLineMetricContribution | undefined;
  /** Effective pre-itemization font inherited by a generated numbering marker. */
  readonly numberingMarkerInheritanceFont: string;
  /** Paragraph-mark paint typography inherited by a generated numbering marker. */
  readonly numberingMarkerInheritanceColor?: string | undefined;
  /** Paragraph-mark decoration lines inherited by a generated numbering marker. */
  readonly numberingMarkerInheritanceDecoration?: readonly (
    "underline" | "line-through"
  )[] | undefined;
  /** Resolved paragraph spacing participating in block flow. */
  readonly blockSpacing: { readonly before: number; readonly after: number };
  /** Effective style-plus-direct paragraph formatting shared by layout consumers. */
  readonly paragraphFormatting: QuireParagraphFormatting;
  /** Renderer-neutral paragraph background and physical border metadata. */
  readonly paragraphDecoration?: QuireParagraphDecoration | undefined;
  /** Renderer-neutral paragraph pagination policy. */
  readonly pagination?: QuireBlockPaginationPolicy | undefined;
  /** Resolved paragraph base direction. */
  readonly baseDirection: "auto" | "ltr" | "rtl";
  /** Resolved logical paragraph alignment. */
  readonly alignment: QuireParagraphAlignment;
}

/**
 * Resolves extension-owned text style into clone-safe runs and numeric metrics.
 *
 * This is the authority boundary between live editor extensions and pure text
 * shaping. Both synchronous layout and background jobs consume the same result,
 * so moving shaping off thread cannot introduce a second style-resolution path.
 *
 * @param options - Textblock, document range, base metrics, and style resolvers.
 * @returns Pre-resolved runs, metrics, and base direction.
 */
export function resolveQuireTextblockShapingSource(
  options: ResolveQuireTextblockShapingSourceOptions
): QuireTextblockShapingSource {
  const model = options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel;
  const styleContext = options.paragraphStyleContext
    ?? quireNeutralDocumentProfile.paragraphModel.styleContext(options.node);
  const nodeStyle = model.nodeTextStyle(
    options.resolveNodeQuireTextStyle?.(options.node) ?? null,
    options.node,
    styleContext,
    options.wordTableCellStyleLayer
  );
  const paragraphFormatting = model.resolveParagraph(options.node, styleContext, options.wordTableCellStyleLayer);
  const markerInheritance = resolveQuireNumberingMarkerInheritanceTypography(
    options,
    nodeStyle,
    paragraphFormatting.markTypography
  );
  const naturalMetrics = applyQuireNodeTextMetrics(
    options.font,
    options.lineHeight,
    options.textBaselineOffset,
    nodeStyle
  );
  const inlineSources = collectQuireProseMirrorInlineSources({
    resolveFontSelection: model.fontSelection,
    node: options.node,
    contentStart: options.contentStart,
    contentEnd: options.contentEnd,
    sourceId: options.sourceId,
    font: options.font,
    lineHeight: naturalMetrics.lineHeight,
    textBaselineOffset: naturalMetrics.baselineOffset,
    nodeStyle,
    characterGrid: options.characterGrid,
    hiddenTextViewMode: options.hiddenTextViewMode ?? "normal",
    ...(options.documentFontTheme === undefined
      ? {}
      : {
          documentFontSet: resolveQuireDocumentFontSet(
            options.documentFontTheme,
            resolveQuireDocumentFontRole(options.node.type.name, nodeStyle)
          )
        }),
    ...(options.documentFontTable === undefined
      ? {}
      : { documentFontTable: options.documentFontTable }),
    ...(options.sourceCapabilityRegistry === undefined
      ? {}
      : { sourceCapabilityRegistry: options.sourceCapabilityRegistry }),
    ...(options.resolveMarkQuireStyle === undefined
      ? {}
      : { resolveMarkStyle: mark => options.resolveMarkQuireStyle!(mark, {
          node: options.node, contentStart: options.contentStart, inheritedStyle: nodeStyle
        }) })
  });
  const gridParticipation = resolveQuireLineGridParticipation(
    paragraphFormatting,
    options.lineGrid,
    options.insideWordTableCell
  );
  const paragraphMarkMetricSample = resolveQuireParagraphMarkMetricSample(
    paragraphFormatting.markTypography?.fontFamily
  );
  const naturalGlyphMetrics = options.textMeasurer === undefined
    || (!paragraphFormatting.naturalLineMetrics && gridParticipation === null)
    ? null
    : resolveQuireNaturalRunGlyphMetrics(
      inlineSources.textRuns,
      markerInheritance.font,
      options.textMeasurer,
      paragraphMarkMetricSample
    );
  const hasVisibleRun = inlineSources.textRuns.some(
    (run) => run.hiddenText !== "collapsed"
  );
  const paragraphMarkMetrics = options.textMeasurer === undefined
    || !hasVisibleRun
    || paragraphFormatting.markTypography === null
    ? null
    : resolveQuireNaturalRunGlyphMetrics(
        [],
        markerInheritance.font,
        options.textMeasurer,
        paragraphMarkMetricSample
      );
  const paragraphLineMetrics = model.lineMetrics(
    paragraphFormatting,
    naturalGlyphMetrics === null
      ? naturalMetrics.lineHeight
      : naturalGlyphMetrics.lineHeight,
    naturalGlyphMetrics === null
      ? naturalMetrics.baselineOffset
      : naturalGlyphMetrics.baselineOffset
  );
  const metrics: QuireNodeTextMetrics = gridParticipation === null
    || options.textMeasurer === undefined
    ? {
        font: naturalMetrics.font,
        lineHeight: paragraphLineMetrics.lineHeight,
        baselineOffset: paragraphLineMetrics.baselineOffset,
        lineHeightMode: paragraphLineMetrics.mode,
        ...(naturalGlyphMetrics === null ? {} : {
          lineSpacing: {
            fallbackMetrics: {
              ascent: naturalGlyphMetrics.baselineOffset,
              descent: naturalGlyphMetrics.lineHeight - naturalGlyphMetrics.baselineOffset
            },
            mode: paragraphFormatting.lineSpacing?.mode ?? "multiple",
            value: paragraphFormatting.lineSpacing?.value ?? 1,
            exactBaselineRatio: paragraphFormatting.lineSpacing?.exactBaselineRatio
          }
        })
      }
    : resolveQuireLineGridMetrics({
        naturalMetrics,
        runs: inlineSources.textRuns,
        textMeasurer: options.textMeasurer,
        ...(naturalGlyphMetrics === null
          ? {}
          : { naturalGlyphMetrics }),
        participation: gridParticipation
      });
  const legacyDirection: unknown = options.node.attrs.dir;
  const direction = paragraphFormatting.direction
    ?? (
      legacyDirection === "ltr" || legacyDirection === "rtl"
        ? legacyDirection
        : null
    );
  const pagination = paragraphFormatting.pagination;
  const baseDirection = direction ?? "auto";
  const paragraphDecoration = resolveQuireParagraphDecoration(
    paragraphFormatting,
    baseDirection
  );

  return {
    runs: inlineSources.textRuns,
    sourceAnchors: inlineSources.sourceAnchors,
    sourceCapabilities: inlineSources.sourceCapabilities,
    metrics,
    ...(paragraphMarkMetrics === null
      ? {}
      : {
          finalLineMetricContribution: {
            ascent: paragraphMarkMetrics.baselineOffset,
            descent: paragraphMarkMetrics.lineHeight
              - paragraphMarkMetrics.baselineOffset
          }
        }),
    numberingMarkerInheritanceFont: markerInheritance.font,
    ...(markerInheritance.textColor === undefined
      ? {}
      : { numberingMarkerInheritanceColor: markerInheritance.textColor }),
    ...(markerInheritance.textDecoration === undefined
      ? {}
      : {
          numberingMarkerInheritanceDecoration:
            markerInheritance.textDecoration
        }),
    blockSpacing: model.blockSpacing(paragraphFormatting, metrics.lineHeight),
    paragraphFormatting,
    ...(paragraphDecoration === undefined
      ? {}
      : { paragraphDecoration }),
    ...(pagination === undefined ? {} : { pagination }),
    baseDirection,
    alignment: paragraphFormatting.alignment ?? "start"
  };
}
