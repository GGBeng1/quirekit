import type { QuireTextTabPaint } from "./tabs/types";
import type { QuireTextCharacterGrid } from "./character-grid/types";
import { segmentGraphemes } from "./segments";
import { resolveQuireTextBreaker } from "./break";
import type {
  QuireTextBreaker,
  QuireTextBreakInfo,
  QuireTextBreakKind,
  QuireTextWrapMode
} from "./break";
import type { QuireTextRun } from "./types";

/** A grapheme cluster tagged with the run it came from and that run's font. */
export interface RunGrapheme {
  /** Resolved character allocation from the source run. */
  readonly characterGrid?: QuireTextCharacterGrid | undefined;
  /** Cached natural advance before any character-grid allocation. */
  readonly naturalAdvance?: number | undefined;
  /** Candidate boundary gap, discarded when this grapheme starts a physical slot. */
  readonly spacingBefore?: number | undefined;
  /** Advance resolved from the tab stop during wrapping. */
  readonly tabAdvance?: number | undefined;
  /** Paint-only leader resolved with that advance. */
  readonly tab?: QuireTextTabPaint | undefined;
  /** Index of the source run this grapheme belongs to. */
  readonly run: number;
  /** Character offset of the grapheme within its source run's text. */
  readonly offset: number;
  /** The grapheme cluster text. */
  readonly text: string;
  /** CSS font shorthand of the source run, used to measure the grapheme. */
  readonly font: string;
  /** Signed spacing added to this grapheme's measured advance. */
  readonly letterSpacing?: number | undefined;
  /** Horizontal glyph-width ratio; tracking and vertical metrics remain independent. */
  readonly horizontalScale?: number | undefined;
  /** Declared advance for an atomic replacement grapheme. */
  readonly replacementInlineSize?: number | undefined;
  /**
   * BiDi embedding level (UAX #9) of the grapheme, set when a base direction is
   * resolved. Even levels are left-to-right, odd levels right-to-left.
   */
  readonly level?: number;
}

/**
 * A line-breaking unit: contiguous graphemes of one run that wrap as a group.
 *
 * Word units stay together unless they overflow the line; hard-break units force
 * a new line; space and grapheme units are independent break opportunities.
 */
export interface BreakUnit {
  /** Graphemes that make up the unit, all from one run. */
  readonly graphemes: readonly RunGrapheme[];
  /** Index of the source run shared by every grapheme in this unit. */
  readonly run: number;
  /** Unit text, cached so wrapping does not rebuild it for every width read. */
  readonly text: string;
  /** CSS font shorthand shared by every grapheme in this unit. */
  readonly font: string;
  /** Unit role used by word-aware wrapping. */
  readonly kind: QuireTextBreakKind;
  /** Whether a line may break immediately after this unit. */
  readonly breakAfter: boolean;
  /** Whether this unit must stay unbroken even when it overflows the line. */
  readonly nonBreakingGlue: boolean;
}

/**
 * Segments each run into grapheme clusters, tagging every grapheme with its run
 * index and font. Graphemes never cross run boundaries, since a run boundary is
 * a style boundary.
 *
 * @param runs - Styled source runs in logical order.
 * @returns A flat grapheme stream preserving run ownership.
 */
export function segmentRunGraphemes(runs: readonly QuireTextRun[]): readonly RunGrapheme[] {
  const out: RunGrapheme[] = [];

  runs.forEach((run, runIndex) => {
    const graphemes = segmentGraphemes(run.text);
    if (run.horizontalScale !== undefined && (!Number.isFinite(run.horizontalScale) || run.horizontalScale <= 0)) {
      throw new RangeError("Horizontal text scale must be positive and finite.");
    }
    if (run.replacement !== undefined && graphemes.length !== 1) {
      throw new RangeError("An inline replacement run must contain exactly one grapheme.");
    }
    for (const grapheme of graphemes) {
      out.push({
        run: runIndex,
        offset: grapheme.offset,
        text: grapheme.text,
        font: run.font,
        ...(run.characterGrid === undefined ? {} : { characterGrid: run.characterGrid }),
        ...(run.horizontalScale === undefined ? {} : { horizontalScale: run.horizontalScale }),
        ...(run.letterSpacing === undefined
          ? {}
          : { letterSpacing: run.letterSpacing }),
        ...(run.replacement === undefined
          ? {}
          : { replacementInlineSize: run.replacement.inlineSize })
      });
    }
  });

  return out;
}

/**
 * Builds line-breaking units from a run-tagged grapheme stream.
 *
 * In `word` mode, ASCII word graphemes (and NBSP glue) group into word units,
 * whitespace groups into space units, and every other grapheme (for example CJK)
 * is its own unit; a unit also ends at any grapheme that allows a break after it
 * (an ordinary or soft hyphen). In `anywhere` mode every grapheme is its own
 * unit, so a line may break between any two graphemes.
 *
 * @param graphemes - Run-tagged grapheme stream.
 * @param wrapMode - Wrap strategy controlling word grouping.
 * @param breakerOption - Optional caller breaker; defaults to the baseline.
 * @returns Line-breaking units in source order.
 */
export function buildBreakUnits(
  graphemes: readonly RunGrapheme[],
  wrapMode: QuireTextWrapMode,
  breakerOption?: QuireTextBreaker | undefined
): readonly BreakUnit[] {
  const breaker = resolveQuireTextBreaker(breakerOption);
  const describe = (grapheme: RunGrapheme): QuireTextBreakInfo =>
    breaker.describe(grapheme.text);

  return wrapMode === "anywhere"
    ? buildAnywhereUnits(graphemes, describe)
    : buildWordAwareUnits(graphemes, describe, breaker);
}

/**
 * Builds one unit per grapheme, allowing a break between any two graphemes.
 *
 * @param graphemes - Run-tagged grapheme stream.
 * @param breaker - Resolved breaker used to detect hard breaks.
 * @returns Grapheme-sized units.
 */
function buildAnywhereUnits(
  graphemes: readonly RunGrapheme[],
  describe: (grapheme: RunGrapheme) => QuireTextBreakInfo
): readonly BreakUnit[] {
  return graphemes.map((grapheme) => {
    const info = describe(grapheme);
    return {
      graphemes: [grapheme],
      run: grapheme.run,
      text: grapheme.text,
      font: grapheme.font,
      kind: info.kind === "hardBreak" ? "hardBreak" : "grapheme",
      breakAfter: false,
      nonBreakingGlue: false
    } satisfies BreakUnit;
  });
}

/**
 * Builds word-aware units, grouping ASCII words and whitespace while keeping CJK
 * and other graphemes independent.
 *
 * @param graphemes - Run-tagged grapheme stream.
 * @param breaker - Resolved breaker used to classify and merge segments.
 * @returns Word, space, grapheme, and hard-break units.
 */
function buildWordAwareUnits(
  graphemes: readonly RunGrapheme[],
  describe: (grapheme: RunGrapheme) => QuireTextBreakInfo,
  breaker: QuireTextBreaker
): readonly BreakUnit[] {
  const units: BreakUnit[] = [];
  let current: RunGrapheme[] = [];
  let currentKind: QuireTextBreakKind | null = null;
  let currentInfos: QuireTextBreakInfo[] = [];
  let currentRun = -1;
  let currentText = "";
  let currentFont = "";

  /** Flushes the active unit into the result list. */
  const flush = (): void => {
    if (current.length === 0 || currentKind === null) {
      return;
    }
    const merged = breaker.merge(currentInfos);
    units.push({
      graphemes: current,
      run: currentRun,
      text: currentText,
      font: currentFont,
      kind: currentKind,
      breakAfter: merged.breakAfter,
      nonBreakingGlue: merged.nonBreakingGlue
    });
    current = [];
    currentKind = null;
    currentInfos = [];
    currentRun = -1;
    currentText = "";
    currentFont = "";
  };

  for (const grapheme of graphemes) {
    const info = describe(grapheme);

    if (info.kind === "hardBreak") {
      flush();
      units.push({
        graphemes: [grapheme],
        run: grapheme.run,
        text: grapheme.text,
        font: grapheme.font,
        kind: "hardBreak",
        breakAfter: true,
        nonBreakingGlue: false
      });
      continue;
    }

    if (currentRun !== grapheme.run || currentKind !== info.kind || info.kind === "grapheme" || grapheme.text === "\t") {
      flush();
    }

    current.push(grapheme);
    currentInfos.push(info);
    currentKind = info.kind;
    currentRun = grapheme.run;
    currentText += grapheme.text;
    currentFont = grapheme.font;

    if (info.kind === "grapheme" || info.breakAfter || grapheme.text === "\t") {
      flush();
    }
  }

  flush();
  return units;
}
