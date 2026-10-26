import { textFragmentStylesEqual } from "../../../layout/cache/fragment-style";
import { fragmentRowStart, fragmentRowEnd, fragmentRowsMatch } from "../../../layout/cache/block/rows";
import type { QuireTextBaseDirection } from "@quirekit/renderer";
import type { CanvasTextblockTailShapeCacheEntry } from "../../../layout/cache";
import {
  cloneQuireTextFragmentWithLazyCaretStops,
  type QuireTextFragment
} from "@quirekit/layout/text";
import {
  layoutQuireInlineTextFragmentsFromQuireLayout,
  type QuireInlineTextRun
} from "@quirekit/layout/inline";
import {
  findPreviousQuireWhitespaceBoundary,
  markQuireTextFragmentsSortedByLineTop
} from "@quirekit/layout/text";
import type { ShapeTextblockFragmentsRequest } from "./shaping/types";
import { projectTextblockLineOptions } from "./shaping/line-options";
import {
  findQuireTextblockTailReuseCheckpoint,
  type QuireTextblockTailCheckpoint
} from "../../../layout/cache/block/checkpoints";

const signatureSeparator = "\u0000";
const maxConvergenceLookaheadLines = 192;
const convergenceLookaheadLineBudgets = [2, 32, 96, maxConvergenceLookaheadLines];

/**
 * Shapes suffixes and bounded probe windows with one canonical line policy.
 * @param request - Retained-tail context and measurement capabilities.
 * @param run - Exact source window selected by the caller.
 * @param y - Textblock-local top of the first reshaped line.
 * @param fragmentStartIndex - Stable first fragment identity after the retained prefix.
 * @param traceName - Existing stage name, preserving diagnostic work accounting.
 * @returns Fresh fragments without changing convergence bounds or retained prefixes.
 */
function layoutTextblockTailRun(
  request: QuireTextblockTailReuseRequest,
  run: QuireInlineTextRun,
  y: number,
  fragmentStartIndex: number,
  traceName: string
): readonly QuireTextFragment[] {
  return traceTextblockTailStage(request, traceName, () =>
    layoutQuireInlineTextFragmentsFromQuireLayout({
      id: request.id,
      runs: [run],
      rect: { x: 0, y, width: request.width, height: request.metrics.lineHeight },
      ...projectTextblockLineOptions(request),
      fragmentStartIndex,
      ...(shouldForceTailNativeMetricLayout(request) ? { forceNativeMetricLayout: true } : {})
    })
  );
}

/** Textblock-local text edit metadata derived from a transaction step. */
export interface QuireTextblockTailTextEditHint {
  /** Textblock-local offset where the edit starts in the current document. */
  readonly offset: number;
  /** Number of UTF-16 text positions inserted by the edit. */
  readonly inserted: number;
  /** Number of UTF-16 text positions deleted by the edit. */
  readonly deleted: number;
}

/** Diagnostic outcome emitted by one textblock tail reuse attempt. */
export type QuireTextblockTailReuseOutcome =
  | "suffix-hit"
  | "converged-suffix-hit"
  | "convergence-miss"
  | "miss";

/** Result of a bounded suffix-window reuse attempt. */
interface QuireTextblockTailWindowReuseResult {
  /** Fragments assembled for the current textblock. */
  readonly fragments: readonly QuireTextFragment[];
  /** Cache outcome that should be recorded for the assembled fragments. */
  readonly outcome: QuireTextblockTailReuseOutcome;
  /** Successful convergence probe size that can seed the next local edit. */
  readonly convergenceLookaheadLines?: number | undefined;
}

/** Request for trying to reuse a previous textblock local-shape entry. */
export interface QuireTextblockTailReuseRequest extends Pick<ShapeTextblockFragmentsRequest,
  "id" | "metrics" | "baseDirection" | "contentStart" | "options" | "avoidPunctuationBreaks" | "autoSpacing"> {
  /** Previous retained simple textblock shape. */
  readonly previous: CanvasTextblockTailShapeCacheEntry;
  /** Current single inline run collected from the textblock. */
  readonly run: QuireInlineTextRun;
  /** Style and direction signature for the current single run. */
  readonly runSignature: string;
  /** Optional textblock-local pure text edit derived from transaction steps. */
  readonly dirtyTextEdit?: QuireTextblockTailTextEditHint | undefined;
  /** Optional textblock-local dirty offset derived from transaction mapping. */
  readonly dirtyTextOffset?: number | undefined;
  /** Available content width for inline layout. */
  readonly width: number;
  /** Optional diagnostic callback for cache counters and slow-log analysis. */
  readonly onReuseOutcome?:
    | ((outcome: QuireTextblockTailReuseOutcome) => void)
    | undefined;
  /** Optional callback receiving the successful bounded convergence probe size. */
  readonly onConvergedSuffixLookahead?:
    | ((lookaheadLines: number) => void)
    | undefined;
}

/**
 * Creates a style-and-direction signature for a single inline run.
 *
 * @param run - Inline run whose style fields are included.
 * @param baseDirection - Resolved paragraph base direction.
 * @returns Stable signature for comparing two local-reuse candidates.
 */
export function createQuireTextblockTailRunSignature(
  run: QuireInlineTextRun,
  baseDirection: QuireTextBaseDirection
): string {
  return [
    baseDirection,
    run.font,
    run.color ?? "",
    run.backgroundColor ?? "",
    run.textDecoration?.join("|") ?? "",
    run.underline?.style ?? "", run.underline?.color ?? "",
    run.emphasisMark ?? "",
    run.glyphEffects?.join("|") ?? "",
    run.hiddenText ?? "",
    run.marks.join("|"),
    createQuireTextblockReplacementSignature(run)
  ].join(signatureSeparator);
}

/**
 * Signs an inline object's resolved extent; prepared graphics can change it without a node change.
 * @param run - Shaping run.
 * @returns Extent signature, or an empty string for text runs.
 */
export function createQuireTextblockReplacementSignature(run: QuireInlineTextRun): string {
  const replacement = run.replacement;
  return replacement === undefined
    ? ""
    : `${replacement.inlineSize}x${replacement.blockSize}@${replacement.baselineOffset ?? ""}`;
}

/**
 * Attempts to reuse previous long-textblock fragments before a local edit.
 *
 * @param request - Previous retained shape plus the current single-run layout inputs.
 * @returns Reused-prefix plus re-shaped-suffix fragments, or undefined on fallback.
 */
export function tryReuseQuireTextblockTailFragments(
  request: QuireTextblockTailReuseRequest
): readonly QuireTextFragment[] | undefined {
  if (
    request.previous.runSignature !== request.runSignature ||
    request.previous.text.includes("\n") ||
    request.run.text.includes("\n")
  ) {
    recordTextblockTailReuseOutcome(request, "miss");
    return undefined;
  }

  const textEditOffset =
    request.dirtyTextEdit === undefined
      ? undefined
      : findSingleContiguousEditOffsetFromTextEdit(
          request.previous.text,
          request.run.text,
          request.dirtyTextEdit
        );
  const hintedOffset =
    request.dirtyTextOffset === undefined
      ? undefined
      : findSingleContiguousEditOffsetFromHint(
          request.previous.text,
          request.run.text,
          request.dirtyTextOffset
        );
  const affectedOffset =
    textEditOffset ?? hintedOffset ?? findSingleContiguousEditOffset(
      request.previous.text,
      request.run.text
    );
  if (affectedOffset === undefined) {
    recordTextblockTailReuseOutcome(request, "miss");
    return undefined;
  }

  const restartOffset = findLocalEditRestartOffset(
    request.previous.text,
    request.run.text,
    affectedOffset
  );
  const checkpoint = findQuireTextblockTailReuseCheckpoint(
    request.previous.fragments,
    request.contentStart,
    restartOffset,
    request.previous.lineCheckpoints,
    resolveQuireTextblockTailCheckpointLookback(request.dirtyTextEdit)
  );
  if (checkpoint === undefined) {
    recordTextblockTailReuseOutcome(request, "miss");
    return undefined;
  }

  if (checkpoint.textOffset >= request.run.text.length) {
    recordTextblockTailReuseOutcome(request, "suffix-hit");
    return copyRetainedTextblockFragmentPrefix(
      checkpoint.sourceFragments,
      checkpoint.prefixEndIndex
    );
  }

  const convergedResult =
    request.dirtyTextEdit === undefined
      ? undefined
      : tryReuseQuireTextblockConvergedSuffix({
          request,
          checkpoint,
          textEdit: request.dirtyTextEdit
        });

  if (convergedResult !== undefined) {
    recordTextblockTailReuseOutcome(request, convergedResult.outcome);
    if (convergedResult.convergenceLookaheadLines !== undefined) {
      request.onConvergedSuffixLookahead?.(
        convergedResult.convergenceLookaheadLines
      );
    }
    return convergedResult.fragments;
  }

  const suffixRun = createSuffixRun(
    request.run,
    request.contentStart,
    checkpoint.textOffset
  );
  const suffixFragments = layoutTextblockTailRun(
    request, suffixRun, checkpoint.y,
    checkpoint.prefixEndIndex,
    "layout:collect:textblock-tail:suffix"
  );

  recordTextblockTailReuseOutcome(request, "suffix-hit");
  return mergeRetainedPrefixWithSuffix(
    checkpoint.sourceFragments,
    checkpoint.prefixEndIndex,
    suffixFragments
  );
}

/**
 * Chooses how far before an edit the retained line checkpoint must restart.
 *
 * Deletions can let the previous line pull text from the edited line, so they
 * keep the conservative one-line lookback. Pure insertions only make the edited
 * line and following suffix more constrained, so the affected line is a safe
 * restart point.
 *
 * @param textEdit - Transaction-derived text edit metadata, when available.
 * @returns Number of previous lines to include in the restart window.
 */
function resolveQuireTextblockTailCheckpointLookback(
  textEdit: QuireTextblockTailTextEditHint | undefined
): number {
  return textEdit !== undefined && textEdit.inserted > 0 && textEdit.deleted === 0
    ? 0
    : 1;
}

/**
 * Reuses the retained suffix after local line wrapping converges again.
 *
 * The normal tail path keeps the prefix before the edit and reshapes everything
 * after it. For very long paragraphs edited in the middle, that still reshapes
 * many unchanged lines. This bridge shapes only a bounded window after the
 * checkpoint, looks for a line whose text, range, x geometry, and caret stops
 * match the previous retained line shifted by the text edit delta, then appends
 * the remaining previous lines with updated ids, ranges, and y coordinates.
 *
 * @param input - Tail reuse request, restart checkpoint, and precise text edit.
 * @returns Retained-prefix plus current window plus shifted retained suffix, or undefined.
 */
function tryReuseQuireTextblockConvergedSuffix(input: {
  readonly request: QuireTextblockTailReuseRequest;
  readonly checkpoint: QuireTextblockTailCheckpoint;
  readonly textEdit: QuireTextblockTailTextEditHint;
}): QuireTextblockTailWindowReuseResult | undefined {
  const { request, checkpoint, textEdit } = input;
  const previousFragments = checkpoint.sourceFragments;
  const rangeDelta = textEdit.inserted - textEdit.deleted;
  const previousStableOffset = textEdit.offset + textEdit.deleted;
  const firstCandidateIndex = Math.max(
    checkpoint.prefixEndIndex,
    findFirstRetainedTextblockLineStartingAtOrAfter(
      request.previous,
      request.contentStart,
      previousStableOffset
    )
  );
  if (firstCandidateIndex >= previousFragments.length) {
    return undefined;
  }

  if (rangeDelta === 0) {
    return undefined;
  }

  return tryReuseQuireTextblockConvergedSuffixInStages({
    request,
    checkpoint,
    firstCandidateIndex,
    rangeDelta
  });
}

/**
 * Expands the convergence probe from a short window to the full safety window.
 *
 * The common held-key path usually re-stabilizes within a handful of visual
 * lines. Probing the entire 192-line safety window up front makes every
 * successful middle-of-paragraph insert pay the worst-case cost, so this loop
 * asks for 32, then 96, then the full window only when needed.
 *
 * @param input - Tail request, checkpoint, candidate start, and text delta.
 * @returns Converged suffix reuse, fallback suffix reuse, or undefined.
 */
function tryReuseQuireTextblockConvergedSuffixInStages(input: {
  readonly request: QuireTextblockTailReuseRequest;
  readonly checkpoint: QuireTextblockTailCheckpoint;
  readonly firstCandidateIndex: number;
  readonly rangeDelta: number;
}): QuireTextblockTailWindowReuseResult | undefined {
  const { request, checkpoint, firstCandidateIndex, rangeDelta } = input;
  const previousFragments = checkpoint.sourceFragments;
  let previousMaxCandidateIndex = -1;
  let previousWindowFragments: readonly QuireTextFragment[] | undefined;
  let fallbackWindowFragments: readonly QuireTextFragment[] | undefined;

  for (const lookaheadLines of createQuireTextblockTailConvergenceLookaheadLineBudgets(
    request.previous.convergenceLookaheadLines
  )) {
    const maxCandidateIndex = Math.min(
      previousFragments.length - 1,
      firstCandidateIndex + lookaheadLines
    );
    if (maxCandidateIndex <= previousMaxCandidateIndex) {
      continue;
    }
    previousMaxCandidateIndex = maxCandidateIndex;

    const windowFragments = layoutQuireTextblockConvergenceWindow({
      request,
      checkpoint,
      maxCandidateIndex,
      rangeDelta,
      lookaheadLines,
      ...(previousWindowFragments === undefined
        ? {}
        : { previousWindowFragments })
    });
    if (windowFragments === undefined) {
      return undefined;
    }
    previousWindowFragments = windowFragments;
    fallbackWindowFragments = windowFragments;

    const convergence = findConvergedSuffixLine({
      previousFragments,
      windowFragments,
      firstCandidateIndex,
      maxCandidateIndex,
      rangeDelta
    });

    if (convergence !== undefined) {
      return createConvergedTextblockSuffixResult({
        request,
        checkpoint,
        windowFragments,
        convergence,
        rangeDelta,
        lookaheadLines
      });
    }
  }

  if (fallbackWindowFragments === undefined) {
    return undefined;
  }

  recordTextblockTailReuseOutcome(request, "convergence-miss");
  return reuseQuireTextblockWindowPrefixFallback({
    request,
    checkpoint,
    windowFragments: fallbackWindowFragments
  });
}

/**
 * Lays out one bounded convergence probe window.
 *
 * @param input - Tail request, checkpoint, candidate bound, and text delta.
 * @returns Probe fragments, or undefined when the candidate bound is invalid.
 */
function layoutQuireTextblockConvergenceWindow(input: {
  readonly request: QuireTextblockTailReuseRequest;
  readonly checkpoint: QuireTextblockTailCheckpoint;
  readonly maxCandidateIndex: number;
  readonly rangeDelta: number;
  readonly lookaheadLines: number;
  /** Previously shaped smaller probe window for incremental expansion. */
  readonly previousWindowFragments?: readonly QuireTextFragment[] | undefined;
}): readonly QuireTextFragment[] | undefined {
  const {
    request,
    checkpoint,
    maxCandidateIndex,
    rangeDelta,
    lookaheadLines
  } = input;
  const maxCandidateEndOffset = resolveRetainedTextblockLineEndOffset({
    request,
    maxCandidateIndex
  });

  if (maxCandidateEndOffset === undefined || maxCandidateEndOffset <= checkpoint.textOffset) {
    return undefined;
  }

  const windowEndOffset = Math.min(
    request.run.text.length,
    maxCandidateEndOffset + rangeDelta
  );
  if (windowEndOffset <= checkpoint.textOffset) {
    return undefined;
  }

  const expandedWindow = expandQuireTextblockConvergenceWindow(input, windowEndOffset);
  if (expandedWindow !== undefined) {
    return expandedWindow;
  }

  const windowRun = createWindowRun(
    request.run,
    request.contentStart,
    checkpoint.textOffset,
    windowEndOffset
  );

  return layoutTextblockTailRun(
    request, windowRun, checkpoint.y,
    checkpoint.prefixEndIndex,
    `layout:collect:textblock-tail:convergence-window:${lookaheadLines}`
  );
}

/**
 * Resolves a retained line's local end offset for a convergence probe bound.
 *
 * @param input - Tail request plus the retained line index to inspect.
 * @returns Textblock-local line end offset, or undefined when unavailable.
 */
function resolveRetainedTextblockLineEndOffset(input: {
  /** Tail reuse request carrying retained checkpoint metadata. */
  readonly request: QuireTextblockTailReuseRequest;
  /** Previous retained line index used as the probe bound. */
  readonly maxCandidateIndex: number;
}): number | undefined {
  const { request } = input;
  const end = fragmentRowEnd(request.previous.fragments, input.maxCandidateIndex) - 1;
  const fragment = request.previous.fragments[end];
  return request.previous.lineCheckpoints?.toOffsets[end]
    ?? (fragment === undefined ? undefined : fragment.range.to - request.contentStart);
}

/**
 * Expands a larger convergence probe from a previously shaped smaller window.
 *
 * Greedy line breaking makes every line except the smaller window's final
 * truncated line stable when more text is appended. Reusing those stable lines
 * avoids re-measuring the same prefix for 32/96/192-line probes while still
 * re-laying the only line whose break can change.
 *
 * @param input - Tail request, checkpoint, candidate bound, and previous window.
 * @param windowEndOffset - Current probe end offset in textblock-local coordinates.
 * @returns Expanded probe window, or undefined when a full probe is required.
 */
function expandQuireTextblockConvergenceWindow(
  input: {
    /** Tail reuse request carrying text and layout inputs. */
    readonly request: QuireTextblockTailReuseRequest;
    /** Retained checkpoint that anchors the probe window. */
    readonly checkpoint: QuireTextblockTailCheckpoint;
    /** Probe size used for diagnostics. */
    readonly lookaheadLines: number;
    /** Previously shaped smaller probe window. */
    readonly previousWindowFragments?: readonly QuireTextFragment[] | undefined;
  },
  windowEndOffset: number
): readonly QuireTextFragment[] | undefined {
  const { request, checkpoint, lookaheadLines, previousWindowFragments } = input;
  if (previousWindowFragments === undefined || previousWindowFragments.length <= 1) {
    return undefined;
  }

  const stableWindowEndIndex = fragmentRowStart(previousWindowFragments, previousWindowFragments.length - 1);
  const restartFragment = previousWindowFragments[stableWindowEndIndex];
  if (restartFragment === undefined) {
    return undefined;
  }

  const restartOffset = Math.max(
    checkpoint.textOffset,
    restartFragment.range.from - request.contentStart
  );
  if (
    restartOffset <= checkpoint.textOffset ||
    windowEndOffset <= restartOffset
  ) {
    return undefined;
  }

  const windowRun = createWindowRun(
    request.run,
    request.contentStart,
    restartOffset,
    windowEndOffset
  );
  const suffixFragments = layoutTextblockTailRun(
    request, windowRun, restartFragment.rect.y,
    checkpoint.prefixEndIndex + stableWindowEndIndex,
    `layout:collect:textblock-tail:convergence-window:${lookaheadLines}`
  );

  return mergeTextblockFragmentRanges({
    first: previousWindowFragments,
    firstEndIndex: stableWindowEndIndex,
    second: suffixFragments,
    secondEndIndex: suffixFragments.length,
    third: []
  });
}

/**
 * Assembles the current fragments after a convergence probe matched a suffix.
 *
 * @param input - Tail request, checkpoint, probe fragments, match, and text delta.
 * @returns Reuse result containing shifted retained suffix fragments.
 */
function createConvergedTextblockSuffixResult(input: {
  readonly request: QuireTextblockTailReuseRequest;
  readonly checkpoint: QuireTextblockTailCheckpoint;
  readonly windowFragments: readonly QuireTextFragment[];
  readonly convergence: {
    readonly previousIndex: number;
    readonly windowIndex: number;
    readonly windowFragment: QuireTextFragment;
  };
  readonly rangeDelta: number;
  readonly lookaheadLines: number;
}): QuireTextblockTailWindowReuseResult {
  const {
    request,
    checkpoint,
    windowFragments,
    convergence,
    rangeDelta,
    lookaheadLines
  } = input;
  const previousFragments = checkpoint.sourceFragments;
  const fragments = traceTextblockTailStage(
    request,
    "layout:collect:textblock-tail:merge-converged-suffix",
    () =>
      mergeTextblockConvergedSuffixFragments({
        previousFragments,
        retainedPrefixEndIndex: checkpoint.prefixEndIndex,
        windowFragments,
        windowEndIndex: convergence.windowIndex,
        shiftedSuffixStartIndex: convergence.previousIndex,
        id: request.id,
        rangeDelta,
        dy: convergence.windowFragment.rect.y -
          previousFragments[convergence.previousIndex]!.rect.y
      })
  );

  return {
    fragments,
    outcome: "converged-suffix-hit",
    convergenceLookaheadLines: lookaheadLines
  };
}

/**
 * Orders convergence probe budgets around the last successful local-edit window.
 *
 * @param preferredLookaheadLines - Last successful convergence probe size.
 * @returns Probe budgets that preserve the 192-line safety cap.
 */
export function createQuireTextblockTailConvergenceLookaheadLineBudgets(
  preferredLookaheadLines: number | undefined
): readonly number[] {
  const preferredIndex = convergenceLookaheadLineBudgets.indexOf(
    preferredLookaheadLines ?? convergenceLookaheadLineBudgets[0]!
  );

  if (preferredIndex <= 0) {
    return convergenceLookaheadLineBudgets;
  }

  return [
    convergenceLookaheadLineBudgets[0]!,
    ...convergenceLookaheadLineBudgets.slice(preferredIndex)
  ];
}

/**
 * Reuses complete probe-window lines when convergence was not found.
 *
 * The bounded probe window is itself a correct greedy layout for every emitted
 * line except its final truncated line: future text cannot change earlier break
 * decisions, but it may still fit on the final line. Keeping those complete
 * window lines avoids redoing the probe work before falling back to suffix layout.
 *
 * @param input - Tail request, checkpoint, and already-shaped probe window.
 * @returns Retained prefix plus stable probe lines plus re-shaped suffix, or undefined.
 */
function reuseQuireTextblockWindowPrefixFallback(input: {
  readonly request: QuireTextblockTailReuseRequest;
  readonly checkpoint: QuireTextblockTailCheckpoint;
  readonly windowFragments: readonly QuireTextFragment[];
}): QuireTextblockTailWindowReuseResult | undefined {
  const { request, checkpoint, windowFragments } = input;
  const stableWindowEndIndex = fragmentRowStart(windowFragments, windowFragments.length - 1);
  const restartFragment = windowFragments[stableWindowEndIndex];
  if (restartFragment === undefined || windowFragments.length <= 1) {
    return undefined;
  }

  const restartOffset = Math.max(
    checkpoint.textOffset,
    restartFragment.range.from - request.contentStart
  );
  if (restartOffset <= checkpoint.textOffset) {
    return undefined;
  }

  const suffixRun = createSuffixRun(request.run, request.contentStart, restartOffset);
  const suffixFragments = layoutTextblockTailRun(
    request, suffixRun, restartFragment.rect.y,
    checkpoint.prefixEndIndex + stableWindowEndIndex,
    "layout:collect:textblock-tail:fallback-suffix"
  );

  return {
    fragments: mergeTextblockFragmentRanges({
      first: checkpoint.sourceFragments,
      firstEndIndex: checkpoint.prefixEndIndex,
      second: windowFragments,
      secondEndIndex: stableWindowEndIndex,
      third: suffixFragments
    }),
    outcome: "suffix-hit"
  };
}

/**
 * Emits a diagnostic tail-reuse outcome when a caller requested it.
 *
 * @param request - Tail reuse request that may own a diagnostic callback.
 * @param outcome - Reuse outcome to report.
 * @returns Nothing.
 */
function recordTextblockTailReuseOutcome(
  request: QuireTextblockTailReuseRequest,
  outcome: QuireTextblockTailReuseOutcome
): void {
  request.onReuseOutcome?.(outcome);
}

/**
 * Measures one retained-tail stage when layout tracing is enabled.
 *
 * @param request - Tail reuse request carrying the optional trace sink.
 * @param name - Stable stage name to emit.
 * @param run - Work to measure.
 * @returns The measured work result.
 */
function traceTextblockTailStage<Result>(
  request: QuireTextblockTailReuseRequest,
  name: string,
  run: () => Result
): Result {
  const trace = request.options.trace;
  if (trace === undefined) {
    return run();
  }

  const startedAt = globalThis.performance?.now() ?? Date.now();
  try {
    return run();
  } finally {
    const endedAt = globalThis.performance?.now() ?? Date.now();
    trace({ name, startedAt, endedAt, durationMs: endedAt - startedAt });
  }
}

/**
 * Checks whether tail reuse should keep the retained prefix's native-metric path.
 *
 * A long plain textblock may have been laid out without full-run shaping. When a
 * local edit reshapes only a short suffix, the suffix must not re-enable shaping
 * just because it is short; otherwise cached and uncached layouts disagree.
 *
 * @param request - Tail reuse request carrying retained fragments and measurer.
 * @returns Whether suffix/window layout should force native grapheme metrics.
 */
function shouldForceTailNativeMetricLayout(
  request: QuireTextblockTailReuseRequest
): boolean {
  if (request.options.textMeasurer.shapeRun === undefined) {
    return false;
  }

  return request.previous.usesNativeMetricLayout ??
    areQuireTextblockTailFragmentsNativeMetricOnly(request.previous.fragments);
}

/**
 * Checks whether retained textblock fragments came from native metric layout.
 *
 * @param fragments - Retained fragments to classify.
 * @returns Whether the non-empty fragment set has no shaped glyph metadata.
 */
export function areQuireTextblockTailFragmentsNativeMetricOnly(
  fragments: readonly QuireTextFragment[]
): boolean {
  if (fragments.length === 0) {
    return false;
  }

  for (const fragment of fragments) {
    if (fragment.shapedRun !== undefined) {
      return false;
    }
  }

  return true;
}

/**
 * Finds a retained suffix line that matches the current bounded layout window.
 *
 * @param input - Previous and current fragments plus candidate bounds.
 * @returns Matching line indexes, or undefined when wrapping has not converged.
 */
function findConvergedSuffixLine(input: {
  readonly previousFragments: readonly QuireTextFragment[];
  readonly windowFragments: readonly QuireTextFragment[];
  readonly firstCandidateIndex: number;
  readonly maxCandidateIndex: number;
  readonly rangeDelta: number;
}):
  | {
      readonly previousIndex: number;
      readonly windowIndex: number;
      readonly windowFragment: QuireTextFragment;
    }
  | undefined {
  let windowSearchIndex = 0;

  for (
    let previousIndex = input.firstCandidateIndex;
    previousIndex <= input.maxCandidateIndex;
    previousIndex += 1
  ) {
    const previous = input.previousFragments[previousIndex];
    if (previous === undefined) {
      continue;
    }

    const shiftedRangeFrom = previous.range.from + input.rangeDelta;
    const shiftedRangeTo = previous.range.to + input.rangeDelta;
    while (windowSearchIndex < input.windowFragments.length) {
      const candidate = input.windowFragments[windowSearchIndex];
      if (
        candidate === undefined ||
        !doesTextFragmentRangeSortBeforeEndpoints(
          candidate.range,
          shiftedRangeFrom,
          shiftedRangeTo
        )
      ) {
        break;
      }
      windowSearchIndex += 1;
    }

    const windowFragment = input.windowFragments[windowSearchIndex];
    if (
      windowFragment !== undefined &&
      isTextFragmentRangeEqualToEndpoints(
        windowFragment.range,
        shiftedRangeFrom,
        shiftedRangeTo
      ) &&
      fragmentRowsMatch(input.previousFragments, previousIndex, input.windowFragments, windowSearchIndex,
        (left, right) => textFragmentLineSignatureMatches(left, right, input.rangeDelta))
    ) {
      return { previousIndex, windowIndex: windowSearchIndex, windowFragment };
    }
  }

  return undefined;
}

/**
 * Merges retained prefix, current probe window, and shifted retained suffix.
 *
 * @param input - Retained prefix, current window, suffix shift deltas, and id data.
 * @returns Merged text fragments for the current textblock.
 */
function mergeTextblockConvergedSuffixFragments(input: {
  /** Previous retained fragments before the local edit. */
  readonly previousFragments: readonly QuireTextFragment[];
  /** Exclusive retained prefix end index. */
  readonly retainedPrefixEndIndex: number;
  /** Current bounded probe-window fragments. */
  readonly windowFragments: readonly QuireTextFragment[];
  /** Exclusive current window end index before the converged retained suffix. */
  readonly windowEndIndex: number;
  /** First previous fragment index to shift into the retained suffix. */
  readonly shiftedSuffixStartIndex: number;
  /** Stable id used for output fragment ids. */
  readonly id: string;
  /** Document-position delta between previous and current suffix. */
  readonly rangeDelta: number;
  /** Vertical shift between previous and current converged line. */
  readonly dy: number;
}): readonly QuireTextFragment[] {
  const shiftedSuffixLength =
    input.previousFragments.length - input.shiftedSuffixStartIndex;
  const merged: QuireTextFragment[] = new Array(
    input.retainedPrefixEndIndex + input.windowEndIndex + shiftedSuffixLength
  );
  let cursor = copyFragmentRangeInto(
    input.previousFragments,
    0,
    input.retainedPrefixEndIndex,
    merged,
    0
  );
  cursor = copyFragmentRangeInto(
    input.windowFragments,
    0,
    input.windowEndIndex,
    merged,
    cursor
  );
  writeShiftedRetainedTextblockSuffixFragments({
    fragments: input.previousFragments,
    startIndex: input.shiftedSuffixStartIndex,
    id: input.id,
    rangeDelta: input.rangeDelta,
    dy: input.dy,
    target: merged,
    targetStartIndex: cursor
  });

  return markQuireTextFragmentsSortedByLineTop(merged);
}

/**
 * Writes shifted retained suffix fragments directly into a target array.
 *
 * @param input - Retained suffix source, shift deltas, and target array.
 * @returns Nothing.
 */
function writeShiftedRetainedTextblockSuffixFragments(input: {
  /** Previous retained fragments before the local edit. */
  readonly fragments: readonly QuireTextFragment[];
  /** First previous fragment index to shift. */
  readonly startIndex: number;
  /** Stable id used for output fragment ids. */
  readonly id: string;
  /** Document-position delta between previous and current suffix. */
  readonly rangeDelta: number;
  /** Vertical shift between previous and current converged line. */
  readonly dy: number;
  /** Target array receiving shifted fragments. */
  readonly target: QuireTextFragment[];
  /** First target index to write. */
  readonly targetStartIndex: number;
}): void {
  for (let index = input.startIndex; index < input.fragments.length; index += 1) {
    const fragment = input.fragments[index]!;
    const outputIndex = input.targetStartIndex + index - input.startIndex;
    const shifted = createShiftedRetainedTextblockSuffixFragment({
      fragment,
      outputId: outputIndex === index
        ? fragment.id
        : `${input.id}:text-${outputIndex}`,
      rangeDelta: input.rangeDelta,
      dy: input.dy
    });
    input.target[outputIndex] = shifted;
  }
}

/**
 * Creates a shifted retained suffix fragment without opening lazy source getters.
 *
 * Object spread reads enumerable getters on the retained source fragment. During
 * repeated input, that would materialize the previous frame's lazy caret stops
 * before the new frame knows whether selection or hit-testing needs them. This
 * clone copies only the public text-fragment fields that affect layout and paint.
 *
 * @param input - Source fragment plus id, range, and vertical shifts.
 * @returns Shifted text fragment with eager paint fields and placeholder caret stops.
 */
function createShiftedRetainedTextblockSuffixFragment(input: {
  /** Previous retained suffix fragment. */
  readonly fragment: QuireTextFragment;
  /** Text fragment id for the current output position. */
  readonly outputId: string;
  /** Document-position delta between previous and current suffix. */
  readonly rangeDelta: number;
  /** Vertical shift between previous and current converged line. */
  readonly dy: number;
}): QuireTextFragment {
  const { fragment } = input;
  return cloneQuireTextFragmentWithLazyCaretStops({
    source: fragment,
    id: input.outputId,
    range: shiftDocumentRange(fragment.range, input.rangeDelta),
    rect: input.dy === 0 ? fragment.rect : shiftRectY(fragment.rect, input.dy),
    baseline: fragment.baseline + input.dy,
    caretStopRangeDelta: input.rangeDelta
  });
}

/**
 * Shifts one rectangle vertically.
 *
 * @param rect - Source rectangle.
 * @param dy - Vertical delta to apply.
 * @returns Shifted rectangle.
 */
function shiftRectY(
  rect: QuireTextFragment["rect"],
  dy: number
): QuireTextFragment["rect"] {
  return {
    x: rect.x,
    y: rect.y + dy,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Concatenates fragment prefixes and a suffix without slicing retained arrays.
 *
 * @param input - Fragment sources and exclusive prefix bounds.
 * @returns Combined fragment array.
 */
function mergeTextblockFragmentRanges(input: {
  /** First fragment source. */
  readonly first: readonly QuireTextFragment[];
  /** Exclusive end index for the first source. */
  readonly firstEndIndex: number;
  /** Second fragment source. */
  readonly second: readonly QuireTextFragment[];
  /** Exclusive end index for the second source. */
  readonly secondEndIndex: number;
  /** Complete third fragment run. */
  readonly third: readonly QuireTextFragment[];
}): readonly QuireTextFragment[] {
  const segments = [[input.first, input.firstEndIndex], [input.second, input.secondEndIndex],
    [input.third, input.third.length]] as const;
  const merged: QuireTextFragment[] = new Array(input.firstEndIndex + input.secondEndIndex + input.third.length);
  let cursor = 0;
  for (const [source, end] of segments) cursor = copyFragmentRangeInto(source, 0, end, merged, cursor);
  return markQuireTextFragmentsSortedByLineTop(merged);
}

/**
 * Copies a fragment subrange into a target array.
 *
 * @param source - Source fragments.
 * @param sourceStartIndex - Inclusive source start index.
 * @param sourceEndIndex - Exclusive source end index.
 * @param target - Target array.
 * @param targetStartIndex - First target index to write.
 * @returns Next target index after the copied range.
 */
function copyFragmentRangeInto(
  source: readonly QuireTextFragment[],
  sourceStartIndex: number,
  sourceEndIndex: number,
  target: QuireTextFragment[],
  targetStartIndex: number
): number {
  let targetIndex = targetStartIndex;
  for (let index = sourceStartIndex; index < sourceEndIndex; index += 1) {
    target[targetIndex] = source[index]!;
    targetIndex += 1;
  }

  return targetIndex;
}

/**
 * Copies a retained fragment prefix while preserving known line-order metadata.
 *
 * @param source - Source fragment array that owns the retained prefix.
 * @param endIndex - Exclusive source end index.
 * @returns Copied prefix fragments.
 */
function copyRetainedTextblockFragmentPrefix(
  source: readonly QuireTextFragment[],
  endIndex: number
): readonly QuireTextFragment[] {
  const copied: QuireTextFragment[] = new Array(endIndex);
  copyFragmentRangeInto(source, 0, endIndex, copied, 0);

  return markQuireTextFragmentsSortedByLineTop(copied);
}

/**
 * Resolves a local insert/delete from transaction-derived text edit metadata.
 *
 * This is the hot path for held printable input in a huge paragraph. The
 * transaction step already proves the edit was text-only at this position, so
 * the check only validates lengths and the immediate text boundary before
 * trusting the offset. Complex replace edits still fall back to string diff.
 *
 * @param previousText - Text content from the retained shape.
 * @param currentText - Current single-run text content.
 * @param textEdit - Textblock-local text edit metadata.
 * @returns Dirty offset when it describes a pure insert/delete, or undefined.
 */
function findSingleContiguousEditOffsetFromTextEdit(
  previousText: string,
  currentText: string,
  textEdit: QuireTextblockTailTextEditHint
): number | undefined {
  if (
    !Number.isInteger(textEdit.offset) ||
    !Number.isInteger(textEdit.inserted) ||
    !Number.isInteger(textEdit.deleted) ||
    textEdit.offset < 0 ||
    textEdit.inserted < 0 ||
    textEdit.deleted < 0 ||
    textEdit.inserted - textEdit.deleted !== currentText.length - previousText.length
  ) {
    return undefined;
  }

  if (textEdit.inserted > 0 && textEdit.deleted === 0) {
    const currentSuffixStart = textEdit.offset + textEdit.inserted;
    return textEdit.offset <= previousText.length &&
      currentSuffixStart <= currentText.length &&
      textEditBoundaryMatches(previousText, textEdit.offset, currentText, currentSuffixStart)
      ? textEdit.offset
      : undefined;
  }

  if (textEdit.deleted > 0 && textEdit.inserted === 0) {
    const previousSuffixStart = textEdit.offset + textEdit.deleted;
    return previousSuffixStart <= previousText.length &&
      textEdit.offset <= currentText.length &&
      textEditBoundaryMatches(previousText, previousSuffixStart, currentText, textEdit.offset)
      ? textEdit.offset
      : undefined;
  }

  return undefined;
}

/**
 * Checks the immediate suffix boundary around a transaction-derived edit.
 *
 * @param previousText - Previous retained text.
 * @param previousSuffixStart - Previous suffix start after the edit.
 * @param currentText - Current text.
 * @param currentSuffixStart - Current suffix start after the edit.
 * @returns Whether the adjacent unchanged code unit still lines up.
 */
function textEditBoundaryMatches(
  previousText: string,
  previousSuffixStart: number,
  currentText: string,
  currentSuffixStart: number
): boolean {
  if (
    previousSuffixStart >= previousText.length ||
    currentSuffixStart >= currentText.length
  ) {
    return true;
  }

  return (
    previousText.charCodeAt(previousSuffixStart) ===
    currentText.charCodeAt(currentSuffixStart)
  );
}

/**
 * Finds the first retained line whose local text start is at or after an offset.
 *
 * @param previous - Previous retained simple textblock shape.
 * @param contentStart - Absolute document position at block content start.
 * @param offset - Textblock-local offset.
 * @returns Line index, or previous fragment count when no line starts after the offset.
 */
function findFirstRetainedTextblockLineStartingAtOrAfter(
  previous: CanvasTextblockTailShapeCacheEntry,
  contentStart: number,
  offset: number
): number {
  const lineStartOffsets = previous.lineCheckpoints?.fromOffsets;
  if (lineStartOffsets !== undefined) {
    return findFirstLineStartOffsetAtOrAfter(lineStartOffsets, offset);
  }

  return findFirstFragmentStartingAtOrAfter(
    previous.fragments,
    contentStart,
    offset
  );
}

/**
 * Finds the first retained line start at or after an offset.
 *
 * @param offsets - Retained line-start offsets.
 * @param offset - Textblock-local offset.
 * @returns Line index, or `offsets.length` when no line starts after the offset.
 */
function findFirstLineStartOffsetAtOrAfter(
  offsets: readonly number[],
  offset: number
): number {
  let low = 0;
  let high = offsets.length - 1;
  let result = offsets.length;

  while (low <= high) {
    const index = Math.floor((low + high) / 2);
    const lineStartOffset = offsets[index];
    if (lineStartOffset === undefined) {
      break;
    }

    if (lineStartOffset >= offset) {
      result = index;
      high = index - 1;
    } else {
      low = index + 1;
    }
  }

  return result;
}

/**
 * Finds the first fragment whose local text start is at or after an offset.
 *
 * @param fragments - Retained fragments in line order.
 * @param contentStart - Absolute document position at block content start.
 * @param offset - Textblock-local offset.
 * @returns Fragment index, or `fragments.length` when no fragment starts after the offset.
 */
function findFirstFragmentStartingAtOrAfter(
  fragments: readonly QuireTextFragment[],
  contentStart: number,
  offset: number
): number {
  let low = 0;
  let high = fragments.length - 1;
  let result = fragments.length;

  while (low <= high) {
    const index = Math.floor((low + high) / 2);
    const fragment = fragments[index];
    if (fragment === undefined) {
      break;
    }

    if (fragment.range.from - contentStart >= offset) {
      result = index;
      high = index - 1;
    } else {
      low = index + 1;
    }
  }

  return result;
}

/**
 * Checks whether a text fragment range has the supplied endpoints.
 *
 * @param range - Fragment range to compare.
 * @param from - Expected inclusive start position.
 * @param to - Expected exclusive end position.
 * @returns Whether both ranges have the same endpoints.
 */
function isTextFragmentRangeEqualToEndpoints(
  range: QuireTextFragment["range"],
  from: number,
  to: number
): boolean {
  return range.from === from && range.to === to;
}

/**
 * Checks whether a fragment range sorts before supplied document endpoints.
 *
 * @param left - Candidate fragment range.
 * @param rightFrom - Target inclusive start position.
 * @param rightTo - Target exclusive end position.
 * @returns Whether `left` appears before `right`.
 */
function doesTextFragmentRangeSortBeforeEndpoints(
  left: QuireTextFragment["range"],
  rightFrom: number,
  rightTo: number
): boolean {
  return left.from < rightFrom || (left.from === rightFrom && left.to < rightTo);
}

/**
 * Compares retained and current line fragments after applying a document shift.
 *
 * @param previous - Previous retained fragment.
 * @param current - Current fragment from a bounded layout window.
 * @param rangeDelta - Document-position delta between previous and current suffix.
 * @returns Whether layout has converged at this line.
 */
function textFragmentLineSignatureMatches(
  previous: QuireTextFragment,
  current: QuireTextFragment,
  rangeDelta: number
): boolean {
  return (
    previous.range.from + rangeDelta === current.range.from && previous.range.to + rangeDelta === current.range.to &&
    previous.text === current.text &&
    textFragmentStylesEqual(previous, current, true) &&
    previous.rect.x === current.rect.x &&
    previous.rect.width === current.rect.width &&
    previous.rect.height === current.rect.height &&
    previous.baseline - previous.rect.y === current.baseline - current.rect.y &&
    caretStopsMatchAfterShift(previous, current, rangeDelta)
  );
}


/**
 * Compares caret stops after shifting document positions.
 *
 * @param previous - Previous retained fragment.
 * @param current - Current fragment from a bounded layout window.
 * @param rangeDelta - Document-position delta between previous and current suffix.
 * @returns Whether caret geometry and shifted positions match.
 */
function caretStopsMatchAfterShift(
  previous: QuireTextFragment,
  current: QuireTextFragment,
  rangeDelta: number
): boolean {
  if (previous.caretStops.length !== current.caretStops.length) {
    return false;
  }

  for (let index = 0; index < previous.caretStops.length; index += 1) {
    const previousStop = previous.caretStops[index];
    const currentStop = current.caretStops[index];
    if (
      previousStop === undefined ||
      currentStop === undefined ||
      previousStop.localX !== currentStop.localX ||
      previousStop.position.bias !== currentStop.position.bias ||
      previousStop.position.pos + rangeDelta !== currentStop.position.pos
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Shifts a document range by a constant delta.
 *
 * @param range - Source document range.
 * @param delta - Position delta to apply.
 * @returns Shifted document range.
 */
function shiftDocumentRange(
  range: QuireTextFragment["range"],
  delta: number
): QuireTextFragment["range"] {
  return { from: range.from + delta, to: range.to + delta };
}

/**
 * Verifies a local insert/delete from a known dirty offset.
 *
 * Transaction mapping can provide the first changed text offset in the final
 * document, which avoids scanning an unchanged long-prefix for tail edits. The
 * suffix is still checked so a broad or stale hint falls back to the full diff.
 *
 * @param previousText - Text content from the retained shape.
 * @param currentText - Current single-run text content.
 * @param dirtyTextOffset - Textblock-local offset where the edit starts.
 * @returns Dirty offset when it describes a pure insert/delete, or undefined.
 */
function findSingleContiguousEditOffsetFromHint(
  previousText: string,
  currentText: string,
  dirtyTextOffset: number
): number | undefined {
  if (!Number.isInteger(dirtyTextOffset)) {
    return undefined;
  }

  const offset = Math.max(
    0,
    Math.min(dirtyTextOffset, previousText.length, currentText.length)
  );
  const lengthDelta = currentText.length - previousText.length;

  if (lengthDelta > 0) {
    const currentSuffixStart = offset + lengthDelta;
    return textSlicesEqual(previousText, offset, currentText, currentSuffixStart)
      ? offset
      : undefined;
  }

  if (lengthDelta < 0) {
    const previousSuffixStart = offset - lengthDelta;
    return textSlicesEqual(previousText, previousSuffixStart, currentText, offset)
      ? offset
      : undefined;
  }

  return undefined;
}

/**
 * Compares two string suffixes without allocating substring copies.
 *
 * @param left - First text value.
 * @param leftStart - Start offset in the first text.
 * @param right - Second text value.
 * @param rightStart - Start offset in the second text.
 * @returns Whether the suffixes are equal.
 */
function textSlicesEqual(
  left: string,
  leftStart: number,
  right: string,
  rightStart: number
): boolean {
  const leftLength = left.length - leftStart;
  const rightLength = right.length - rightStart;
  if (
    leftStart < 0 ||
    rightStart < 0 ||
    leftLength < 0 ||
    rightLength < 0 ||
    leftLength !== rightLength
  ) {
    return false;
  }

  for (let offset = 0; offset < leftLength; offset += 1) {
    if (left.charCodeAt(leftStart + offset) !== right.charCodeAt(rightStart + offset)) {
      return false;
    }
  }

  return true;
}

/**
 * Builds the next fragment array by copying the retained prefix once.
 *
 * Avoiding `slice(...)+spread` matters for over-page paragraphs: the retained
 * prefix can contain thousands of visual-line fragments while the suffix is only
 * the edited tail.
 *
 * @param sourceFragments - Previous fragment array that owns the retained prefix.
 * @param prefixEndIndex - Exclusive retained-prefix end index.
 * @param suffixFragments - Newly shaped suffix fragments.
 * @returns Combined retained-prefix and new-suffix fragments.
 */
function mergeRetainedPrefixWithSuffix(
  sourceFragments: readonly QuireTextFragment[],
  prefixEndIndex: number,
  suffixFragments: readonly QuireTextFragment[]
): readonly QuireTextFragment[] {
  const merged: QuireTextFragment[] = new Array(prefixEndIndex + suffixFragments.length);

  for (let index = 0; index < prefixEndIndex; index += 1) {
    merged[index] = sourceFragments[index]!;
  }
  for (let index = 0; index < suffixFragments.length; index += 1) {
    merged[prefixEndIndex + index] = suffixFragments[index]!;
  }

  return merged;
}

/**
 * Finds the first changed offset for one contiguous insert or delete.
 *
 * @param previousText - Text content from the retained shape.
 * @param currentText - Current single-run text content.
 * @returns Offset where the edit begins, or undefined for a fallback edit.
 */
function findSingleContiguousEditOffset(
  previousText: string,
  currentText: string
): number | undefined {
  let prefix = 0;
  const minLength = Math.min(previousText.length, currentText.length);
  while (
    prefix < minLength &&
    previousText.charCodeAt(prefix) === currentText.charCodeAt(prefix)
  ) {
    prefix += 1;
  }

  let previousSuffix = previousText.length;
  let currentSuffix = currentText.length;
  while (
    previousSuffix > prefix &&
    currentSuffix > prefix &&
    previousText.charCodeAt(previousSuffix - 1) === currentText.charCodeAt(currentSuffix - 1)
  ) {
    previousSuffix -= 1;
    currentSuffix -= 1;
  }

  const previousChanged = previousSuffix - prefix;
  const currentChanged = currentSuffix - prefix;
  if (previousChanged === 0 && currentChanged === 0) {
    return undefined;
  }

  if (previousChanged > 0 && currentChanged > 0) {
    return undefined;
  }

  return prefix;
}

/**
 * Finds a conservative restart offset for a local text edit.
 *
 * Word wrapping can reflow from the start of the edited word, not just the first
 * changed code unit. Restarting from the nearest preceding whitespace boundary
 * keeps normal paragraph edits local while falling back toward the whole block
 * for very long unbroken words.
 *
 * @param previousText - Text content from the retained shape.
 * @param currentText - Current single-run text content.
 * @param affectedOffset - First changed offset from the text diff.
 * @returns Offset where suffix layout may safely restart.
 */
function findLocalEditRestartOffset(
  previousText: string,
  currentText: string,
  affectedOffset: number
): number {
  return Math.min(
    findPreviousQuireWhitespaceBoundary(previousText, affectedOffset),
    findPreviousQuireWhitespaceBoundary(currentText, affectedOffset)
  );
}

/**
 * Creates a bounded current run for convergence probing.
 *
 * @param run - Current full inline run.
 * @param contentStart - Absolute document position at block content start.
 * @param textOffset - Text offset where the probe starts.
 * @param endOffset - Text offset where the probe ends.
 * @returns Inline run representing the bounded probe window.
 */
function createWindowRun(
  run: QuireInlineTextRun,
  contentStart: number,
  textOffset: number,
  endOffset: number
): QuireInlineTextRun {
  return {
    ...run,
    text: run.text.slice(textOffset, endOffset),
    range: { from: contentStart + textOffset, to: contentStart + endOffset }
  };
}

/**
 * Creates the current suffix run to shape from a retained checkpoint.
 *
 * @param run - Current full inline run.
 * @param contentStart - Absolute document position at block content start.
 * @param textOffset - Text offset where suffix layout restarts.
 * @returns Inline run representing only the suffix after the checkpoint.
 */
function createSuffixRun(
  run: QuireInlineTextRun,
  contentStart: number,
  textOffset: number
): QuireInlineTextRun {
  return {
    ...run,
    text: run.text.slice(textOffset),
    range: { from: contentStart + textOffset, to: contentStart + run.text.length }
  };
}
