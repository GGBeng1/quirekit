import type { QuireGlyphRunCoverage } from "@quirekit/render-contract";
import { resolveBidiRunEmbeddingLevels } from "./bidi";
import type { QuireTextLayoutOptions, QuireTextShapedGlyph } from "./types";

/**
 * Per-source-run shaping output: advances, glyphs, and coverage keyed by source
 * offset.
 *
 * The maps are keyed by the offset within the run's text (absolute, after
 * un-itemizing). Advances feed cluster geometry; glyphs feed the painter;
 * coverage tells the painter whether a glyph run can be drawn exactly. A
 * cluster's glyphs all come from one itemized segment, so the glyph `x` stays in
 * that segment's coordinate space and is rebased per cluster when visual runs are
 * assembled. See `docs/changes/canvas-text-geometry-single-source`.
 */
export interface ShapedRunData {
  /** Source offset → cluster advance width (only populated when {@link shapedAdvances}). */
  readonly advanceByOffset: ReadonlyMap<number, number>;
  /**
   * Source offset → shaped glyphs of that cluster, in shaped (visual) order with
   * `x` relative to their itemized segment origin and `cluster` the absolute
   * source offset.
   */
  readonly glyphsByOffset: ReadonlyMap<number, readonly QuireTextShapedGlyph[]>;
  /**
   * Source offset → base source offset for non-leading codepoints covered by a
   * multi-codepoint shaped cluster. This keeps ligature components attached to
   * their base glyph when visual runs are split by paint mode.
   */
  readonly ligatureBaseByOffset: ReadonlyMap<number, number>;
  /**
   * Source offset → the glyph coverage of the itemized segment that offset
   * belongs to, so a visual run resolves its coverage from the segment it came
   * from. Omitted offsets had no coverage reported.
   */
  readonly coverageByOffset: ReadonlyMap<number, QuireGlyphRunCoverage>;
  /** Maximum font ascent reported by shaped itemized segments, when available. */
  readonly ascent?: number | undefined;
  /** Maximum font descent reported by shaped itemized segments, when available. */
  readonly descent?: number | undefined;
  /**
   * Whether this run's advances come from the shaper. True for every script when
   * a shaper is present: shaped advances are the single geometry source, so RTL
   * cursive joining is correct and LTR/CJK avoid per-grapheme `measureText`. Only
   * false when no shaper is available, where cluster advances fall back to
   * `measureText`.
   */
  readonly shapedAdvances: boolean;
}

/**
 * Shapes each run that needs cursive/complex shaping into per-offset advances and
 * glyphs.
 *
 * Every run is shaped for glyphs when a shaper is present, so glyph-run painting
 * is the production path for left-to-right, CJK, and right-to-left alike. Each run
 * is itemized into maximal same-direction (BiDi level parity) segments and shaped
 * one segment at a time, so the shaper resolves one direction/script per buffer
 * instead of guessing one for the whole mixed run (which would break joining and
 * boundary-space advances). Cluster advances come from the shaper for every
 * script (the single geometry source): RTL cursive joining is correct and
 * LTR/CJK avoid the per-grapheme `measureText` cumulative-prefix scan.
 *
 * @param options - Layout options carrying the runs and optional shaper.
 * @returns Per-run shaping data (empty when no shaper is provided).
 */
export function resolveShapedRunData(
  options: QuireTextLayoutOptions
): ReadonlyMap<number, ShapedRunData> {
  const result = new Map<number, ShapedRunData>();
  const shapeText = options.shapeText;

  if (!shapeText) {
    return result;
  }

  // One run-aware level array drives both itemization and cluster ordering.
  const levels = resolveBidiRunEmbeddingLevels(
    options.runs,
    options.baseDirection ?? "ltr"
  );
  const levelAt = (index: number): number => (levels ? levels[index] ?? 0 : 0);

  let runStart = 0;
  options.runs.forEach((run, runIndex) => {
    const base = runStart;
    runStart += run.text.length;
    if (run.text.length === 0) {
      return;
    }
    if (run.replacement !== undefined) {
      return;
    }
    const shouldShape = options.shouldShapeRun?.(run, runIndex);
    // A higher layer may explicitly shape a tracked language/complex run after
    // disabling optional ligatures. Otherwise native character spacing remains
    // authoritative and avoids multi-grapheme shaped-cluster geometry.
    if (
      run.letterSpacing !== undefined
      && run.letterSpacing !== 0
      && shouldShape !== true
    ) {
      return;
    }
    if (shouldShape === false) {
      return;
    }

    const advanceByOffset = new Map<number, number>();
    const glyphsByOffset = new Map<number, QuireTextShapedGlyph[]>();
    const ligatureBaseByOffset = new Map<number, number>();
    const coverageByOffset = new Map<number, QuireGlyphRunCoverage>();
    let ascent: number | undefined;
    let descent: number | undefined;
    // Advances come from the shaper for every script (the single geometry source):
    // glyphs are already shaped and painted at shaped positions, so taking cluster
    // advances from the shaper keeps caret/selection aligned with the glyphs and
    // avoids the per-grapheme measureText cumulative-prefix scan (O(n²) per line).
    const shapedAdvances = true;
    let segmentStart = 0;
    while (segmentStart < run.text.length) {
      const parity = levelAt(base + segmentStart) % 2;
      let segmentEnd = segmentStart;
      while (
        segmentEnd < run.text.length
        && levelAt(base + segmentEnd) % 2 === parity
      ) {
        segmentEnd += 1;
      }
      const shaped = shapeText(run.text.slice(segmentStart, segmentEnd), run.font, {
        runIndex,
        from: segmentStart,
        to: segmentEnd,
        direction: parity === 0 ? "ltr" : "rtl"
      });
      ascent = maxOptionalMetric(ascent, shaped.ascent);
      descent = maxOptionalMetric(descent, shaped.descent);
      if (shapedAdvances) {
        for (const cluster of shaped.clusters) {
          const clusterStart = segmentStart + cluster.offset;
          const clusterEnd = clusterStart + Math.max(cluster.length, 1);
          advanceByOffset.set(clusterStart, cluster.advance);
          for (let offset = clusterStart + 1; offset < clusterEnd; offset += 1) {
            advanceByOffset.set(offset, 0);
            ligatureBaseByOffset.set(offset, clusterStart);
          }
        }
      }
      for (const glyph of shaped.glyphs) {
        const offset = segmentStart + glyph.cluster;
        const glyphs = glyphsByOffset.get(offset) ?? [];
        const scale = run.horizontalScale ?? 1;
        glyphs.push({ ...glyph, cluster: offset, x: glyph.x * scale,
          xAdvance: glyph.xAdvance * scale, xOffset: glyph.xOffset * scale });
        glyphsByOffset.set(offset, glyphs);
      }
      if (shaped.glyphCoverage !== undefined) {
        for (let offset = segmentStart; offset < segmentEnd; offset += 1) {
          coverageByOffset.set(offset, shaped.glyphCoverage);
        }
      }
      segmentStart = segmentEnd;
    }
    result.set(runIndex, {
      advanceByOffset,
      glyphsByOffset,
      ligatureBaseByOffset,
      coverageByOffset,
      ...(ascent === undefined ? {} : { ascent }),
      ...(descent === undefined ? {} : { descent }),
      shapedAdvances
    });
  });

  return result;
}

/**
 * Keeps the maximum available font metric across shaped segments.
 *
 * @param current - Current maximum metric.
 * @param next - Candidate metric from the next segment.
 * @returns Updated maximum metric, or undefined when neither value is present.
 */
function maxOptionalMetric(
  current: number | undefined,
  next: number | undefined
): number | undefined {
  if (next === undefined) {
    return current;
  }

  return current === undefined ? next : Math.max(current, next);
}
