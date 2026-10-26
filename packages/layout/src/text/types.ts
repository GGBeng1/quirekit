import type { QuireTextTabPaint } from "@quirekit/renderer";
import type { QuireDocumentPosition, QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireGlyphRunCoverage, QuireGlyphRunGlyphPlacement } from "@quirekit/renderer";

/** Direction of a shaped text cluster. */
export type QuireTextClusterDirection = "ltr" | "rtl";

/** Hidden-text participation selected by the editor layout view mode. */
export type QuireHiddenTextLayoutMode = "collapsed" | "inspection";

/** One shaped text cluster used by layout, caret geometry, and hit testing. */
export interface QuireShapedTextCluster {
  /** Source offset relative to the shaped run, inclusive. */
  readonly from: number;
  /** Source offset relative to the shaped run, exclusive. */
  readonly to: number;
  /** Horizontal offset within the shaped run in visual order. */
  readonly x: number;
  /** Advance width occupied by the cluster. */
  readonly advance: number;
  /** Whether this cluster belongs to a right-to-left visual run. */
  readonly rtl: boolean;
}

/** One shaped glyph placement preserved for renderer glyph-run commands. */
export type QuireShapedGlyphPlacement = QuireGlyphRunGlyphPlacement;

/** Result returned by a text shaping backend for one run. */
export interface QuireShapedTextRun {
  /** Ordered cluster boxes used by downstream geometry. */
  readonly clusters: readonly QuireShapedTextCluster[];
  /** Total advance width of the shaped run. */
  readonly width: number;
  /** Font ascent reported by the shaping backend, when available. */
  readonly ascent: number;
  /** Font descent reported by the shaping backend, when available. */
  readonly descent: number;
  /** Optional glyph placements for backends that expose shaped glyph data. */
  readonly glyphs?: readonly QuireShapedGlyphPlacement[];
  /** Optional glyph coverage for exact renderer glyph painters. */
  readonly glyphCoverage?: QuireGlyphRunCoverage;
}

/** Metrics returned after measuring text for canvas layout. */
export interface QuireTextMetrics {
  /** Measured inline width in CSS pixels. */
  readonly width: number;
  /** Font ascent (baseline to content top) in CSS pixels, when available. */
  readonly ascent?: number;
  /** Font descent (baseline to content bottom) in CSS pixels, when available. */
  readonly descent?: number;
  /** Browser- or font-reported normal line height in CSS pixels, when available. */
  readonly lineHeight?: number;
}

/** One word-granularity segment of text with its position and word-likeness. */
export interface QuireWordSegment {
  /** Character offset of the segment start within the source text. */
  readonly index: number;
  /** Character length of the segment. */
  readonly length: number;
  /** Whether the segment is a word (vs whitespace or punctuation). */
  readonly isWordLike: boolean;
}

/** Adapter used by layout code to measure text without owning a browser context. */
export interface QuireTextMeasurer {
  /**
   * Measures text for the provided font token.
   *
   * @param text - Text content to measure.
   * @param font - CSS font shorthand used for measurement.
   * @returns Canvas text metrics for the supplied text.
   */
  measureText(text: string, font: string): QuireTextMetrics;
  /**
   * Shapes text into cluster boxes for caret, selection, and hit-test geometry.
   *
   * @param text - Text content to shape.
   * @param font - CSS font shorthand used for shaping.
   * @returns Cluster-based shape result for the supplied text.
   */
  readonly shapeRun?: (
    text: string,
    font: string,
    context?: QuireTextShapeContext
  ) => QuireShapedTextRun;
  /**
   * Monotonically increasing version that changes whenever this measurer's
   * output could change behind a stable measurer object — for example when a
   * font or shaping backend is upgraded after first paint. Shaping caches keyed
   * by this measurer must invalidate when it changes. Omit for a measurer whose
   * output never changes for the same inputs.
   */
  readonly version?: number;
}

/** Per-invocation semantic context supplied to a text shaping backend. */
export interface QuireTextShapeContext {
  /** BCP 47 language selected for the source run. */
  readonly language?: string | undefined;
  /** Resolved visual direction of the itemized segment. */
  readonly direction?: "ltr" | "rtl" | "auto" | undefined;
  /** Whether optional ligatures must be disabled for tracked grapheme geometry. */
  readonly disableOptionalLigatures?: boolean | undefined;
}

/** Measured caret stop inside a single text fragment. */
export interface QuireTextCaretStop {
  /** Document position represented by this caret stop. */
  readonly position: QuireDocumentPosition;
  /** Horizontal offset from the fragment left edge in CSS pixels. */
  readonly localX: number;
}

/** Single measured text run in a canvas layout snapshot. */
export interface QuireTextFragment {
  /** Native ink inset inside the allocated caret box, in CSS pixels. */
  readonly paintOffset?: number | undefined;
  /** Paint-only leader for a single source tab; never changes source ranges. */
  readonly tab?: QuireTextTabPaint | undefined;
  /** Forced page boundary after this source fragment, independent of paragraph policy. */
  readonly breakAfter?: "page" | "column" | undefined;
  /** Layout-only trailing advance delta; retained bounds and caret stops include it. */
  readonly trailingSpacing?: number | undefined;
  /** Stable text fragment identifier within a layout node. */
  readonly id: string;
  /** Text content represented by this fragment. */
  readonly text: string;
  /** Document range represented by this fragment. */
  readonly range: QuireDocumentRange;
  /** Measured bounds for this fragment in canvas coordinate space. */
  readonly rect: QuireRect;
  /** CSS font shorthand used to draw and measure this fragment. */
  readonly font: string;
  /** BCP 47 language used to shape this fragment. */
  readonly language?: string | undefined;
  /** Signed CSS-pixel spacing applied after each paintable grapheme. */
  readonly letterSpacing?: number | undefined;
  /** Horizontal glyph-width ratio; tracking and vertical metrics remain independent. */
  readonly horizontalScale?: number | undefined;
  /** Glyph color resolved from the run marks, when any mark sets one. */
  readonly textColor?: string;
  /** Background fill resolved from the run marks, when any mark sets one. */
  readonly textBackgroundColor?: string;
  /** Text-decoration lines resolved from the run marks (CSS names). */
  readonly textDecoration?: readonly (
    "underline" | "line-through" | "double-line-through" | "overline"
  )[];
  /** Underline pattern and optional independent paint color. */
  readonly underline?: {
    /** Standard underline token validated by the source extension. */
    readonly style: string;
    /** Opaque paint color; absence follows the glyph. */
    readonly color?: string;
  };
  /** Visible East-Asian emphasis mark resolved from the canonical run style. */
  readonly emphasisMark?: "dot" | "comma" | "circle" | "underDot";
  /** Paint-only legacy Word glyph effects resolved for this fragment. */
  readonly glyphEffects?: readonly ("outline" | "shadow" | "emboss" | "imprint")[];
  /** Hidden-text layout participation retained for paint and interaction policy. */
  readonly hiddenText?: QuireHiddenTextLayoutMode | undefined;
  /** Mark names that contributed to this text fragment's style. */
  readonly marks?: readonly string[];
  /** Line box height used for caret geometry. */
  readonly lineHeight: number;
  /** Whether text ink is clipped vertically to the fixed line rectangle. */
  readonly clipToLine?: boolean | undefined;
  /** Text baseline y coordinate in canvas coordinate space. */
  readonly baseline: number;
  /** Distance from this run's baseline to its own visual top edge. */
  readonly runAscent?: number;
  /** Distance from this run's baseline to its own visual bottom edge. */
  readonly runDescent?: number;
  /** Measured caret stops from fragment start to fragment end. */
  readonly caretStops: readonly QuireTextCaretStop[];
  /**
   * Visual direction of this fragment. `"rtl"` means the run reads right-to-left;
   * caret stops are already in visual (left-to-right) order. Omitted for LTR.
   */
  readonly direction?: "ltr" | "rtl";
  /** Optional shaped glyph metadata used by glyph-run display commands. */
  readonly shapedRun?: QuireShapedTextRun;
}

/** Options for cloning a text fragment while preserving lazy caret-stop semantics. */
export interface QuireTextFragmentLazyCloneOptions {
  /** Source text fragment to clone. */
  readonly source: QuireTextFragment;
  /** Stable id for the cloned fragment. */
  readonly id: string;
  /** Document range for the cloned fragment. */
  readonly range: QuireTextFragment["range"];
  /** Canvas rectangle for the cloned fragment. */
  readonly rect: QuireTextFragment["rect"];
  /** Canvas baseline for the cloned fragment. */
  readonly baseline: number;
  /** Document-position delta to apply to caret stops when they are read. */
  readonly caretStopRangeDelta?: number | undefined;
}

/** Options used to build a measured canvas text fragment. */
export interface QuireTextFragmentOptions {
  /** Native ink inset; never shifts the caret or background geometry. */
  readonly paintOffset?: number | undefined;
  /** Paint-only leader for a single source tab; never changes source ranges. */
  readonly tab?: QuireTextTabPaint | undefined;
  /** Layout-only trailing advance delta, separate from authored letter spacing. */
  readonly trailingSpacing?: number | undefined;
  /** Stable text fragment identifier within a layout node. */
  readonly id: string;
  /** Text content represented by the fragment. */
  readonly text: string;
  /** Document range represented by the fragment text. */
  readonly range: QuireDocumentRange;
  /** Initial line box in canvas coordinate space. */
  readonly rect: QuireRect;
  /** CSS font shorthand used to draw and measure text. */
  readonly font: string;
  /** BCP 47 language selected for shaping. */
  readonly language?: string | undefined;
  /** Signed CSS-pixel spacing applied after each paintable grapheme. */
  readonly letterSpacing?: number | undefined;
  /** Horizontal glyph-width ratio; tracking and vertical metrics remain independent. */
  readonly horizontalScale?: number | undefined;
  /** Glyph color resolved from the run marks, when any mark sets one. */
  readonly textColor?: string;
  /** Background fill resolved from the run marks, when any mark sets one. */
  readonly textBackgroundColor?: string;
  /** Text-decoration lines resolved from the run marks (CSS names). */
  readonly textDecoration?: readonly (
    "underline" | "line-through" | "double-line-through" | "overline"
  )[];
  /** Underline pattern and optional independent paint color. */
  readonly underline?: {
    /** Standard underline token validated by the source extension. */
    readonly style: string;
    /** Opaque paint color; absence follows the glyph. */
    readonly color?: string;
  };
  /** Visible East-Asian emphasis mark resolved from the canonical run style. */
  readonly emphasisMark?: "dot" | "comma" | "circle" | "underDot";
  /** Paint-only legacy Word glyph effects resolved for this fragment. */
  readonly glyphEffects?: readonly ("outline" | "shadow" | "emboss" | "imprint")[];
  /** Hidden-text layout participation retained for paint and interaction policy. */
  readonly hiddenText?: QuireHiddenTextLayoutMode | undefined;
  /** Mark names that contributed to this text fragment's style. */
  readonly marks?: readonly string[];
  /** Line box height used for caret geometry. */
  readonly lineHeight: number;
  /** Whether text ink is clipped vertically to the fixed line rectangle. */
  readonly clipToLine?: boolean | undefined;
  /** Text baseline y coordinate in canvas coordinate space. */
  readonly baseline: number;
  /** Distance from this run's baseline to its own visual top edge. */
  readonly runAscent?: number;
  /** Distance from this run's baseline to its own visual bottom edge. */
  readonly runDescent?: number;
  /** Visual direction of the run; `"rtl"` mirrors caret stops to visual order. */
  readonly direction?: "ltr" | "rtl";
  /**
   * Pre-built caret stops from the layout's cluster geometry. When provided they
   * are used as-is (they already encode collapsed whitespace and visual BiDi
   * order); otherwise stops are re-measured from `text`.
   */
  readonly caretStops?: readonly QuireTextCaretStop[];
  /**
   * Pre-built shaped run from the single layout pass. When provided the fragment
   * text is not shaped again; its glyphs paint directly. Omit (with no
   * `caretStops`) to re-shape, or omit alone for the native-text fallback.
   */
  readonly shapedRun?: QuireShapedTextRun;
  /** Adapter used to measure text width. */
  readonly measurer: QuireTextMeasurer;
}

/**
 * Minimal visible text source used to choose vertical-metric glyph samples.
 *
 * Metric sampling consumes only the exact paint font and the visible text, so
 * inline runs satisfy this contract structurally. Keeping the contract
 * structural preserves the one-way `inline -> text` dependency instead of
 * letting the measurement domain import inline layout types back.
 */
export interface QuireMetricSampleSource {
  /** Exact paint font shorthand whose resolved face supplies the metrics. */
  readonly font: string;
  /** Visible text whose scripts select the glyphs that must be measured. */
  readonly text: string;
}

/** Complex-script-only emphasis resolved after Unicode font-slot itemization. */
export interface QuireComplexScriptEmphasis {
  /** Weight override for complex-script glyphs. */
  readonly fontWeight?: "normal" | "bold" | undefined;
  /** Style override for complex-script glyphs. */
  readonly fontStyle?: "normal" | "italic" | undefined;
  /** Absolute complex-script font size applied after slot itemization. */
  readonly fontSize?: string | undefined;
}
