import type { QuireGlyphRunCoverage } from "@quirekit/render-contract";
import type { ShapedRunData } from "./shaping";
import { characterGridNativePaint, collectCharacterGridGlyphs } from "./character-grid/paint";
import type {
  QuireShapedVisualRun,
  QuireTextCluster,
  QuireTextCodepoint,
  QuireTextShapedGlyph,
  QuireTextVisualCluster
} from "./types";

/** Run-level vertical metrics supplied while visual runs are assembled. */
export interface QuireVisualRunVerticalMetrics {
  /** Per-source-run metrics collected from native measurement or shaping. */
  readonly metricsByRun:
    readonly ({
      readonly ascent?: number;
      readonly descent?: number;
      readonly visualAscent?: number;
      readonly visualDescent?: number;
    } | undefined)[];
  /** Ascent used when a source run has no explicit metric. */
  readonly fallbackAscent: number;
  /** Descent used when a source run has no explicit metric. */
  readonly fallbackDescent: number;
}

/**
 * Groups one line's clusters into visual runs.
 *
 * A visual run is a maximal span of clusters that, in visual (ascending x) order,
 * share a source run, a single direction (BiDi level parity), and a paint mode.
 * Partial glyph coverage therefore splits before canvas-view turns the run into
 * a text fragment: covered clusters remain glyph runs, while visible uncovered
 * clusters fall back to native text. Each run is self-contained: its clusters
 * and glyphs are rebased to the run origin so a consumer can offset the whole run
 * by its own left edge.
 *
 * @param lineClusters - The line's clusters, each with its visual (line-local) x.
 * @param line - Index of the line these runs belong to.
 * @param shapedData - Per-run shaping data providing glyphs, when shaped.
 * @param verticalMetrics - Optional source-run metrics and fallback strut.
 * @param independentlyPositioned - Clusters whose derived spacing must not be lost by native drawing.
 * @returns Visual runs in left-to-right order.
 */
export function buildLineVisualRuns(
  lineClusters: readonly QuireTextCluster[],
  line: number,
  shapedData: ReadonlyMap<number, ShapedRunData>,
  verticalMetrics?: QuireVisualRunVerticalMetrics,
  independentlyPositioned?: ReadonlyMap<QuireTextCluster, number>
): QuireShapedVisualRun[] {
  const nativeRun = shapedData.size === 0 && independentlyPositioned === undefined
    ? buildSingleNativeLtrVisualRunIfPossible(lineClusters, line, verticalMetrics)
    : undefined;
  if (nativeRun !== undefined) {
    return [nativeRun];
  }

  const sorted = areClustersInVisualOrder(lineClusters)
    ? lineClusters
    : [...lineClusters].sort((first, second) => first.x - second.x);
  const runs: QuireShapedVisualRun[] = [];

  let index = 0;
  while (index < sorted.length) {
    const runIndex = sorted[index]!.run;
    const rtl = (sorted[index]!.level ?? 0) % 2 === 1;
    let end = index;
    while (
      end < sorted.length
      && sorted[end]!.run === runIndex
      && ((sorted[end]!.level ?? 0) % 2 === 1) === rtl
    ) {
      end += 1;
    }

    const shaped = shapedData.get(runIndex);
    const paintGroups = groupClustersByPaintMode(sorted.slice(index, end), shaped, independentlyPositioned);
    for (const group of paintGroups) {
      const visualRun = buildVisualRun(
        group.clusters,
        line,
        runIndex,
        rtl,
        shaped,
        group.paintMode,
        verticalMetrics
      );
      const tab = group.clusters[0]?.tab;
      if (tab !== undefined) {
        runs.push({ ...visualRun, tab, glyphs: [] });
        continue;
      }
      const trailingSpacing = independentlyPositioned?.get(group.clusters.at(-1)!);
      runs.push(trailingSpacing === undefined || group.clusters[0]?.gridGroup !== undefined
        ? visualRun : { ...visualRun, trailingSpacing });
    }
    index = end;
  }

  return runs;
}

/**
 * Builds one native LTR visual run when a line satisfies the fast-path invariants.
 *
 * Long plain text reaches visual-run assembly as a single source run with
 * monotonically increasing x positions and no odd BiDi levels. The generic path
 * must handle sorting, paint-mode splitting, glyph fallback, and RTL; this
 * helper keeps those semantics for complex lines while letting the common native
 * line validate and build run-local clusters in one pass.
 *
 * @param lineClusters - Clusters for one visual line.
 * @param line - Index of the line these clusters belong to.
 * @param verticalMetrics - Optional source-run metrics and fallback strut.
 * @returns A single native LTR visual run, or undefined when the generic path is required.
 */
function buildSingleNativeLtrVisualRunIfPossible(
  lineClusters: readonly QuireTextCluster[],
  line: number,
  verticalMetrics: QuireVisualRunVerticalMetrics | undefined
): QuireShapedVisualRun | undefined {
  const first = lineClusters[0];
  if (first === undefined) {
    return undefined;
  }

  const run = first.run;
  const origin = first.x;
  let previousX = -Infinity;
  const clusters: QuireTextVisualCluster[] = new Array(lineClusters.length);
  for (let index = 0; index < lineClusters.length; index += 1) {
    const cluster = lineClusters[index]!;
    if (
      cluster.gridGroup !== undefined || cluster.run !== run ||
      cluster.x < previousX ||
      (cluster.level ?? 0) % 2 === 1 || cluster.tab !== undefined
    ) {
      return undefined;
    }
    clusters[index] = {
      from: cluster.offset,
      to: cluster.offset + cluster.length,
      x: cluster.x - origin,
      advance: cluster.advance
    };
    previousX = cluster.x;
  }

  return {
    line,
    run,
    direction: "ltr",
    x: origin,
    ...resolveVisualRunVerticalMetricFields(run, verticalMetrics),
    clusters,
    codepoints: [],
    glyphs: []
  };
}

/**
 * Checks whether clusters already sit in visual x order.
 *
 * Pure LTR/native text, the common long-paragraph path, reaches this function in
 * x order. Avoiding the copy-and-sort per line keeps visual-run assembly cheap
 * while preserving the existing sort fallback for RTL and mixed BiDi lines.
 *
 * @param clusters - Line clusters to inspect.
 * @returns Whether the clusters are monotonically ordered by x coordinate.
 */
function areClustersInVisualOrder(
  clusters: readonly QuireTextCluster[]
): boolean {
  let previous = -Infinity;

  for (const cluster of clusters) {
    if (cluster.x < previous) {
      return false;
    }
    previous = cluster.x;
  }

  return true;
}

/** Paint mode used by one visual-run slice. */
type VisualRunPaintMode = "glyph" | "native";

/** Clusters grouped by the paint route they can safely use. */
interface VisualRunPaintGroup {
  /** Clusters in visual order. */
  readonly clusters: QuireTextCluster[];
  /** Whether the group should paint shaped glyphs or native text. */
  readonly paintMode: VisualRunPaintMode;
}

/**
 * Groups same-run, same-direction clusters by paint mode.
 *
 * @param group - Clusters that already share source run and direction.
 * @param shaped - Shaping data for the source run, when available.
 * @param independentlyPositioned - Clusters requiring their own paint origin.
 * @returns Contiguous paint-mode groups in visual order.
 */
function groupClustersByPaintMode(
  group: readonly QuireTextCluster[],
  shaped: ShapedRunData | undefined,
  independentlyPositioned: ReadonlyMap<QuireTextCluster, number> | undefined
): readonly VisualRunPaintGroup[] {
  const groups: VisualRunPaintGroup[] = [];

  for (const cluster of group) {
    const paintMode = resolveClusterPaintMode(cluster, shaped);
    const previous = groups.at(-1);

    if (previous?.paintMode === paintMode
      && (paintMode === "glyph" || previous.clusters.at(-1)?.gridGroup === cluster.gridGroup)
      && cluster.tab === undefined && previous.clusters.at(-1)?.tab === undefined
      && !independentlyPositioned?.has(cluster)
      && !independentlyPositioned?.has(previous.clusters.at(-1)!)
    ) {
      previous.clusters.push(cluster);
      continue;
    }

    groups.push({ paintMode, clusters: [cluster] });
  }

  return groups;
}

/**
 * Resolves whether a cluster can be painted from shaped glyph placements.
 *
 * @param cluster - Visual cluster to inspect.
 * @param shaped - Shaping data for the cluster's source run, when available.
 * @returns Paint mode for the cluster.
 */
function resolveClusterPaintMode(
  cluster: QuireTextCluster,
  shaped: ShapedRunData | undefined
): VisualRunPaintMode {
  if (shaped === undefined || cluster.tab !== undefined) {
    return "native";
  }

  const ligatureBase = shaped.ligatureBaseByOffset.get(cluster.offset);
  if (
    ligatureBase !== undefined
    && (shaped.glyphsByOffset.get(ligatureBase)?.length ?? 0) > 0
  ) {
    return "glyph";
  }

  if ((shaped.glyphsByOffset.get(cluster.offset)?.length ?? 0) > 0) {
    return "glyph";
  }

  return shaped.coverageByOffset.get(cluster.offset) === "complete"
    ? "glyph"
    : "native";
}

/**
 * Resolves a visual run's glyph coverage from its clusters' per-offset coverage.
 *
 * A run is omitted for native text slices, `"complete"` when the slice's glyphs
 * can be exact-painted, and `"partial"` when the slice still needs native text
 * fallback. A combined source run can be partial because another cluster fell
 * back, but a visual slice whose own glyphs all carry font identity is complete.
 *
 * @param group - Clusters of the run.
 * @param coverageByOffset - Source offset → segment glyph coverage.
 * @param glyphs - Glyphs collected for this visual run.
 * @param paintMode - Paint mode of the visual run.
 * @returns The merged coverage, or undefined when none applies.
 */
function resolveRunCoverage(
  group: readonly QuireTextCluster[],
  coverageByOffset: ReadonlyMap<number, QuireGlyphRunCoverage> | undefined,
  glyphs: readonly QuireTextShapedGlyph[],
  paintMode: VisualRunPaintMode
): QuireGlyphRunCoverage | undefined {
  if (paintMode === "native" || glyphs.length === 0) {
    return undefined;
  }

  const glyphsHaveFontIdentity = glyphs.every((glyph) => glyph.fontId !== undefined);

  if (coverageByOffset === undefined) {
    return glyphsHaveFontIdentity ? "complete" : "partial";
  }

  let coverage: QuireGlyphRunCoverage | undefined;
  for (const cluster of group) {
    const offsetCoverage = coverageByOffset.get(cluster.offset);
    if (offsetCoverage === "partial") {
      coverage = "partial";
      continue;
    }
    if (offsetCoverage === "complete") {
      coverage = "complete";
    }
  }

  if (coverage === "partial") {
    return glyphsHaveFontIdentity ? "complete" : "partial";
  }

  return coverage;
}

/**
 * Builds one visual run from its clusters in visual order.
 *
 * The run origin is the leftmost cluster x; clusters and glyphs are made
 * run-local by subtracting it. Each glyph is rebased per cluster (its
 * intra-cluster offset from the cluster's leftmost shaped glyph is preserved),
 * which keeps a glyph on its cluster's x even when wrapping splits a shaped
 * segment across lines.
 *
 * @param group - Clusters of the run, already in visual (ascending x) order.
 * @param line - Index of the line this run belongs to.
 * @param run - Source run index.
 * @param rtl - Whether the run reads right-to-left.
 * @param shaped - The source run's shaping data, when the run was shaped.
 * @param paintMode - Paint route resolved for the visual run.
 * @param verticalMetrics - Optional source-run metrics and fallback strut.
 * @returns The assembled visual run.
 */
function buildVisualRun(
  group: readonly QuireTextCluster[],
  line: number,
  run: number,
  rtl: boolean,
  shaped: ShapedRunData | undefined,
  paintMode: VisualRunPaintMode,
  verticalMetrics: QuireVisualRunVerticalMetrics | undefined
): QuireShapedVisualRun {
  const origin = resolveVisualRunOrigin(group);
  const clusters: QuireTextVisualCluster[] = group.map((cluster) => ({
    from: cluster.offset,
    to: cluster.offset + cluster.length,
    x: cluster.x - origin,
    advance: cluster.advance
  }));

  const glyphs: QuireTextShapedGlyph[] = paintMode === "glyph"
    ? collectRunGlyphs(group, shaped)
    : [];
  const codepoints: QuireTextCodepoint[] = paintMode === "glyph"
    ? collectCodepointRoles(group, shaped)
    : [];

  const coverage = resolveRunCoverage(
    group,
    shaped?.coverageByOffset,
    glyphs,
    paintMode
  );
  return {
    line,
    run,
    direction: rtl ? "rtl" : "ltr",
    x: origin,
    ...resolveVisualRunVerticalMetricFields(run, verticalMetrics),
    clusters,
    codepoints,
    glyphs,
    ...(paintMode === "native" ? characterGridNativePaint(group) : {}),
    ...(coverage === undefined ? {} : { glyphCoverage: coverage })
  };
}

/**
 * Resolves optional visual-run metric fields from one source run.
 *
 * @param run - Source run index.
 * @param verticalMetrics - Optional per-run metrics and fallback strut.
 * @returns Empty fields for legacy layouts, otherwise resolved ascent/descent.
 */
function resolveVisualRunVerticalMetricFields(
  run: number,
  verticalMetrics: QuireVisualRunVerticalMetrics | undefined
): { readonly ascent?: number; readonly descent?: number } {
  if (verticalMetrics === undefined) {
    return {};
  }

  const metrics = verticalMetrics.metricsByRun[run];
  return {
    ascent: metrics?.visualAscent ?? metrics?.ascent ?? verticalMetrics.fallbackAscent,
    descent: metrics?.visualDescent ?? metrics?.descent ?? verticalMetrics.fallbackDescent
  };
}

/**
 * Resolves the left edge for a visual-run cluster group.
 *
 * @param group - Clusters in visual order.
 * @returns Minimum x coordinate in the group.
 */
function resolveVisualRunOrigin(group: readonly QuireTextCluster[]): number {
  let origin = Infinity;

  for (const cluster of group) {
    origin = Math.min(origin, cluster.x);
  }

  return origin === Infinity ? 0 : origin;
}

/**
 * Derives non-base caret roles for a run's clusters.
 *
 * A grapheme cluster that was absorbed into a ligature has no glyph of its own
 * and a zero advance (the ligature glyph on a preceding cluster carries the full
 * width), so its leading offset is a `ligatureComponent` — a caret between it and
 * its base is interpolated across the ligature instead of sitting at an edge.
 * Combining marks stay inside their base grapheme, so they need no entry here.
 *
 * @param group - Clusters of the run, in visual order.
 * @param shaped - The source run's shaping data, when the run was shaped.
 * @returns Non-base codepoint roles in source order (empty for plain text).
 */
function collectCodepointRoles(
  group: readonly QuireTextCluster[],
  shaped: ShapedRunData | undefined
): QuireTextCodepoint[] {
  if (shaped === undefined) {
    return [];
  }

  const codepoints: QuireTextCodepoint[] = [];
  for (const cluster of group) {
    const hasGlyph = (shaped.glyphsByOffset.get(cluster.offset)?.length ?? 0) > 0;
    if (
      shaped.ligatureBaseByOffset.has(cluster.offset)
      || (!hasGlyph && cluster.advance === 0)
    ) {
      codepoints.push({ offset: cluster.offset, role: "ligatureComponent" });
    }
  }
  return codepoints.sort((first, second) => first.offset - second.offset);
}

/**
 * Collects a run's shaped glyphs, run-local and in visual order.
 *
 * All of a run's glyphs come from one itemized shaping segment, so they are
 * rebased by a single run-wide offset (the run's leftmost glyph). This preserves
 * the shaper's spacing and offsets exactly — so glyph painting keeps the shaped
 * geometry — while wrapping that splits a segment across lines still anchors each
 * line's run at its own left edge.
 *
 * @param group - Clusters of the run, in visual order.
 * @param shaped - The source run's shaping data, when the run was shaped.
 * @returns Run-local glyphs in visual order, or an empty array.
 */
function collectRunGlyphs(
  group: readonly QuireTextCluster[],
  shaped: ShapedRunData | undefined
): QuireTextShapedGlyph[] {
  if (shaped === undefined) {
    return [];
  }
  const gridGlyphs = collectCharacterGridGlyphs(group, shaped);
  if (gridGlyphs !== undefined) return gridGlyphs;

  const runGlyphs: QuireTextShapedGlyph[] = [];
  for (const cluster of group) {
    const clusterGlyphs = shaped.glyphsByOffset.get(cluster.offset);
    if (clusterGlyphs !== undefined) {
      runGlyphs.push(...clusterGlyphs);
    }
  }

  if (runGlyphs.length === 0) {
    return [];
  }

  const segmentLeft = Math.min(...runGlyphs.map((glyph) => glyph.x));
  return runGlyphs
    .map((glyph) => ({ ...glyph, x: glyph.x - segmentLeft }))
    .sort((first, second) => first.x - second.x);
}
