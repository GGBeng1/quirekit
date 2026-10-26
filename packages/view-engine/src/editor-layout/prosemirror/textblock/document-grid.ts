import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireLineGrid, QuireParagraphFormatting } from "../../../document-profile/types";
import type { QuireNodeTextMetrics } from "../font";
import {
  resolveQuireNaturalRunGlyphMetrics,
  type QuireNaturalRunGlyphMetrics
} from "./natural-line-metrics";

/** Active line-grid participation resolved for one body paragraph. */
export interface QuireLineGridParticipation {
  /** Validated section grid supplying the physical line pitch. */
  readonly grid: QuireLineGrid;
  /** Line pitch in CSS pixels. */
  readonly linePitch: number;
  /** Stable fragment and block-input cache variant. */
  readonly cacheVariant: string;
}

/** Inputs used to project one admitted paragraph onto a section line grid. */
export interface ResolveQuireLineGridMetricsOptions {
  /** Natural paragraph strut before document-grid projection. */
  readonly naturalMetrics: QuireNodeTextMetrics;
  /** Mark-resolved inline runs, empty when the paragraph mark owns the line. */
  readonly runs: readonly QuireInlineTextRun[];
  /** Text measurer used to obtain font ascent and descent. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Optional already measured run metrics shared with paragraph spacing. */
  readonly naturalGlyphMetrics?: QuireNaturalRunGlyphMetrics | undefined;
  /** Admitted section-grid participation for this paragraph. */
  readonly participation: QuireLineGridParticipation;
}

/**
 * Resolves whether one paragraph participates in its active section line grid.
 *
 * Inherited `snapToGrid` values participate. Explicit opt-out, exact line
 * spacing, table-cell content, and inactive section grids bypass the grid.
 *
 * @param paragraph - Effective paragraph formatting for the candidate textblock.
 * @param sectionGrid - Active section line-grid authority.
 * @param insideWordTableCell - Whether the paragraph belongs to a table cell.
 * @returns Active participation and cache identity, or `null` when bypassed.
 */
export function resolveQuireLineGridParticipation(
  paragraph: QuireParagraphFormatting,
  sectionGrid: QuireLineGrid | null | undefined,
  insideWordTableCell: boolean | undefined
): QuireLineGridParticipation | null {
  if (sectionGrid === null || sectionGrid === undefined || insideWordTableCell === true) {
    return null;
  }

  if (paragraph.snapToGrid === false || paragraph.lineSpacing?.mode === "exact") return null;

  return {
    grid: sectionGrid,
    linePitch: sectionGrid.linePitch,
    cacheVariant: `line-grid:${sectionGrid.signature}`
  };
}

/**
 * Resolves line metrics as the smallest whole pitch count containing glyphs.
 *
 * The application strut is not used as glyph extent. When a measurer cannot
 * provide ascent/descent, the CSS font size supplies a bounded fallback.
 *
 * @param options - Natural metrics, runs, measurer, and admitted grid.
 * @returns Grid-aligned line metrics shared by shaping and pagination.
 */
export function resolveQuireLineGridMetrics(
  options: ResolveQuireLineGridMetricsOptions
): QuireNodeTextMetrics {
  const glyphMetrics = options.naturalGlyphMetrics
    ?? resolveQuireNaturalRunGlyphMetrics(
      options.runs,
      options.naturalMetrics.font,
      options.textMeasurer
    );
  const pitch = options.participation.linePitch;
  const contentExtent = glyphMetrics.lineHeight;
  const contentBaseline = glyphMetrics.baselineOffset;
  const pitchCount = Math.max(1, Math.ceil(contentExtent / pitch));
  const lineHeight = pitchCount * pitch;
  const baselineOffset = Math.min(
    lineHeight,
    Math.max(0, contentBaseline + (lineHeight - contentExtent) / 2)
  );

  return {
    font: options.naturalMetrics.font,
    lineHeight,
    baselineOffset,
    lineHeightMode: "minimum",
    lineHeightStep: pitch
  };
}

/**
 * Returns a cache variant before collecting or measuring inline runs.
 *
 * @param paragraph - Effective paragraph formatting for the candidate textblock.
 * @param sectionGrid - Active section line-grid authority.
 * @param insideWordTableCell - Whether the textblock belongs to a table cell.
 * @param includeParagraphFormatting - Whether style-derived values need cache identity.
 * @returns Exact grid variant or the default shaping identity.
 */
export function resolveQuireTextblockMeasurementCacheVariant(
  paragraph: QuireParagraphFormatting,
  sectionGrid: QuireLineGrid | null | undefined,
  insideWordTableCell: boolean | undefined,
  includeParagraphFormatting = true
): string {
  const gridVariant = resolveQuireLineGridParticipation(
    paragraph,
    sectionGrid,
    insideWordTableCell
  )?.cacheVariant ?? "default";
  if (!includeParagraphFormatting) return gridVariant;
  return `${gridVariant}|paragraph:${paragraph.signature}`;
}
