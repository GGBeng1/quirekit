import type { QuireTextTabs, QuireTextTabPaint } from "./tabs/types";
import type { QuireTextCharacterGrid } from "./character-grid/types";
import type { QuireSize } from "../../core/geometry";
import type { QuireRect } from "../../core/geometry";
import type { QuireGlyphRunCoverage } from "@quirekit/render-contract";
import type { QuireTextBaseDirection } from "./bidi";
import type { QuireTextBreaker, QuireTextWrapMode } from "./break";

/** Logical paragraph alignment consumed by the renderer text primitive. */
export type QuireTextAlignment =
  | "start"
  | "center"
  | "end"
  | "justify"
  | "distribute";

/** Source reason for ending a visual line, independent of pagination. */
export type QuireTextLineEnding = "wrap" | "soft-break" | "paragraph-end";

/**
 * One styled run of text fed to the multi-run text layout primitive.
 *
 * Runs are given in logical order; their concatenation is the source text the
 * primitive wraps. Each run carries its own font so a single line can mix bold,
 * italic, font-family, or script-fallback styling. The primitive stays
 * editor-agnostic: a run holds no marks, document range, or caret meaning — a
 * consumer attaches that meaning to the run by its index.
 */
export interface QuireTextRun {
  /** Resolved neutral character allocation; omitted for ordinary text. */
  readonly characterGrid?: QuireTextCharacterGrid | undefined;
  /** Text content of the run; `\n` is treated as a hard line break. */
  readonly text: string;
  /** CSS font shorthand used to measure (and later paint) this run. */
  readonly font: string;
  /** Explicit run-level direction interpreted as a UAX #9 embedding. */
  readonly direction?: "rtl" | undefined;
  /**
   * Distance from the baseline to the top of the run's content, from font
   * metrics. When omitted the line falls back to the layout's strut (the global
   * baseline offset); a taller run grows its line box. See descent.
   */
  readonly ascent?: number;
  /**
   * Distance from the baseline to the bottom of the run's content, from font
   * metrics. When omitted the line falls back to the layout's strut.
   */
  readonly descent?: number;
  /** Natural font line height, including font leading, before paragraph spacing. */
  readonly lineHeight?: number | undefined;
  /** Baseline shift in layout pixels; positive values move the run upward. */
  readonly baselineShift?: number;
  /** Signed layout-pixel spacing added after each paintable grapheme. */
  readonly letterSpacing?: number | undefined;
  /** Horizontal glyph-width ratio; tracking and vertical metrics remain independent. */
  readonly horizontalScale?: number | undefined;
  /**
   * Optional atomic inline replacement carried by this run.
   *
   * Replacement runs must contain exactly one grapheme. The grapheme keeps a
   * source anchor and caret topology, while its declared advance reserves line
   * space without painting the placeholder character.
   */
  readonly replacement?: QuireTextInlineReplacement | undefined;
}

/** Atomic non-text item participating in inline line breaking. */
export interface QuireTextInlineReplacement {
  /** Inline advance reserved by the item. */
  readonly inlineSize: number;
}

/**
 * A source anchor identifying a position by run and character offset within
 * that run.
 *
 * This is the key by which a consumer maps geometry back to its own positions:
 * the renderer reports `run`/`offset`, and the consumer that knows what run
 * index means (for example an editor holding each run's document range) resolves
 * the position. The renderer never learns what the anchor means.
 */
export interface QuireTextAnchor {
  /** Index of the run this anchor falls in, into the input runs. */
  readonly run: number;
  /** Character offset within that run's text. */
  readonly offset: number;
}

/**
 * Geometry of one shaped grapheme cluster within a text layout.
 *
 * A cluster is keyed by its source run and the character offset inside that
 * run's text, not by any document position. The renderer stays editor-agnostic:
 * a consumer that knows what those run offsets mean resolves the cluster it needs
 * and reads its geometry here.
 */
export interface QuireTextCluster {
  /** Physical ink displacement inside the allocated character cell. */
  readonly paintOffset?: number | undefined;
  /** Natural advance before grid allocation, for native paint bounds. */
  readonly naturalAdvance?: number | undefined;
  /** Slot-local grid block identity; style boundaries do not create new cells. */
  readonly gridGroup?: number | undefined;
  /** Paint-only leader for an isolated source tab cluster. */
  readonly tab?: QuireTextTabPaint | undefined;
  /** Index of the source run this cluster came from, into the input runs. */
  readonly run: number;
  /** Character offset of this cluster's start within its source run's text. */
  readonly offset: number;
  /** Character length of this cluster; a grapheme may span several code units. */
  readonly length: number;
  /** Leading-edge x of the cluster in its line's local coordinate space. */
  readonly x: number;
  /** Advance width of the cluster. */
  readonly advance: number;
  /** Index of the line this cluster belongs to, into {@link QuireTextLayout.lines}. */
  readonly line: number;
  /**
   * BiDi embedding level (UAX #9), set when a base direction is resolved. Even is
   * left-to-right, odd is right-to-left; the cluster `x` is already its visual
   * position. Omitted for pure left-to-right layouts.
   */
  readonly level?: number;
}

/** One available inline interval on a visual text row. */
export interface QuireTextLineSlot {
  /** Inline origin in the text primitive's local coordinate space. */
  readonly x: number;
  /** Available inline size; must be finite and greater than zero. */
  readonly width: number;
}

/** Exact occupied fragment of one visual row. */
export interface QuireTextLineFragment {
  /** Occupied fragment rectangle in the text primitive's local coordinate space. */
  readonly rect: QuireRect;
  /** Index of this fragment's first cluster in the layout cluster array. */
  readonly clusterStart: number;
  /** Index after this fragment's last cluster in the layout cluster array. */
  readonly clusterEnd: number;
}

/**
 * A single wrapped line within a text layout.
 *
 * Lines are the unit a pagination engine can break between: a consumer splits a
 * block by choosing a line index, never inside a line.
 */
export interface QuireTextLineBox {
  /** Line rectangle in the text primitive's local coordinate space. */
  readonly rect: QuireRect;
  /** Baseline offset from the line rectangle's top edge. */
  readonly baselineOffset: number;
  /** Index of this line's first cluster, into {@link QuireTextLayout.clusters}. */
  readonly clusterStart: number;
  /** Index past this line's last cluster, into {@link QuireTextLayout.clusters}. */
  readonly clusterEnd: number;
  /**
   * Source anchor at the line's logical start. Defined even for empty lines (an
   * empty paragraph or a blank line between hard breaks), so a consumer can place
   * a caret on a line that has no clusters.
   */
  readonly start: QuireTextAnchor;
  /** Source anchor just past the line's last content, excluding the break. */
  readonly end: QuireTextAnchor;
  /**
   * Exact occupied slot fragments when row slots were supplied. An empty array
   * represents a fully blocked row that still remains one pagination break
   * opportunity. Omitted for the fixed-width single-slot specialization.
   */
  readonly fragments?: readonly QuireTextLineFragment[] | undefined;
}

/**
 * Geometry of one shaped cluster within a visual run, run-local.
 *
 * The cluster's source range is `[from, to)` within its visual run's source run;
 * `x` is the leading (left) edge relative to the run origin, so a caret, the
 * painter, and hit-testing all read one cluster geometry. See
 * `docs/changes/canvas-text-geometry-single-source`.
 */
export interface QuireTextVisualCluster {
  /** Source offset within the run where this cluster starts (inclusive). */
  readonly from: number;
  /** Source offset within the run where this cluster ends (exclusive). */
  readonly to: number;
  /** Leading (left) edge x relative to the visual run origin. */
  readonly x: number;
  /** Advance width of the cluster. */
  readonly advance: number;
}

/**
 * Role of a source codepoint within its shaped cluster, for caret placement.
 *
 * `base` codepoints begin a cluster and take a caret stop. `ligatureComponent`
 * codepoints are absorbed into a multi-codepoint ligature glyph (e.g. the alef of
 * Arabic لا), so a caret between them is interpolated across the ligature rather
 * than sitting at an edge. `combiningMark` is reserved for sub-grapheme marks; the
 * grapheme segmentation already keeps them inside their base cluster, so they take
 * no caret stop. See `docs/changes/canvas-text-geometry-single-source`.
 */
export type QuireTextCodepointRole = "base" | "ligatureComponent" | "combiningMark";

/** A source offset whose caret role differs from the default `base`. */
export interface QuireTextCodepoint {
  /** Source offset within the run this role applies to. */
  readonly offset: number;
  /** Caret role of the codepoint at this offset. */
  readonly role: QuireTextCodepointRole;
}

/**
 * One visual run on a wrapped line: a maximal span of clusters that share a
 * source run and a single visual direction, ordered left-to-right.
 *
 * This is the single geometry source the proposal introduces: paint draws
 * `glyphs`, caret stops come from `clusters`, and hit-testing maps an x to a
 * cluster — all from one shaping pass, with no consumer re-shaping. Everything
 * inside a run is relative to the run origin `x` (its left edge in line space),
 * matching how a consumer offsets a text fragment by its own left edge.
 */
export interface QuireShapedVisualRun {
  /** Native text origin inset; caret and selection continue to use the allocated box. */
  readonly paintOffset?: number | undefined;
  /** Paint-only leader for an isolated source tab cluster. */
  readonly tab?: QuireTextTabPaint | undefined;
  /** Layout-only trailing advance delta in CSS pixels, not glyph scaling or authored tracking. */
  readonly trailingSpacing?: number | undefined;
  /** Index of the line this run sits on, into {@link QuireTextLayout.lines}. */
  readonly line: number;
  /** Index of the source run this run came from, into the input runs. */
  readonly run: number;
  /** Visual reading direction of the run. */
  readonly direction: "ltr" | "rtl";
  /** Run origin: leading (left) edge x in the line's local coordinate space. */
  readonly x: number;
  /** Distance from the shared line baseline to this run's own visual top edge. */
  readonly ascent?: number;
  /** Distance from the shared line baseline to this run's own visual bottom edge. */
  readonly descent?: number;
  /** Clusters in visual (left-to-right) order, run-local. */
  readonly clusters: readonly QuireTextVisualCluster[];
  /**
   * Source offsets whose caret role differs from `base`, in source order. A
   * consumer treats any offset absent here as `base`. Used to interpolate carets
   * inside ligatures; empty for plain text.
   */
  readonly codepoints: readonly QuireTextCodepoint[];
  /**
   * Shaped glyph placements in visual order, run-local (translated from the
   * shaped segment origin to this run origin). Empty when no shaper ran for the
   * run, in which case the painter falls back to native text drawing.
   */
  readonly glyphs: readonly QuireTextShapedGlyph[];
  /**
   * Whether this run's glyphs carry enough font identity for exact glyph
   * painting. Omitted when the run was not shaped. `"partial"` lets the painter
   * fall back to native text drawing.
   */
  readonly glyphCoverage?: QuireGlyphRunCoverage;
}

/**
 * Backend-neutral result of laying out styled runs of text: wrapped lines plus
 * per-cluster geometry, with no knowledge of carets, marks, or document
 * positions. This is what lets the renderer own text measurement and geometry
 * while consumers (canvas-view) derive caret stops, selection geometry, and
 * page breaks from it.
 */
export interface QuireTextLayout {
  /** Wrapped line boxes in visual top-to-bottom order. */
  readonly lines: readonly QuireTextLineBox[];
  /** Per-cluster geometry in source order, indexable by line, run, and offset. */
  readonly clusters: readonly QuireTextCluster[];
  /**
   * Visual runs in left-to-right, top-to-bottom order; the single geometry
   * source for paint, caret, and hit-test. Empty lines contribute no run.
   */
  readonly visualRuns: readonly QuireShapedVisualRun[];
  /** Total measured size of the wrapped text. */
  readonly size: QuireSize;
}

/** Inputs to {@link layoutQuireText}. */
/** One shaped cluster's source mapping and advance from a shaping backend. */
export interface QuireTextShapedAdvance {
  /** Source offset within the run text where this cluster starts. */
  readonly offset: number;
  /** Source length in code units covered by this cluster. */
  readonly length: number;
  /** Advance width of this cluster in canvas coordinate space. */
  readonly advance: number;
}

/**
 * One shaped glyph placement, in visual order within the shaped run.
 *
 * Carried so paint, caret, and hit-test can all read one shaping pass (the single
 * geometry source); see `docs/changes/canvas-text-geometry-single-source`.
 */
export interface QuireTextShapedGlyph {
  /** Backend glyph id for the shaped font. */
  readonly glyphId: number;
  /** Source text offset this glyph belongs to. */
  readonly cluster: number;
  /** Visual x relative to the shaped run origin, before {@link xOffset}. */
  readonly x: number;
  /** Visual y relative to the shaped run origin, before {@link yOffset}. */
  readonly y: number;
  /** Horizontal advance of this glyph. */
  readonly xAdvance: number;
  /** Vertical advance of this glyph (0 for horizontal text). */
  readonly yAdvance: number;
  /** Horizontal paint offset applied on top of {@link x} (e.g. mark positioning). */
  readonly xOffset: number;
  /** Vertical paint offset applied on top of {@link y}. */
  readonly yOffset: number;
  /** Loaded font id that shaped this glyph, for per-glyph font fallback. */
  readonly fontId?: string;
  /** CSS family name that shaped this glyph, for per-glyph font fallback. */
  readonly fontFamily?: string;
}

/** Result of shaping one run: per-cluster advances plus visual glyph placements. */
export interface QuireTextShapedRun {
  /** Per-cluster advances keyed to source offsets (layout/caret geometry). */
  readonly clusters: readonly QuireTextShapedAdvance[];
  /** Font ascent reported by the shaping backend, when available. */
  readonly ascent?: number | undefined;
  /** Font descent reported by the shaping backend, when available. */
  readonly descent?: number | undefined;
  /** Shaped glyph placements in visual order (painting). */
  readonly glyphs: readonly QuireTextShapedGlyph[];
  /**
   * Whether the shaped glyphs carry enough font identity for exact glyph
   * painting. `"partial"` lets the painter fall back to native text drawing.
   */
  readonly glyphCoverage?: QuireGlyphRunCoverage;
}

/**
 * Shapes a run of text into per-cluster advances and visual glyph placements.
 *
 * For cursive/complex scripts (e.g. Arabic) the advance of a letter depends on its
 * neighbours (joining), which cumulative per-grapheme width measurement cannot
 * capture. The clusters feed layout/caret geometry; the glyphs feed painting. The
 * shaper is invoked per same-direction segment (itemized upstream), so visual
 * ordering stays with the BiDi reorder.
 *
 * @param text - Run text to shape.
 * @param font - CSS font shorthand.
 * @returns The shaped run (clusters + glyphs).
 */
export interface QuireTextShapingContext {
  /** Source run index in the renderer layout request. */
  readonly runIndex: number;
  /** Inclusive UTF-16 offset inside the source run. */
  readonly from: number;
  /** Exclusive UTF-16 offset inside the source run. */
  readonly to: number;
  /** Visual direction resolved for this same-level segment. */
  readonly direction: "ltr" | "rtl";
}

export type QuireTextShaper = (
  text: string,
  font: string,
  context: QuireTextShapingContext
) => QuireTextShapedRun;

/** One measured internal phase from the renderer text layout primitive. */
export interface QuireTextLayoutTraceEvent {
  /** Stable phase name for timeline aggregation. */
  readonly name: string;
  /** Timestamp immediately before the phase started, in milliseconds. */
  readonly startedAt: number;
  /** Timestamp immediately after the phase ended, in milliseconds. */
  readonly endedAt: number;
  /** Phase duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * Sink receiving renderer text-layout timings.
 *
 * @param phase - Measured text-layout phase.
 * @returns Nothing.
 */
export type QuireTextLayoutTraceSink = (
  phase: QuireTextLayoutTraceEvent
) => void;

/** Editor-neutral vertical metrics contributed to one resolved visual line. */
export interface QuireTextLineMetricContribution {
  /** Minimum distance from the shared baseline to the line top. */
  readonly ascent?: number | undefined;
  /** Minimum distance from the shared baseline to the line bottom. */
  readonly descent?: number | undefined;
}

/** Per-line spacing policy applied after collecting actual text and object metrics. */
export interface QuireTextLineSpacing {
  /** Multiplier, physical minimum, or fixed physical line advance. */
  readonly mode: "multiple" | "at-least" | "exact";
  /** Positive multiplier or physical height in layout pixels, according to mode. */
  readonly value: number;
  /** Unscaled natural fallback when the nominal layout height already includes spacing. */
  readonly fallbackMetrics?: QuireTextLineMetricContribution | undefined;
  /** Fixed baseline as a fraction of an exact line box; absent keeps metric-based alignment. */
  readonly exactBaselineRatio?: number | undefined;
}

/** Source and geometry inputs to the editor-neutral text layout primitive. */
export interface QuireTextLayoutOptions {
  /** Optional Han/Latin and numeric boundary gaps; absent means no automatic spacing. */
  readonly autoSpacing?: QuireTextAutoSpacing | undefined;
  /** Explicit paragraph stops projected into CSS pixels. */
  readonly tabs?: QuireTextTabs | undefined;
  /**
   * Styled runs in logical order; their concatenation is the source text. Pass at
   * least one run; an empty paragraph is one run with empty text, so its line
   * still anchors to that run.
   */
  readonly runs: readonly QuireTextRun[];
  /** Wrap width in canvas coordinate space; use `Infinity` to disable wrapping. */
  readonly maxWidth: number;
  /**
   * Optional available inline slots for leading visual rows. Slots are physical
   * rectangles and are consumed from left to right for LTR paragraphs and right
   * to left for RTL paragraphs. An empty row is fully blocked. Rows after this
   * array use the fixed-width `{ x: 0, width: maxWidth }` specialization.
   */
  readonly lineSlots?: readonly (readonly QuireTextLineSlot[])[] | undefined;
  /** Visual height of each line. */
  readonly lineHeight: number;
  /** Optional per-line policy; lineHeight/baselineOffset then supply only empty fallback metrics. */
  readonly lineSpacing?: QuireTextLineSpacing | undefined;
  /** Whether content metrics may grow a line beyond the requested height. */
  readonly lineHeightMode?: "minimum" | "exact" | undefined;
  /**
   * Optional block-axis quantum for a grown minimum line box.
   *
   * The final ascent/descent aggregate is rounded up to this step while the
   * baseline stays fixed. Exact line height ignores this field.
   */
  readonly lineHeightStep?: number | undefined;
  /** Baseline offset from each line's top edge. */
  readonly baselineOffset: number;
  /**
   * Optional external vertical metrics keyed by visual line index.
   *
   * These metrics participate in the same max-ascent/max-descent resolution as
   * text runs while remaining source-neutral. Consumers use them for inline
   * participants that affect a line box without becoming editable text runs.
   */
  readonly lineMetricContributions?: readonly (
    QuireTextLineMetricContribution | undefined
  )[] | undefined;
  /** Optional paragraph-end metrics applied only to the final visual line. */
  readonly finalLineMetricContribution?: QuireTextLineMetricContribution | undefined;
  /** Wrap strategy; `word` by default, `anywhere` between graphemes, or `none` for explicit breaks only. */
  readonly wrapMode?: QuireTextWrapMode | undefined;
  /** Protect basic Chinese punctuation boundaries in word mode; defaults to true. */
  readonly avoidPunctuationBreaks?: boolean | undefined;
  /**
   * Base paragraph direction for BiDi resolution (UAX #9). When set, clusters get
   * an embedding level and a visual `x`; omit (or `"ltr"` with no RTL content) to
   * keep the pure left-to-right layout.
   */
  readonly baseDirection?: QuireTextBaseDirection | undefined;
  /**
   * Logical paragraph alignment. Start and end follow the resolved paragraph
   * direction. Justify expands safe word/CJK boundaries on non-final lines;
   * distribute expands safe character boundaries on all lines, centering a lone character.
   */
  readonly alignment?: QuireTextAlignment | undefined;
  /** Whether justified soft-break lines expand; defaults to true. Does not affect distribute. */
  readonly justifySoftBreaks?: boolean | undefined;
  /** Optional line breaker policy; defaults to the baseline word-aware policy. */
  readonly breaker?: QuireTextBreaker | undefined;
  /**
   * Measures the width and height of a string in the given font.
   *
   * @param text - Text to measure.
   * @param font - CSS font shorthand.
   * @returns Measured size in canvas coordinate space.
   */
  readonly measureText: (text: string, font: string) => QuireSize;
  /**
   * Advance measurement strategy for unshaped runs.
   *
   * `"prefix"` preserves within-line kerning by measuring cumulative prefixes.
   * `"grapheme"` measures each grapheme independently and is reserved for very
   * long native-text layout where whole-run shaping is intentionally skipped.
   */
  readonly nativeAdvanceMode?: "prefix" | "grapheme" | undefined;
  /**
   * Optional shaper for cursive, complex, or exact glyph-run layout. By default,
   * every non-empty run is shaped when this is provided so renderer callers keep
   * the exact single geometry source. Higher layers may pair this with
   * `shouldShapeRun` to keep ordinary native-text runs cheap.
   */
  readonly shapeText?: QuireTextShaper | undefined;
  /**
   * Optional predicate that decides which runs should invoke `shapeText`.
   *
   * @param run - Source run being considered for shaping.
   * @param index - Run index in `runs`.
   * @returns Whether this run should use shaped advances and glyph metadata.
   */
  readonly shouldShapeRun?:
    | ((run: QuireTextRun, index: number) => boolean)
    | undefined;
  /** Optional sink receiving text-layout subphase timings for diagnostics. */
  readonly trace?: QuireTextLayoutTraceSink | undefined;
}
import type { QuireTextAutoSpacing } from "./auto-spacing/types";
