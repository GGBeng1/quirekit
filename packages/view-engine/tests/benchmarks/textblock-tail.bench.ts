import { bench } from "vitest";
import {
  type QuireTextFragment,
  type QuireTextMeasurer
} from "@quirekit/layout/text";
import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import { createQuireBlockShapeCache } from "../../src/layout/cache";
import { createQuireTextblockTailLineCheckpoints } from "../../src/layout/cache/block/checkpoints";
import { createQuireEditorLayoutProviderRegistry } from "../../src/editor-layout/providers/registry";
import type { QuireProseMirrorBlockInputOptions } from "../../src/editor-layout/prosemirror/block";
import {
  areQuireTextblockTailFragmentsNativeMetricOnly,
  createQuireTextblockTailRunSignature,
  tryReuseQuireTextblockTailFragments
} from "../../src/editor-layout/prosemirror/textblock/tail";
import { layoutQuireInlineTextFragmentsFromQuireLayout } from "@quirekit/layout/inline";

const contentWidth = 553.3228346456693;
const fixedMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: text.length * 10 })
};

bench("textblock tail cache: 32 repeated middle inserts", () => {
  const id = "paragraph-0";
  const contentStart = 10;
  const initialText = createSingleLongParagraphFixtureText();
  const marker = "single-long-paragraph segment 28";
  const insertStart = initialText.indexOf(marker) + marker.length;
  const cache = createQuireBlockShapeCache();
  let previousText = initialText;

  storeTailShape(
    cache,
    id,
    contentStart,
    previousText,
    layoutFragments(id, createRun(contentStart, previousText), contentWidth)
  );

  for (let index = 0; index < 32; index += 1) {
    const insertOffset = insertStart + index;
    const currentText = `${previousText.slice(0, insertOffset)}A${previousText.slice(insertOffset)}`;
    const run = createRun(contentStart, currentText);
    const runSignature = createQuireTextblockTailRunSignature(run, "ltr");
    const previous = cache.getTextblockTailShape(
      id,
      contentWidth,
      contentStart,
      runSignature
    );
    if (previous === undefined) {
      throw new Error("Benchmark setup lost its textblock tail cache entry.");
    }
    let convergenceLookaheadLines = previous.convergenceLookaheadLines;
    const fragments = tryReuseQuireTextblockTailFragments({
      previous,
      id,
      run,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextEdit: { offset: insertOffset, inserted: 1, deleted: 0 },
      width: contentWidth,
      options: createReuseOptions(),
      onConvergedSuffixLookahead: (lookaheadLines) => {
        convergenceLookaheadLines = lookaheadLines;
      }
    });
    if (fragments === undefined) {
      throw new Error("Benchmark setup unexpectedly left the textblock tail cache lane.");
    }
    storeTailShape(
      cache,
      id,
      contentStart,
      currentText,
      fragments,
      convergenceLookaheadLines
    );
    previousText = currentText;
  }
});

/**
 * Creates the deterministic stress paragraph used by the isolated benchmark.
 *
 * @returns Oversized paragraph fixture text.
 */
function createSingleLongParagraphFixtureText(): string {
  return [
    "Single long paragraph stress marker",
    ...Array.from(
      { length: 180 },
      (_, index) =>
        `single-long-paragraph segment ${index + 1} keeps one ProseMirror textblock flowing through repeated input, deletion, wrapping, and pagination.`
    )
  ].join(" ");
}

/**
 * Creates one plain LTR inline run for the benchmark paragraph.
 *
 * @param contentStart - Absolute document position at textblock content start.
 * @param text - Text represented by the run.
 * @returns Inline run consumed by the tail cache.
 */
function createRun(contentStart: number, text: string): QuireInlineTextRun {
  return {
    text,
    range: { from: contentStart, to: contentStart + text.length },
    font: "16px sans-serif",
    marks: []
  };
}

/**
 * Lays out the initial paragraph outside the measured repeated-edit loop.
 *
 * @param id - Stable textblock id used for fragment ids.
 * @param run - Inline run to wrap.
 * @param width - Available content width.
 * @returns Wrapped text fragments.
 */
function layoutFragments(
  id: string,
  run: QuireInlineTextRun,
  width: number
): readonly QuireTextFragment[] {
  return layoutQuireInlineTextFragmentsFromQuireLayout({
    id,
    runs: [run],
    rect: { x: 0, y: 0, width, height: 20 },
    lineHeight: 20,
    textBaselineOffset: 15,
    textMeasurer: fixedMeasurer,
    lineBreakMode: "word",
    baseDirection: "ltr"
  });
}

/**
 * Creates the production tail-reuse options shared by every benchmark edit.
 *
 * @returns Textblock collection options for the fixed benchmark environment.
 */
function createReuseOptions(): QuireProseMirrorBlockInputOptions {
  return {
    state: {} as QuireProseMirrorBlockInputOptions["state"],
    snapshotVersion: 1,
    layoutProviderRegistry: createQuireEditorLayoutProviderRegistry(),
    width: contentWidth,
    font: "16px sans-serif",
    lineHeight: 20,
    textBaselineOffset: 15,
    textMeasurer: fixedMeasurer,
    lineBreakMode: "word"
  };
}

/**
 * Replaces the current retained tail entry through the production cache API.
 *
 * @param cache - Cache that owns the local textblock entry.
 * @param id - Stable textblock id used for cache lookup.
 * @param contentStart - Absolute document position at textblock content start.
 * @param text - Plain text represented by the fragments.
 * @param fragments - Fragments to retain for the next edit.
 * @param convergenceLookaheadLines - Last successful bounded probe size.
 * @returns Nothing.
 */
function storeTailShape(
  cache: ReturnType<typeof createQuireBlockShapeCache>,
  id: string,
  contentStart: number,
  text: string,
  fragments: readonly QuireTextFragment[],
  convergenceLookaheadLines?: number | undefined
): void {
  const runSignature = createQuireTextblockTailRunSignature(
    createRun(contentStart, text),
    "ltr"
  );
  cache.setTextblockTailShape({
    width: contentWidth,
    id,
    contentStart,
    runSignature,
    text,
    fragments,
    lineCheckpoints: createQuireTextblockTailLineCheckpoints(fragments, contentStart),
    usesNativeMetricLayout: areQuireTextblockTailFragmentsNativeMetricOnly(fragments),
    convergenceLookaheadLines
  });
}
