import { adjustGraphemeAdvance } from "./wrap/advances";
import { resolveBidiRunEmbeddingLevels, resolveBidiVisualOrder } from "./bidi";
import { resolveShapedRunData, type ShapedRunData } from "./shaping";
import {
  buildBreakUnits,
  segmentRunGraphemes,
  type RunGrapheme
} from "./units";
import {
  buildLineVisualRuns,
  type QuireVisualRunVerticalMetrics
} from "./visual-runs";
import { wrapUnitsIntoLines, type LineRun } from "./wrap";
import { resolveTextSlotAlignment } from "./justification/alignment";
import { markAutomaticSpacing } from "./auto-spacing/boundaries";
import { createLineSpacingResolver } from "./vertical/spacing";
import { measureCharacterGridUnits } from "./character-grid/measure";
import { resolveCharacterGridGeometry } from "./character-grid/geometry";
import type { CharacterGridGeometry } from "./character-grid/types";
import type {
  QuireShapedVisualRun,
  QuireTextCluster,
  QuireTextLayout,
  QuireTextLayoutOptions,
  QuireTextLineFragment,
  QuireTextLineMetricContribution,
  QuireTextLineBox,
  QuireTextRun
} from "./types";

/**
 * Lays out styled runs of text into wrapped lines with per-cluster geometry.
 *
 * Runs are concatenated in order and wrapped across run boundaries, so one line
 * can mix fonts (bold, italic, font-family, or script fallback). Line breaking is
 * delegated to the breaker policy: word groups stay together, ASCII words fall
 * back to grapheme breaks when overlong, NBSP glues text, ordinary and soft
 * hyphens allow a break after them, and `\n` forces a hard break. The result is
 * backend-neutral geometry (line boxes plus cluster x/advance keyed by
 * `(run, offset-in-run)`); it contains no caret, mark, or document-position
 * knowledge.
 *
 * @param options - Styled runs, wrap width, line metrics, breaker, and a measurer.
 * @returns The wrapped text layout.
 */
export function layoutQuireText(options: QuireTextLayoutOptions): QuireTextLayout {
  const traceStage = createTextLayoutTraceStage(options);
  const rawGraphemes = traceStage(
    "layout:collect:inline:layout-text:segment-runs",
    () => segmentRunGraphemes(options.runs)
  );
  const graphemes = traceStage(
    "layout:collect:inline:layout-text:bidi-levels",
    () => options.baseDirection === undefined
      && !options.runs.some((run) => run.direction === "rtl")
      ? rawGraphemes
      : attachBidiLevels(rawGraphemes, options)
  );
  // Resolve shaping once, before wrapping: line breaking and cluster geometry then
  // share the shaper's advances (no per-grapheme measureText), and buildLayout
  // reuses the same data instead of shaping a second time.
  const shapedData = traceStage(
    "layout:collect:inline:layout-text:shape-runs",
    () => resolveShapedRunData(options)
  );
  const units = traceStage(
    "layout:collect:inline:layout-text:build-units",
    () => measureCharacterGridUnits(buildBreakUnits(
      markAutomaticSpacing(graphemes, options.autoSpacing), options.wrapMode ?? "word", options.breaker
    ), options, shapedData)
  );
  const lines = traceStage(
    "layout:collect:inline:layout-text:wrap-units",
    () => wrapUnitsIntoLines(
      units,
      options.maxWidth,
      options.measureText,
      shapedData,
      options.lineSlots,
      options.baseDirection,
      options.tabs,
      options.wrapMode !== "anywhere" && options.avoidPunctuationBreaks !== false,
      options.wrapMode !== "none"
    )
  );
  return traceStage(
    "layout:collect:inline:layout-text:build-layout",
    () => buildLayout(lines, options, shapedData)
  );
}

/**
 * Creates a trace wrapper for renderer text-layout phases.
 *
 * @param options - Text-layout options that may carry a trace sink.
 * @returns Function that measures one text-layout phase.
 */
function createTextLayoutTraceStage(
  options: QuireTextLayoutOptions
): <Result>(name: string, run: () => Result) => Result {
  return <Result>(name: string, run: () => Result): Result => {
    if (options.trace === undefined) {
      return run();
    }

    const startedAt = globalThis.performance?.now() ?? Date.now();
    try {
      return run();
    } finally {
      const endedAt = globalThis.performance?.now() ?? Date.now();
      options.trace?.({ name, startedAt, endedAt, durationMs: endedAt - startedAt });
    }
  };
}

/**
 * Attaches a BiDi embedding level to each grapheme from the paragraph levels.
 *
 * The level is read at the grapheme's absolute index in the concatenated run
 * text, so wrapping and per-line reordering can later place it visually while it
 * keeps its logical `(run, offset)` key.
 *
 * @param graphemes - Run-tagged grapheme stream in logical order.
 * @param options - Layout options carrying the runs and base direction.
 * @returns The grapheme stream with embedding levels attached.
 */
function attachBidiLevels(
  graphemes: readonly RunGrapheme[],
  options: QuireTextLayoutOptions
): readonly RunGrapheme[] {
  const levels = resolveBidiRunEmbeddingLevels(
    options.runs,
    options.baseDirection ?? "ltr"
  );

  if (!levels) {
    return graphemes;
  }

  const runBaseOffsets: number[] = [];
  let cumulativeLength = 0;
  for (const run of options.runs) {
    runBaseOffsets.push(cumulativeLength);
    cumulativeLength += run.text.length;
  }

  return graphemes.map((grapheme) => {
    const level = levels[(runBaseOffsets[grapheme.run] ?? 0) + grapheme.offset];
    return level === undefined ? grapheme : { ...grapheme, level };
  });
}

/**
 * Builds line boxes and cluster geometry from line runs.
 *
 * Cluster x positions come from cumulative prefix measurement within each
 * contiguous same-run segment, with the cumulative offset carried across run
 * boundaries, so they match where the mixed-font text actually paints.
 *
 * @param runs - Visual line runs with source anchors.
 * @param options - Layout options providing the measurer and line metrics.
 * @returns The assembled text layout.
 */
function buildLayout(
  runs: readonly LineRun[],
  options: QuireTextLayoutOptions,
  shapedData: ReadonlyMap<number, ShapedRunData>
): QuireTextLayout {
  const clusters: QuireTextCluster[] = [];
  const visualRuns: QuireShapedVisualRun[] = [];
  const lines: QuireTextLineBox[] = [];
  let maxWidth = 0;
  let cumulativeY = 0;
  // The strut: the layout's own line height/baseline, a minimum every line keeps
  // regardless of content, so normal and empty lines have a stable height.
  const strutAscent = options.baselineOffset;
  const strutDescent = Math.max(options.lineHeight - options.baselineOffset, 0);
  const nativeAdvanceWidthCache = createNativeAdvanceWidthCache();
  const runVerticalMetrics = createRunVerticalMetrics(options.runs, shapedData);
  const resolveLineSpacing = options.lineSpacing === undefined
    ? undefined : createLineSpacingResolver(options, shapedData);
  const defaultVerticalMetrics = {
    ascent: strutAscent,
    descent: strutDescent,
    height: strutAscent + strutDescent
  };

  runs.forEach((run, line) => {
    const clusterStart = clusters.length;
    // Advances are measured in logical order (keeping per-run kerning); x is then
    // assigned in visual order so RTL runs read right-to-left while each cluster
    // keeps its logical (run, offset) key.
    const advances = measureGraphemeAdvances(
      run.graphemes,
      options,
      shapedData,
      nativeAdvanceWidthCache
    );
    const lineMetricContribution = mergeLineMetricContributions(
      options.lineMetricContributions?.[line],
      line === runs.length - 1 ? options.finalLineMetricContribution : undefined
    );
    const resolvedVertical = resolveLineSpacing !== undefined
      ? resolveLineSpacing(run, line, runs.length)
      : options.lineHeightMode === "exact"
      ? defaultVerticalMetrics
      : runVerticalMetrics === undefined && lineMetricContribution === undefined
      ? defaultVerticalMetrics
      : resolveLineVerticalMetrics(
          run.graphemes,
          runVerticalMetrics,
          strutAscent,
          strutDescent,
          lineMetricContribution
        );
    const vertical = resolveLineSpacing !== undefined || options.lineHeightMode === "exact"
      ? resolvedVertical
      : quantizeMinimumLineVerticalMetrics(
          resolvedVertical,
          options.lineHeightStep
        );
    const fragments: QuireTextLineFragment[] = [];
    const lineVisualRuns: QuireShapedVisualRun[] = [];
    const visualRunVerticalMetrics: QuireVisualRunVerticalMetrics | undefined =
      runVerticalMetrics === undefined && lineMetricContribution === undefined
        ? undefined
        : {
            metricsByRun: runVerticalMetrics ?? [],
            fallbackAscent: strutAscent,
            fallbackDescent: strutDescent
          };
    let advanceStart = 0;
    for (const slotRun of run.slotRuns) {
      const advanceEnd = advanceStart + slotRun.graphemes.length;
      const grid = slotRun.graphemes[0]?.naturalAdvance === undefined
        ? undefined : resolveCharacterGridGeometry(slotRun.graphemes);
      const slotAdvances = grid?.advances ?? advances.slice(advanceStart, advanceEnd);
      const { x: fragmentX, width: occupiedWidth, spacing: expanded } =
        resolveTextSlotAlignment(options, run, slotRun, slotAdvances, shapedData);
      const fragmentClusterStart = clusters.length;
      const slotClusters = buildLineClusters(
        slotRun.graphemes,
        slotAdvances,
        line,
        fragmentX,
        grid
      );
      for (const cluster of slotClusters) {
        clusters.push(cluster);
      }
      lineVisualRuns.push(
        ...buildLineVisualRuns(
          slotClusters,
          line,
          shapedData,
          visualRunVerticalMetrics,
          expanded === undefined || expanded.size === 0
            ? undefined
            : new Map([...expanded].map(([index, spacing]) => [slotClusters[index]!, spacing]))
        )
      );
      fragments.push({
        rect: {
          x: fragmentX,
          y: cumulativeY,
          width: occupiedWidth,
          height: vertical.height
        },
        clusterStart: fragmentClusterStart,
        clusterEnd: clusters.length
      });
      advanceStart = advanceEnd;
    }
    lineVisualRuns.sort((left, right) => left.x - right.x);
    visualRuns.push(...lineVisualRuns);
    const lineLeft = fragments.length === 0
      ? 0
      : Math.min(...fragments.map((fragment) => fragment.rect.x));
    const lineRight = fragments.length === 0
      ? 0
      : Math.max(...fragments.map((fragment) => fragment.rect.x + fragment.rect.width));
    lines.push({
      rect: {
        x: lineLeft,
        y: cumulativeY,
        width: lineRight - lineLeft,
        height: vertical.height
      },
      baselineOffset: vertical.ascent,
      clusterStart,
      clusterEnd: clusters.length,
      start: run.start,
      end: run.end,
      ...(options.lineSlots === undefined ? {} : { fragments })
    });
    cumulativeY += vertical.height;
    maxWidth = Math.max(maxWidth, lineRight);
  });

  return {
    lines,
    clusters,
    visualRuns,
    size: { width: maxWidth, height: cumulativeY }
  };
}

/**
 * Builds one line's source-order clusters with visual x positions.
 *
 * Pure native/LTR lines keep identity visual order, so they can avoid allocating
 * an embedding-level array and an identity permutation. Lines containing any
 * odd BiDi level keep the full UAX #9 visual-order path.
 *
 * @param graphemes - Graphemes on one wrapped line.
 * @param advances - Advance width per grapheme.
 * @param line - Visual line index.
 * @param originX - Physical inline origin of the occupied slot.
 * @param grid - Optional shared cell allocation and ink origins.
 * @returns Source-order clusters with line-local visual x coordinates.
 */
function buildLineClusters(
  graphemes: readonly RunGrapheme[],
  advances: readonly number[],
  line: number,
  originX = 0,
  grid?: CharacterGridGeometry
): QuireTextCluster[] {
  const lineClusters: QuireTextCluster[] = new Array(graphemes.length);
  if (usesIdentityVisualOrder(graphemes)) {
    let cumulative = originX;
    for (let index = 0; index < graphemes.length; index += 1) {
      const grapheme = graphemes[index]!;
      lineClusters[index] = createLineCluster(grapheme, advances[index]!, cumulative, line, grid, index);
      cumulative += advances[index]!;
    }
    return lineClusters;
  }

  const visualOrder = resolveBidiVisualOrder(
    graphemes.map((grapheme) => grapheme.level ?? 0)
  );
  let cumulative = originX;
  for (const index of visualOrder) {
    const grapheme = graphemes[index]!;
    lineClusters[index] = createLineCluster(grapheme, advances[index]!, cumulative, line, grid, index);
    cumulative += advances[index]!;
  }
  return lineClusters;
}

/**
 * Checks whether a line's visual order is the same as source order.
 *
 * @param graphemes - Graphemes on one wrapped line.
 * @returns Whether no odd BiDi embedding level is present.
 */
function usesIdentityVisualOrder(graphemes: readonly RunGrapheme[]): boolean {
  for (const grapheme of graphemes) {
    if ((grapheme.level ?? 0) % 2 === 1) {
      return false;
    }
  }

  return true;
}

/**
 * Creates one text cluster at a visual x coordinate.
 *
 * @param grapheme - Source grapheme.
 * @param advance - Grapheme advance width.
 * @param x - Visual x coordinate on the line.
 * @param line - Visual line index.
 * @param grid - Optional slot allocation.
 * @param index - Grapheme index inside that slot.
 * @returns Text cluster for the layout result.
 */
function createLineCluster(
  grapheme: RunGrapheme,
  advance: number,
  x: number,
  line: number,
  grid?: CharacterGridGeometry,
  index = 0
): QuireTextCluster {
  return {
    run: grapheme.run,
    offset: grapheme.offset,
    length: grapheme.text.length,
    x,
    advance,
    line,
    ...(grid === undefined ? {} : { paintOffset: grid.paintOffsets[index]!,
      naturalAdvance: grapheme.naturalAdvance!, gridGroup: grid.groups[index]! }),
    ...(grapheme.tab === undefined ? {} : { tab: grapheme.tab }),
    ...(grapheme.level === undefined ? {} : { level: grapheme.level })
  };
}

/**
 * Measures each grapheme's advance in logical order.
 *
 * Advances come from cumulative prefix measurement within each contiguous
 * same-run segment, so within-run kerning is preserved; the result is parallel to
 * the input graphemes and consumed by visual-order x assignment.
 *
 * @param graphemes - Graphemes on one line, in logical order.
 * @param options - Layout options providing the measurer.
 * @param shapedData - Per-run shaping data providing advances for shaped runs.
 * @returns Advance width per grapheme, parallel to the input.
 */
function measureGraphemeAdvances(
  graphemes: readonly RunGrapheme[],
  options: QuireTextLayoutOptions,
  shapedData: ReadonlyMap<number, ShapedRunData>,
  nativeAdvanceWidthCache: QuireNativeAdvanceWidthCache
): number[] {
  const advances: number[] = [];
  let cumulative = 0;
  let segmentPrefix = "";
  let segmentMeasuredWidth = 0;
  let segmentRun = -1;

  for (const grapheme of graphemes) {
    if (grapheme.naturalAdvance !== undefined) {
      advances.push(grapheme.tabAdvance ?? grapheme.replacementInlineSize ?? grapheme.naturalAdvance);
      continue;
    }
    const fixedAdvance = grapheme.tabAdvance ?? grapheme.replacementInlineSize;
    if (fixedAdvance !== undefined) {
      advances.push(fixedAdvance);
      cumulative += fixedAdvance;
      segmentRun = -1;
      segmentPrefix = "";
      segmentMeasuredWidth = 0;
      continue;
    }
    // Shaped runs (every script when a shaper is present) take their advance from
    // the shaper, keyed by the grapheme's source offset — no per-grapheme
    // measureText. The measureText cumulative-prefix path below is only the
    // no-shaper fallback; its cumulative base cancels out of every measured
    // advance, so skipping it for shaped runs never disturbs other segments.
    const runShaped = shapedData.get(grapheme.run);
    if (runShaped !== undefined && runShaped.shapedAdvances) {
      advances.push(adjustGraphemeAdvance(
        runShaped.advanceByOffset.get(grapheme.offset) ?? 0,
        grapheme
      ));
      continue;
    }
    if (options.nativeAdvanceMode === "grapheme") {
      const width = adjustGraphemeAdvance(readNativeGraphemeAdvanceWidth(
        grapheme,
        options,
        nativeAdvanceWidthCache
      ), grapheme);
      cumulative += width;
      advances.push(width);
      continue;
    }
    if (grapheme.run !== segmentRun) {
      segmentRun = grapheme.run;
      segmentPrefix = "";
      segmentMeasuredWidth = 0;
    }
    const before = segmentMeasuredWidth;
    segmentPrefix += grapheme.text;
    segmentMeasuredWidth = options.measureText(segmentPrefix, grapheme.font).width;
    const advance = adjustGraphemeAdvance(segmentMeasuredWidth - before, grapheme);
    cumulative += advance;
    advances.push(advance);
  }

  return advances;
}

/** Per-layout cache for native grapheme advance widths. */
interface QuireNativeAdvanceWidthCache {
  /** Widths keyed first by font and then by grapheme text. */
  readonly widthByFont: Map<string, Map<string, number>>;
}

/** Vertical metrics resolved for one source run. */
interface QuireRunVerticalMetrics {
  /** Optional run ascent that can grow the line above the strut. */
  readonly ascent?: number;
  /** Optional run descent that can grow the line below the strut. */
  readonly descent?: number;
  /** Unshifted run-local ascent retained for paint and caret geometry. */
  readonly visualAscent?: number;
  /** Unshifted run-local descent retained for paint and caret geometry. */
  readonly visualDescent?: number;
}

/**
 * Creates a per-layout native advance cache.
 *
 * @returns Empty native advance cache for one layout pass.
 */
function createNativeAdvanceWidthCache(): QuireNativeAdvanceWidthCache {
  return {
    widthByFont: new Map()
  };
}

/**
 * Reads a native grapheme advance width, caching repeated text/font pairs.
 *
 * @param grapheme - Run-tagged grapheme to measure.
 * @param options - Layout options providing the measurer.
 * @param cache - Per-layout native advance cache.
 * @returns Native grapheme advance width.
 */
function readNativeGraphemeAdvanceWidth(
  grapheme: RunGrapheme,
  options: QuireTextLayoutOptions,
  cache: QuireNativeAdvanceWidthCache
): number {
  let widthByText = cache.widthByFont.get(grapheme.font);
  if (widthByText === undefined) {
    widthByText = new Map();
    cache.widthByFont.set(grapheme.font, widthByText);
  }

  const cached = widthByText.get(grapheme.text);
  if (cached !== undefined) {
    return cached;
  }

  const width = options.measureText(grapheme.text, grapheme.font).width;
  widthByText.set(grapheme.text, width);
  return width;
}

/**
 * Resolves a line's vertical metrics from its runs' ascent/descent and the strut.
 *
 * The line box grows to the tallest content on it: its ascent is the max run
 * ascent (and the strut), its descent the max run descent, and its height their
 * sum. Runs without metrics contribute nothing beyond the strut, so a line of
 * normal text keeps the strut height while one oversized run grows its line.
 *
 * @param graphemes - Graphemes on the line, tagging each source run.
 * @param runVerticalMetrics - Precomputed metrics keyed by source run index, when any exist.
 * @param strutAscent - Minimum ascent from the layout's baseline offset.
 * @param strutDescent - Minimum descent from the layout's line height.
 * @param contribution - Optional non-run metrics attached to this visual line.
 * @returns The line's resolved ascent, descent, and height.
 */
function resolveLineVerticalMetrics(
  graphemes: readonly { readonly run: number }[],
  runVerticalMetrics: readonly (QuireRunVerticalMetrics | undefined)[] | undefined,
  strutAscent: number,
  strutDescent: number,
  contribution: QuireTextLineMetricContribution | undefined
): { ascent: number; descent: number; height: number } {
  let ascent = Math.max(strutAscent, contribution?.ascent ?? 0);
  let descent = Math.max(strutDescent, contribution?.descent ?? 0);

  for (const grapheme of graphemes) {
    const metrics = runVerticalMetrics?.[grapheme.run];
    const runAscent = metrics?.ascent;
    const runDescent = metrics?.descent;

    if (runAscent !== undefined) {
      ascent = Math.max(ascent, runAscent);
    }
    if (runDescent !== undefined) {
      descent = Math.max(descent, runDescent);
    }
  }

  return { ascent, descent, height: ascent + descent };
}

/**
 * Merges independent source-neutral metrics for one visual line.
 *
 * @param first - Existing line-indexed contribution.
 * @param second - Optional final-line contribution.
 * @returns Component-wise maximum metrics, or undefined when neither exists.
 */
function mergeLineMetricContributions(
  first: QuireTextLineMetricContribution | undefined,
  second: QuireTextLineMetricContribution | undefined
): QuireTextLineMetricContribution | undefined {
  if (first === undefined) return second;
  if (second === undefined) return first;

  return {
    ascent: Math.max(first.ascent ?? 0, second.ascent ?? 0),
    descent: Math.max(first.descent ?? 0, second.descent ?? 0)
  };
}

/**
 * Rounds a grown minimum line box up to an optional block-axis step.
 *
 * The renderer performs this after every run and external contribution has
 * participated, so an oversized inline object cannot leave a document-grid
 * line between pitches. Additional extent is placed below the unchanged
 * baseline, preserving object and glyph placement.
 *
 * @param vertical - Fully resolved line ascent, descent, and height.
 * @param step - Optional positive block-axis quantum.
 * @returns Original metrics or a step-aligned line box with a stable baseline.
 */
function quantizeMinimumLineVerticalMetrics(
  vertical: { ascent: number; descent: number; height: number },
  step: number | undefined
): { ascent: number; descent: number; height: number } {
  if (step === undefined || !Number.isFinite(step) || step <= 0) return vertical;

  const stepCount = Math.max(1, Math.ceil(vertical.height / step - 1e-9));
  const height = stepCount * step;
  if (height <= vertical.height) return vertical;

  return {
    ascent: vertical.ascent,
    descent: vertical.descent + height - vertical.height,
    height
  };
}

/**
 * Precomputes per-run vertical metrics once for one text layout pass.
 *
 * Most long plain-text windows have no run ascent/descent overrides at all. In
 * that case callers can reuse the layout strut for every line without scanning
 * each grapheme again during layout assembly.
 *
 * @param sourceRuns - Styled input runs.
 * @param shapedData - Per-run shaping data that can also carry font metrics.
 * @returns Metrics keyed by run index, or undefined when every line uses the strut.
 */
function createRunVerticalMetrics(
  sourceRuns: readonly QuireTextRun[],
  shapedData: ReadonlyMap<number, ShapedRunData>
): readonly (QuireRunVerticalMetrics | undefined)[] | undefined {
  const metricsByRun: Array<QuireRunVerticalMetrics | undefined> = new Array(
    sourceRuns.length
  );
  let hasMetrics = false;

  for (let index = 0; index < sourceRuns.length; index += 1) {
    const run = sourceRuns[index];
    const shaped = shapedData.get(index);
    const rawAscent = run?.ascent ?? shaped?.ascent;
    const rawDescent = run?.descent ?? shaped?.descent;
    const baselineShift = run?.baselineShift ?? 0;
    const ascent = rawAscent === undefined
      ? undefined
      : Math.max(0, rawAscent + baselineShift);
    const descent = rawDescent === undefined
      ? undefined
      : Math.max(0, rawDescent - baselineShift);

    if (ascent !== undefined || descent !== undefined) {
      metricsByRun[index] = {
        ...(ascent === undefined ? {} : { ascent }),
        ...(descent === undefined ? {} : { descent }),
        ...(rawAscent === undefined ? {} : { visualAscent: rawAscent }),
        ...(rawDescent === undefined ? {} : { visualDescent: rawDescent })
      };
      hasMetrics = true;
    }
  }

  return hasMetrics ? metricsByRun : undefined;
}
