import type {
  QuireTextAutoSpacing,
  QuireDocumentRange,
  QuireRect,
  QuireTextAlignment,
  QuireTextTabs,
  QuireTextBaseDirection,
  QuireTextLineMetricContribution,
  QuireTextLineSpacing,
  QuireTextLineSlot
} from "@quirekit/renderer";
import type { QuireHiddenTextLayoutMode, QuireTextMeasurer } from "../text";
import type { QuireLineBreakerPolicy } from "./line-breaker";

/** Line-breaking strategy used by consumer-neutral inline layout. */
export type QuireLineBreakMode = "word" | "anywhere" | "none";

/** One measured layout stage timing surfaced to diagnostics adapters. */
export interface QuireLayoutMeasuredPhase {
  /** Stable stage name. */
  readonly name: string;
  /** Monotonic start timestamp in milliseconds. */
  readonly startedAt: number;
  /** Monotonic end timestamp in milliseconds. */
  readonly endedAt: number;
  /** Stage duration in milliseconds. */
  readonly durationMs: number;
}

/** Sink receiving consumer-neutral layout stage timings. */
export type QuireLayoutTraceSink = (phase: QuireLayoutMeasuredPhase) => void;

/** Inline text run consumed by the renderer-neutral inline layout engine. */
export interface QuireInlineTextRun {
  /** Neutral character allocation resolved before inline shaping. */
  readonly characterGrid?: import("@quirekit/renderer").QuireTextCharacterGrid | undefined;
  /** Forced page boundary owned by this single newline source run. */
  readonly breakAfter?: "page" | "column" | undefined;
  /** Text content owned by the run. */
  readonly text: string;
  /** Document range represented by the run. */
  readonly range: QuireDocumentRange;
  /** CSS font shorthand resolved from the run marks. */
  readonly font: string;
  /** BCP 47 language selected for this itemized run. */
  readonly language?: string | undefined;
  /** Explicit Word-compatible direction for this source-contiguous run. */
  readonly direction?: "rtl" | undefined;
  /** Glyph color resolved from the run marks, when any mark sets one. */
  readonly color?: string;
  /** Background fill resolved from the run marks, when any mark sets one. */
  readonly backgroundColor?: string;
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
  /** Visible East-Asian emphasis mark painted once per non-whitespace grapheme. */
  readonly emphasisMark?: "dot" | "comma" | "circle" | "underDot";
  /** Paint-only legacy Word glyph effects in canonical pass order. */
  readonly glyphEffects?: readonly ("outline" | "shadow" | "emboss" | "imprint")[];
  /** Hidden-text layout participation selected by the owning editor view. */
  readonly hiddenText?: QuireHiddenTextLayoutMode | undefined;
  /** Baseline shift in CSS pixels; positive values move the run upward. */
  readonly baselineShift?: number | undefined;
  /** Signed CSS-pixel spacing added after each paintable grapheme. */
  readonly letterSpacing?: number | undefined;
  /** Horizontal glyph-width ratio; tracking and vertical metrics remain independent. */
  readonly horizontalScale?: number | undefined;
  /** Mark names applied to the run. */
  readonly marks: readonly string[];
  /** Optional non-text item occupying this run's single source position. */
  readonly replacement?: QuireInlineReplacement | undefined;
}

/** Atomic object participating in inline line breaking and line height. */
export interface QuireInlineReplacement {
  /** Stable logical source anchor represented by the item. */
  readonly sourceAnchorId: string;
  /** Inline advance reserved by the item. */
  readonly inlineSize: number;
  /** Block extent that can grow the owning line above its baseline. */
  readonly blockSize: number;
  /** Optional distance from the replacement top edge to the shared line baseline. */
  readonly baselineOffset?: number | undefined;
}

/** Options for laying out inline text runs into visual text fragments. */
export interface QuireInlineLayoutOptions {
  /** Explicit paragraph tab stops and logical text-region offset, in CSS pixels. */
  readonly tabs?: QuireTextTabs | undefined;
  /** Stable id prefix used for produced text fragments. */
  readonly id: string;
  /** Source inline runs in document order. */
  readonly runs: readonly QuireInlineTextRun[];
  /** Block rectangle that constrains inline layout. */
  readonly rect: QuireRect;
  /**
   * Optional leading visual-row slots in block-local coordinates. Empty rows
   * remain pagination opportunities; rows after the declaration use rect width.
   */
  readonly lineSlots?: readonly (readonly QuireTextLineSlot[])[] | undefined;
  /** Visual line height for each inline row. */
  readonly lineHeight: number;
  /** Per-line spacing policy with lineHeight supplying only natural fallback metrics. */
  readonly lineSpacing?: QuireTextLineSpacing | undefined;
  /** Whether content metrics may grow a line beyond the requested height. */
  readonly lineHeightMode?: "minimum" | "exact" | undefined;
  /** Optional block-axis quantum applied after a minimum line has grown. */
  readonly lineHeightStep?: number | undefined;
  /** Vertical offset from block top edge to text baseline. */
  readonly textBaselineOffset: number;
  /** Optional external vertical metrics keyed by resolved visual line. */
  readonly lineMetricContributions?: readonly (
    QuireTextLineMetricContribution | undefined
  )[] | undefined;
  /** Optional paragraph-end metrics applied only to the final visual line. */
  readonly finalLineMetricContribution?: QuireTextLineMetricContribution | undefined;
  /** Text measurer used for unit widths and fragment caret stops. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Line-breaking strategy used by the inline layout pass. */
  readonly lineBreakMode: QuireLineBreakMode;
  /** Protect basic Chinese punctuation boundaries in word mode; defaults to true. */
  readonly avoidPunctuationBreaks?: boolean | undefined;
  /** Neutral script-boundary ratios; no automatic spacing when omitted. */
  readonly autoSpacing?: QuireTextAutoSpacing | undefined;
  /**
   * Base paragraph direction for BiDi resolution. Defaults to `"auto"` (detect
   * from the first strong character); pure left-to-right content is unaffected.
   */
  readonly baseDirection?: QuireTextBaseDirection | undefined;
  /** Logical paragraph alignment applied inside each available visual-row slot. */
  readonly alignment?: QuireTextAlignment | undefined;
  /** Whether justified lines ending in an explicit break expand; defaults to true. */
  readonly justifySoftBreaks?: boolean | undefined;
  /** Optional line-breaker policy used to classify grapheme segments. */
  readonly lineBreaker?: QuireLineBreakerPolicy | undefined;
  /** Optional sink receiving inline-layout phase timings for diagnostics. */
  readonly trace?: QuireLayoutTraceSink | undefined;
  /**
   * Forces native grapheme advances even when a shaper is available. Tail-reuse
   * callers use this so a short re-shaped suffix keeps the same metric strategy
   * as the retained long-text prefix.
   */
  readonly forceNativeMetricLayout?: boolean | undefined;
  /**
   * Fragment index to use for the first emitted fragment. Tail-reuse callers use
   * this when re-laying out a suffix after retained prefix fragments.
   */
  readonly fragmentStartIndex?: number | undefined;
}
