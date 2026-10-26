import { describe, expect, it } from "vitest";
import {
  readQuireTextFragmentSource,
  type QuireTextFragment,
  type QuireTextMeasurer
} from "@quirekit/layout/text";
import { layoutQuireInlineTextFragmentsFromQuireLayout } from "@quirekit/layout/inline";
import type { QuireProseMirrorBlockInputOptions } from "../block";
import { createQuireTextblockTailLineCheckpoints } from "../../../layout/cache/block/checkpoints";
import {
  areQuireTextblockTailFragmentsNativeMetricOnly,
  createQuireTextblockTailRunSignature,
  createQuireTextblockTailConvergenceLookaheadLineBudgets,
  tryReuseQuireTextblockTailFragments
} from "./tail";
import { createQuireBlockShapeCache } from "../../../layout/cache";
import { createQuireEditorLayoutProviderRegistry } from "../../providers/registry";

const fixedMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: text.length * 10 })
};
const playgroundA4BodyWidth = 553.3228346456693;

describe("textblock tail reuse", () => {
  it("classifies retained native-metric fragments once for cache entries", () => {
    const fragments = createLineFragments({
      id: "paragraph-0",
      contentStart: 10,
      lines: ["alpha ", "beta"]
    });
    const shaped = {
      ...fragments[0]!,
      shapedRun: {
        text: fragments[0]!.text,
        font: fragments[0]!.font,
        width: fragments[0]!.rect.width,
        ascent: 12,
        descent: 4,
        clusters: []
      }
    };

    expect(areQuireTextblockTailFragmentsNativeMetricOnly([])).toBe(false);
    expect(areQuireTextblockTailFragmentsNativeMetricOnly(fragments)).toBe(true);
    expect(
      areQuireTextblockTailFragmentsNativeMetricOnly([shaped, fragments[1]!])
    ).toBe(false);
  });

  it("keeps the cheap probe before a retained larger convergence lookahead", () => {
    expect(createQuireTextblockTailConvergenceLookaheadLineBudgets(192))
      .toEqual([2, 192]);
    expect(createQuireTextblockTailConvergenceLookaheadLineBudgets(96))
      .toEqual([2, 96, 192]);
    expect(createQuireTextblockTailConvergenceLookaheadLineBudgets(2))
      .toEqual([2, 32, 96, 192]);
    expect(createQuireTextblockTailConvergenceLookaheadLineBudgets(undefined))
      .toEqual([2, 32, 96, 192]);
  });

  it("uses a dirty text offset to retain the long unchanged prefix on tail input", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = "alpha beta gamma delta epsilon zeta";
    const currentText = `${previousText}a`;
    const run = {
      text: currentText,
      range: { from: contentStart, to: contentStart + currentText.length },
      font: "16px sans-serif",
      marks: []
    };
    const runSignature = createQuireTextblockTailRunSignature(run, "ltr");
    const fragments = createLineFragments({
      id,
      contentStart,
      lines: ["alpha beta ", "gamma delta ", "epsilon zeta"]
    });

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 120,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments
      },
      id,
      run,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextOffset: previousText.length,
      width: 120,
      options: createReuseOptions()
    });

    expect(reused?.[0]).toBe(fragments[0]);
    expect(reused?.some((fragment) => fragment.text.endsWith("a"))).toBe(true);
  });

  it("falls back to the full text diff when the dirty text offset is too broad", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = "alpha beta gamma delta epsilon zeta";
    const currentText = `${previousText}a`;
    const run = {
      text: currentText,
      range: { from: contentStart, to: contentStart + currentText.length },
      font: "16px sans-serif",
      marks: []
    };
    const runSignature = createQuireTextblockTailRunSignature(run, "ltr");
    const fragments = createLineFragments({
      id,
      contentStart,
      lines: ["alpha beta ", "gamma delta ", "epsilon zeta"]
    });

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 120,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments
      },
      id,
      run,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextOffset: 0,
      width: 120,
      options: createReuseOptions()
    });

    expect(reused?.[0]).toBe(fragments[0]);
    expect(reused?.some((fragment) => fragment.text.endsWith("a"))).toBe(true);
  });

  it("restarts pure inserts at the affected line without the delete lookback", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = "alpha beta gamma";
    const insertOffset = previousText.indexOf("beta") + 1;
    const currentText = `${previousText.slice(0, insertOffset)}X${previousText.slice(insertOffset)}`;
    const previousRun = createRun(id, contentStart, previousText);
    const currentRun = createRun(id, contentStart, currentText);
    const runSignature = createQuireTextblockTailRunSignature(currentRun, "ltr");
    const fragments = layoutFragments(id, previousRun, 60);

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 60,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments
      },
      id,
      run: currentRun,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextEdit: { offset: insertOffset, inserted: 1, deleted: 0 },
      width: 60,
      options: createReuseOptions({ width: 60 })
    });

    expect(serializeFragments(reused ?? [])).toEqual(
      serializeFragments(layoutFragments(id, currentRun, 60))
    );
    expect(reused?.[0]).toBe(fragments[0]);
  });

  it("keeps the previous-line lookback for pure deletes", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = "alpha beta gamma";
    const deleteOffset = previousText.indexOf("beta");
    const currentText = `${previousText.slice(0, deleteOffset)}${previousText.slice(deleteOffset + 1)}`;
    const previousRun = createRun(id, contentStart, previousText);
    const currentRun = createRun(id, contentStart, currentText);
    const runSignature = createQuireTextblockTailRunSignature(currentRun, "ltr");
    const fragments = layoutFragments(id, previousRun, 60);

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 60,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments
      },
      id,
      run: currentRun,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextEdit: { offset: deleteOffset, inserted: 0, deleted: 1 },
      width: 60,
      options: createReuseOptions({ width: 60 })
    });

    expect(serializeFragments(reused ?? [])).toEqual(
      serializeFragments(layoutFragments(id, currentRun, 60))
    );
    expect(reused?.[0]).not.toBe(fragments[0]);
  });

  it("rejects retained fragments that overlap on the same physical line", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = "alpha beta gamma";
    const currentText = `${previousText}a`;
    const run = {
      text: currentText,
      range: { from: contentStart, to: contentStart + currentText.length },
      font: "16px sans-serif",
      marks: []
    };
    const runSignature = createQuireTextblockTailRunSignature(run, "ltr");
    const fragments = createLineFragments({
      id,
      contentStart,
      lines: ["alpha ", "beta ", "gamma"]
    }).map((fragment, index) => ({
      ...fragment,
      rect: { ...fragment.rect, y: index === 1 ? 0 : fragment.rect.y }
    }));

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 120,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments
      },
      id,
      run,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextOffset: previousText.length,
      width: 120,
      options: createReuseOptions()
    });

    expect(reused).toBeUndefined();
  });

  it("uses retained line-checkpoint ranges for tail reuse", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = "alpha beta gamma";
    const currentText = `${previousText}a`;
    const run = {
      text: currentText,
      range: { from: contentStart, to: contentStart + currentText.length },
      font: "16px sans-serif",
      marks: []
    };
    const runSignature = createQuireTextblockTailRunSignature(run, "ltr");
    const fragments = createLineFragments({
      id,
      contentStart,
      lines: ["alpha ", "beta ", "gamma"]
    });
    const lineCheckpoints = createQuireTextblockTailLineCheckpoints(
      fragments,
      contentStart
    );

    expect(lineCheckpoints).toEqual({
      fromOffsets: [0, 6, 11],
      toOffsets: [6, 11, 16],
      yCoordinates: [0, 20, 40]
    });

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 120,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments,
        lineCheckpoints
      },
      id,
      run,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextOffset: previousText.length,
      width: 120,
      options: createReuseOptions()
    });

    expect(reused?.[0]).toBe(fragments[0]);
    expect(reused?.some((fragment) => fragment.text.endsWith("a"))).toBe(true);
  });

  it("reuses converged suffix lines after a middle insert", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = Array.from(
      { length: 80 },
      () => "aaaa bbbb cccc "
    ).join("");
    const phraseLength = "aaaa bbbb cccc ".length;
    const insertOffset = phraseLength * 36 + "aaaa".length;
    const currentText = `${previousText.slice(0, insertOffset)}A${previousText.slice(insertOffset)}`;
    const previousRun = createRun(id, contentStart, previousText);
    const currentRun = createRun(id, contentStart, currentText);
    const runSignature = createQuireTextblockTailRunSignature(currentRun, "ltr");
    const originalFragments = layoutFragments(id, previousRun, 160);
    const sentinelIndex = originalFragments.findIndex(
      (fragment) => fragment.range.from > contentStart + insertOffset + 200
    );
    const sentinel = createSentinelFragmentMarker();
    const retainedFragments = originalFragments.map((fragment, index) =>
      index === sentinelIndex ? markFragmentWithSentinel(fragment, sentinel) : fragment
    );

    expect(sentinelIndex).toBeGreaterThan(0);

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 160,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments: retainedFragments
      },
      id,
      run: currentRun,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextEdit: { offset: insertOffset, inserted: 1, deleted: 0 },
      width: 160,
      options: createReuseOptions({ width: 160 })
    });
    const uncached = layoutFragments(id, currentRun, 160);
    const retainedSentinelFragment = reused?.find((fragment) =>
      fragmentHasSentinel(fragment, sentinel)
    );

    if (retainedSentinelFragment === undefined) {
      throw new Error("Expected retained suffix fragment.");
    }
    expect(
      Object.getOwnPropertyDescriptor(retainedSentinelFragment, "caretStops")?.get
    ).toEqual(expect.any(Function));
    expect(serializeFragments(reused ?? [])).toEqual(serializeFragments(uncached));
  });

  it("keeps repeated suffix shifts from opening prior lazy caret stops", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = Array.from(
      { length: 80 },
      () => "aaaa bbbb cccc "
    ).join("");
    const phraseLength = "aaaa bbbb cccc ".length;
    const insertOffset = phraseLength * 36 + "aaaa".length;
    const currentText = `${previousText.slice(0, insertOffset)}A${previousText.slice(insertOffset)}`;
    const previousRun = createRun(id, contentStart, previousText);
    const currentRun = createRun(id, contentStart, currentText);
    const runSignature = createQuireTextblockTailRunSignature(currentRun, "ltr");
    const originalFragments = layoutFragments(id, previousRun, 160);
    const sentinelIndex = originalFragments.findIndex(
      (fragment) => fragment.range.from > contentStart + insertOffset + 200
    );
    const sentinel = createSentinelFragmentMarker();
    const retainedFragments = originalFragments.map((fragment, index) =>
      index === sentinelIndex ? markFragmentWithSentinel(fragment, sentinel) : fragment
    );
    const firstReused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 160,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments: retainedFragments
      },
      id,
      run: currentRun,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextEdit: { offset: insertOffset, inserted: 1, deleted: 0 },
      width: 160,
      options: createReuseOptions({ width: 160 })
    });
    const retainedSuffixFragment = firstReused?.find((fragment) =>
      fragmentHasSentinel(fragment, sentinel)
    );

    if (retainedSuffixFragment === undefined) {
      throw new Error("Expected retained suffix fragment.");
    }
    expect(
      Object.getOwnPropertyDescriptor(retainedSuffixFragment, "caretStops")?.get
    ).toEqual(expect.any(Function));

    Object.defineProperty(retainedSuffixFragment, "caretStops", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("Prior lazy caret stops should not be opened.");
      }
    });

    const nextInsertOffset = insertOffset + 1;
    const nextText = `${currentText.slice(0, nextInsertOffset)}B${currentText.slice(nextInsertOffset)}`;
    const nextRun = createRun(id, contentStart, nextText);
    const nextRunSignature = createQuireTextblockTailRunSignature(nextRun, "ltr");
    let secondReused: readonly QuireTextFragment[] | undefined;

    expect(() => {
      secondReused = tryReuseQuireTextblockTailFragments({
        previous: {
          width: 160,
          id,
          contentStart,
          runSignature: nextRunSignature,
          text: currentText,
          fragments: firstReused ?? []
        },
        id,
        run: nextRun,
        runSignature: nextRunSignature,
        metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
        baseDirection: "ltr",
        contentStart,
        dirtyTextEdit: { offset: nextInsertOffset, inserted: 1, deleted: 0 },
        width: 160,
        options: createReuseOptions({ width: 160 })
      });
    }).not.toThrow();

    expect(serializeFragments(secondReused ?? []))
      .toEqual(serializeFragments(layoutFragments(id, nextRun, 160)));
  });

  it("reuses converged suffix lines in the single-long-paragraph fixture shape", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = createSingleLongParagraphFixtureText();
    const marker = "single-long-paragraph segment 96";
    const insertOffset = previousText.indexOf(marker) + marker.length;
    const currentText = `${previousText.slice(0, insertOffset)}A${previousText.slice(insertOffset)}`;
    const previousRun = createRun(id, contentStart, previousText);
    const currentRun = createRun(id, contentStart, currentText);
    const runSignature = createQuireTextblockTailRunSignature(currentRun, "ltr");
    const originalFragments = layoutFragments(id, previousRun, 520);
    const sentinelIndex = originalFragments.findIndex(
      (fragment) => fragment.range.from > contentStart + insertOffset + 500
    );
    const sentinel = createSentinelFragmentMarker();
    const retainedFragments = originalFragments.map((fragment, index) =>
      index === sentinelIndex ? markFragmentWithSentinel(fragment, sentinel) : fragment
    );

    expect(insertOffset).toBeGreaterThan(0);
    expect(sentinelIndex).toBeGreaterThan(0);

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 520,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments: retainedFragments
      },
      id,
      run: currentRun,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextEdit: { offset: insertOffset, inserted: 1, deleted: 0 },
      width: 520,
      options: createReuseOptions({ width: 520 })
    });
    const uncached = layoutFragments(id, currentRun, 520);

    expect(serializeFragments(reused ?? [])).toEqual(serializeFragments(uncached));
    expect(reused?.some((fragment) => fragmentHasSentinel(fragment, sentinel))).toBe(true);
  });

  it("reuses converged suffix lines near the single-long-paragraph performance marker", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = createSingleLongParagraphFixtureText();
    const marker = "single-long-paragraph segment 28";
    const insertOffset = previousText.indexOf(marker) + marker.length;
    const currentText = `${previousText.slice(0, insertOffset)}A${previousText.slice(insertOffset)}`;
    const previousRun = createRun(id, contentStart, previousText);
    const currentRun = createRun(id, contentStart, currentText);
    const runSignature = createQuireTextblockTailRunSignature(currentRun, "ltr");
    const originalFragments = layoutFragments(id, previousRun, 520);
    const sentinelIndex = originalFragments.findIndex(
      (fragment) => fragment.range.from > contentStart + insertOffset + 10_500
    );
    const sentinel = createSentinelFragmentMarker();
    const reuseOutcomes: string[] = [];
    const retainedFragments = originalFragments.map((fragment, index) =>
      index === sentinelIndex ? markFragmentWithSentinel(fragment, sentinel) : fragment
    );

    expect(insertOffset).toBeGreaterThan(0);
    expect(sentinelIndex).toBeGreaterThan(0);

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 520,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments: retainedFragments
      },
      id,
      run: currentRun,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextEdit: { offset: insertOffset, inserted: 1, deleted: 0 },
      width: 520,
      options: createReuseOptions({ width: 520 }),
      onReuseOutcome: (outcome) => {
        reuseOutcomes.push(outcome);
      }
    });
    const uncached = layoutFragments(id, currentRun, 520);

    expect(serializeFragments(reused ?? [])).toEqual(serializeFragments(uncached));
    expect(reuseOutcomes).toEqual(["converged-suffix-hit"]);
    expect(reused?.some((fragment) => fragmentHasSentinel(fragment, sentinel))).toBe(true);
  });

  it("matches uncached layout for a small sequence of cached performance-marker inserts", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const initialText = createSingleLongParagraphFixtureText();
    const marker = "single-long-paragraph segment 28";
    const initialInsertOffset = initialText.indexOf(marker) + marker.length;
    const cache = createQuireBlockShapeCache();
    let previousText = initialText;
    const initialFragments = layoutFragments(
      id,
      createRun(id, contentStart, previousText),
      playgroundA4BodyWidth
    );

    storeTextblockTailShapeInCache(
      cache,
      id,
      contentStart,
      previousText,
      initialFragments,
      playgroundA4BodyWidth
    );

    expect(initialInsertOffset).toBeGreaterThan(0);

    for (let index = 0; index < 3; index += 1) {
      const insertOffset = initialInsertOffset + index;
      const currentText = `${previousText.slice(0, insertOffset)}A${previousText.slice(insertOffset)}`;
      const reused = reuseTextblockTailThroughCache(
        cache,
        id,
        contentStart,
        previousText,
        currentText,
        insertOffset,
        playgroundA4BodyWidth
      );
      const uncached = layoutFragments(
        id,
        createRun(id, contentStart, currentText),
        playgroundA4BodyWidth
      );

      expect(serializeFragments(reused ?? [])).toEqual(serializeFragments(uncached));
      previousText = currentText;
    }

    expect(cache.snapshot()).toMatchObject({
      localShapeHits: 3,
      localShapeMisses: 0,
      localShapeStores: 4
    });
  });

  it("keeps repeated performance-marker inserts inside the cache lane", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const initialText = createSingleLongParagraphFixtureText();
    const marker = "single-long-paragraph segment 28";
    const initialInsertOffset = initialText.indexOf(marker) + marker.length;
    const cache = createQuireBlockShapeCache();
    const sentinel = createSentinelFragmentMarker();
    const initialFragments = layoutFragments(
      id,
      createRun(id, contentStart, initialText),
      playgroundA4BodyWidth
    );
    const sentinelIndex = initialFragments.findIndex(
      (fragment) => fragment.range.from > contentStart + initialInsertOffset + 10_500
    );
    const retainedFragments = initialFragments.map((fragment, index) =>
      index === sentinelIndex ? markFragmentWithSentinel(fragment, sentinel) : fragment
    );
    const outcomes: string[] = [];
    const traceNames: string[] = [];
    let previousText = initialText;

    expect(initialInsertOffset).toBeGreaterThan(0);
    expect(sentinelIndex).toBeGreaterThan(0);

    storeTextblockTailShapeInCache(
      cache,
      id,
      contentStart,
      initialText,
      retainedFragments,
      playgroundA4BodyWidth
    );

    for (let index = 0; index < 32; index += 1) {
      const insertOffset = initialInsertOffset + index;
      const currentText = `${previousText.slice(0, insertOffset)}A${previousText.slice(insertOffset)}`;
      const reused = reuseTextblockTailThroughCache(
        cache,
        id,
        contentStart,
        previousText,
        currentText,
        insertOffset,
        playgroundA4BodyWidth,
        outcomes,
        traceNames
      );

      expect(reused).toBeDefined();
      if (index === 0) {
        expect(reused?.some((fragment) => fragmentHasSentinel(fragment, sentinel)))
          .toBe(true);
      }
      previousText = currentText;
    }

    const convergenceWorkUnits = traceNames.filter((name) =>
      name.startsWith("layout:collect:textblock-tail:convergence-window:")
    );
    const finalOutcomes = outcomes.filter((outcome) => outcome !== "convergence-miss");

    expect(finalOutcomes).toHaveLength(32);
    expect(outcomes).not.toContain("miss");
    expect(convergenceWorkUnits.length).toBeGreaterThanOrEqual(32);
    expect(convergenceWorkUnits.length).toBeLessThan(32 * 4);
    expect(traceNames).not.toContain("layout:collect:textblock-tail:suffix");
    expect(cache.snapshot()).toMatchObject({
      localShapeHits: 32,
      localShapeMisses: 0,
      localShapeStores: 33,
      localShapeReuseMisses: 0
    });
  });

  it("skips middle convergence probes from the retained successful lookahead", () => {
    const id = "paragraph-0";
    const contentStart = 10;
    const previousText = createSingleLongParagraphFixtureText();
    const marker = "single-long-paragraph segment 28";
    const insertOffset = previousText.indexOf(marker) + marker.length;
    const currentText = `${previousText.slice(0, insertOffset)}A${previousText.slice(insertOffset)}`;
    const currentRun = createRun(id, contentStart, currentText);
    const runSignature = createQuireTextblockTailRunSignature(currentRun, "ltr");
    const traceNames: string[] = [];

    expect(insertOffset).toBeGreaterThan(0);

    const reused = tryReuseQuireTextblockTailFragments({
      previous: {
        width: 520,
        id,
        contentStart,
        runSignature,
        text: previousText,
        fragments: layoutFragments(
          id,
          createRun(id, contentStart, previousText),
          playgroundA4BodyWidth
        ),
        convergenceLookaheadLines: 192
      },
      id,
      run: currentRun,
      runSignature,
      metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
      baseDirection: "ltr",
      contentStart,
      dirtyTextEdit: { offset: insertOffset, inserted: 1, deleted: 0 },
      width: playgroundA4BodyWidth,
      options: {
        ...createReuseOptions({ width: playgroundA4BodyWidth }),
        trace: (phase) => {
          traceNames.push(phase.name);
        }
      }
    });

    expect(serializeFragments(reused ?? [])).toEqual(
      serializeFragments(layoutFragments(id, currentRun, playgroundA4BodyWidth))
    );
    expect(traceNames).toContain(
      "layout:collect:textblock-tail:convergence-window:2"
    );
    expect(traceNames).not.toContain(
      "layout:collect:textblock-tail:convergence-window:32"
    );
    expect(traceNames).not.toContain(
      "layout:collect:textblock-tail:convergence-window:96"
    );
  });
});

/**
 * Creates text with the same phrase pattern as the playground's single paragraph fixture.
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
 * Creates the minimal layout options consumed by suffix shaping in the reuse path.
 *
 * @returns ProseMirror block input options for textblock-tail tests.
 */
function createReuseOptions(input: {
  /** Available content width for inline layout. */
  readonly width?: number;
} = {}): QuireProseMirrorBlockInputOptions {
  return {
    state: {} as QuireProseMirrorBlockInputOptions["state"],
    snapshotVersion: 1,
    layoutProviderRegistry: createQuireEditorLayoutProviderRegistry(),
    width: input.width ?? 120,
    font: "16px sans-serif",
    lineHeight: 20,
    textBaselineOffset: 15,
    textMeasurer: fixedMeasurer,
    lineBreakMode: "word"
  };
}

/**
 * Stores one complete long-paragraph shape through the production cache API.
 *
 * @param cache - Block-shape cache that owns the retained local-shape entry.
 * @param id - Stable id embedded in fragment ids.
 * @param contentStart - Absolute document position at textblock content start.
 * @param text - Plain text represented by the retained fragments.
 * @param fragments - Fragments to retain for the next local edit.
 * @param width - Content width shared by cache admission and layout.
 * @param convergenceLookaheadLines - Optional successful probe size to retain.
 * @returns Nothing.
 */
function storeTextblockTailShapeInCache(
  cache: ReturnType<typeof createQuireBlockShapeCache>,
  id: string,
  contentStart: number,
  text: string,
  fragments: readonly QuireTextFragment[],
  width: number,
  convergenceLookaheadLines?: number | undefined
): void {
  const runSignature = createQuireTextblockTailRunSignature(
    createRun(id, contentStart, text),
    "ltr"
  );
  cache.setTextblockTailShape({
    width,
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

/**
 * Reads, reuses, and replaces one retained long-textblock entry through its
 * production cache API.
 *
 * @param cache - Block-shape cache containing the previous local shape.
 * @param id - Stable id embedded in fragment ids.
 * @param contentStart - Absolute document position at textblock content start.
 * @param previousText - Text recorded in the previous cache entry.
 * @param currentText - Text after the local insertion.
 * @param insertOffset - Textblock-local insertion offset.
 * @param width - Content width shared by cache lookup and layout.
 * @param outcomes - Optional sink for cache reuse outcomes.
 * @param traceNames - Optional sink for measured tail work-unit names.
 * @returns Reused fragments, or undefined when the cache lane is unavailable.
 */
function reuseTextblockTailThroughCache(
  cache: ReturnType<typeof createQuireBlockShapeCache>,
  id: string,
  contentStart: number,
  previousText: string,
  currentText: string,
  insertOffset: number,
  width: number,
  outcomes?: string[] | undefined,
  traceNames?: string[] | undefined
): readonly QuireTextFragment[] | undefined {
  const currentRun = createRun(id, contentStart, currentText);
  const runSignature = createQuireTextblockTailRunSignature(currentRun, "ltr");
  const previous = cache.getTextblockTailShape(
    id,
    width,
    contentStart,
    runSignature
  );
  let convergenceLookaheadLines = previous?.convergenceLookaheadLines;
  const fragments = previous === undefined
    ? undefined
    : tryReuseQuireTextblockTailFragments({
        previous,
        id,
        run: currentRun,
        runSignature,
        metrics: { font: "16px sans-serif", lineHeight: 20, baselineOffset: 15 },
        baseDirection: "ltr",
        contentStart,
        dirtyTextEdit: { offset: insertOffset, inserted: 1, deleted: 0 },
        width,
        options: {
          ...createReuseOptions({ width }),
          ...(traceNames === undefined
            ? {}
            : {
                trace: (phase) => {
                  traceNames.push(phase.name);
                }
              })
        },
        ...(outcomes === undefined
          ? {}
          : {
              onReuseOutcome: (outcome) => {
                outcomes.push(outcome);
                cache.recordTextblockTailReuseOutcome(outcome);
              }
            }),
        onConvergedSuffixLookahead: (lookaheadLines) => {
          convergenceLookaheadLines = lookaheadLines;
        }
      });

  if (fragments !== undefined) {
    storeTextblockTailShapeInCache(
      cache,
      id,
      contentStart,
      currentText,
      fragments,
      width,
      convergenceLookaheadLines
    );
  }

  expect(previous?.text).toBe(previousText);
  return fragments;
}

/**
 * Creates one inline run for a textblock test fixture.
 *
 * @param id - Stable block id, kept for call-site readability.
 * @param contentStart - Absolute document position at textblock content start.
 * @param text - Text content for the run.
 * @returns Inline run consumed by tail reuse.
 */
function createRun(
  id: string,
  contentStart: number,
  text: string
): Parameters<typeof createQuireTextblockTailRunSignature>[0] {
  void id;
  return {
    text,
    range: { from: contentStart, to: contentStart + text.length },
    font: "16px sans-serif",
    marks: []
  };
}

/**
 * Lays out text fragments through the same inline engine the tail path calls.
 *
 * @param id - Stable block id used for fragment ids.
 * @param run - Inline run to wrap.
 * @param width - Available content width.
 * @returns Wrapped text fragments.
 */
function layoutFragments(
  id: string,
  run: Parameters<typeof createQuireTextblockTailRunSignature>[0],
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
 * Serializes geometry fields that must match between cached and uncached layout.
 *
 * @param fragments - Text fragments to serialize.
 * @returns Render-relevant fragment fields without retained shaped-run identity.
 */
function serializeFragments(
  fragments: readonly QuireTextFragment[]
): readonly unknown[] {
  return fragments.map((fragment) => ({
    text: fragment.text,
    range: fragment.range,
    rect: fragment.rect,
    font: fragment.font,
    lineHeight: fragment.lineHeight,
    baseline: fragment.baseline,
    textColor: fragment.textColor,
    textBackgroundColor: fragment.textBackgroundColor,
    textDecoration: fragment.textDecoration,
    marks: fragment.marks,
    direction: fragment.direction,
    caretStops: fragment.caretStops
  }));
}

/**
 * Creates an opaque marker that can only survive through suffix reuse.
 *
 * @returns Marker object for retained-fragment checks.
 */
function createSentinelFragmentMarker(): object {
  return {};
}

/**
 * Adds a test-only marker without affecting render-relevant fragment fields.
 *
 * @param fragment - Fragment to mark.
 * @param sentinel - Marker object to attach.
 * @returns Marked fragment.
 */
function markFragmentWithSentinel(
  fragment: QuireTextFragment,
  sentinel: object
): QuireTextFragment {
  return { ...fragment, __quireTestSentinel: sentinel } as QuireTextFragment;
}

/**
 * Checks whether a fragment retained the test-only marker.
 *
 * @param fragment - Fragment to inspect.
 * @param sentinel - Marker object expected on the fragment.
 * @returns Whether the marker survived.
 */
function fragmentHasSentinel(
  fragment: QuireTextFragment,
  sentinel: object
): boolean {
  const source = readQuireTextFragmentSource(fragment);
  return (
    (fragment as { readonly __quireTestSentinel?: unknown }).__quireTestSentinel ===
      sentinel ||
    (source as { readonly __quireTestSentinel?: unknown } | undefined)
      ?.__quireTestSentinel === sentinel
  );
}

/**
 * Creates simple LTR line fragments with contiguous document ranges.
 *
 * @param options - Fragment id prefix, content start, and line text values.
 * @returns Text fragments suitable for retained-prefix checkpoint tests.
 */
function createLineFragments(options: {
  /** Stable block id used as the text fragment id prefix. */
  readonly id: string;
  /** Absolute document position at the textblock content start. */
  readonly contentStart: number;
  /** One text value for each visual line. */
  readonly lines: readonly string[];
}): readonly QuireTextFragment[] {
  let offset = 0;

  return options.lines.map((line, index) => {
    const from = options.contentStart + offset;
    offset += line.length;

    return {
      id: `${options.id}:text-${index}`,
      text: line,
      range: { from, to: from + line.length },
      rect: { x: 0, y: index * 20, width: line.length * 10, height: 20 },
      font: "16px sans-serif",
      lineHeight: 20,
      baseline: index * 20 + 15,
      caretStops: []
    };
  });
}
