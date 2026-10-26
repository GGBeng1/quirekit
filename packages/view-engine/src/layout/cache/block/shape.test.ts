import { createEditor, type QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import type { QuireRect } from "@quirekit/renderer";
import { buildQuireLayoutSnapshot } from "../../../editor-layout";
import type { QuireLayoutSnapshot } from "../../../editor-layout";
import type { QuireLayoutNode } from "../../types";
import type { QuireBlockLayoutInput } from "../../engine";
import type {
  QuireShapedGlyphPlacement,
  QuireShapedTextCluster,
  QuireTextFragment,
  QuireTextMeasurer
} from "@quirekit/layout/text";
import { createQuireBlockShapeCache } from "./shape";

const viewportRect: QuireRect = { x: 0, y: 0, width: 1000, height: 600 };

describe("CanvasBlockShapeCache", () => {
  it("rebases cached fragment ids when an earlier sibling renumbers the block", () => {
    const cache = createQuireBlockShapeCache();
    const node = {};
    const fragment: QuireTextFragment = {
      id: "paragraph-0-5:text-0", text: "abc", range: { from: 11, to: 14 },
      rect: { x: 0, y: 0, width: 30, height: 20 }, font: "16px sans-serif", lineHeight: 20, baseline: 16,
      caretStops: [{ position: { pos: 11 }, localX: 0 }]
    };
    cache.set(node, 300, 11, [fragment], "default", "paragraph-0-5");

    // Inserting a paragraph before this one shifts both its position and its
    // path-based id; cached fragments must carry the current id.
    const moved = cache.get(node, 300, 13, "default", "paragraph-0-6");
    expect(moved?.map(item => [item.id, item.range, item.caretStops[0]?.position.pos]))
      .toEqual([["paragraph-0-6:text-0", { from: 13, to: 16 }, 13]]);
    expect(cache.get(node, 300, 13, "default", "paragraph-0-6")?.[0]?.id).toBe("paragraph-0-6:text-0");

    cache.set(node, 300, 11, [{ ...fragment, id: "foreign:text-0" }], "default", "paragraph-0-5");
    expect(cache.get(node, 300, 11, "default", "paragraph-0-7")).toBeUndefined();
  });

  it("keeps geometry dependency variants separate for one node and width", () => {
    const cache = createQuireBlockShapeCache();
    const node = {};
    const baseline: readonly QuireTextFragment[] = [];
    const wrapped: readonly QuireTextFragment[] = [];

    cache.set(node, 300, 1, baseline, "flow-baseline");
    cache.set(node, 300, 1, wrapped, "flow-slots:0:80,140:160");

    expect(cache.get(node, 300, 1, "flow-baseline")).toBe(baseline);
    expect(cache.get(node, 300, 1, "flow-slots:0:80,140:160")).toBe(wrapped);
    expect(cache.get(node, 300, 1, "flow-slots:0:90,150:150")).toBeUndefined();
  });

  it("performs zero measurement on a second build of an unchanged document", () => {
    const editor = createEditorWithParagraphs(["AAAA", "BBBB", "CCCC"]);
    const cache = createQuireBlockShapeCache();
    const counter = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });
    expect(counter.calls).toBeGreaterThan(0);

    counter.reset();
    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });
    expect(counter.calls).toBe(0);
  });

  it("reports local-shape bypasses when top-level input cache hits before shaping", () => {
    const editor = createEditorWithParagraphs(["AAAA"]);
    const cache = createQuireBlockShapeCache();
    const counter = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });
    expect(cache.snapshot().localShapeBypassTopLevelInputHit).toBe(0);

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });

    expect(cache.snapshot().localShapeBypassTopLevelInputHit).toBeGreaterThan(0);
  });

  it("resets local-shape bypass counters with other cache counters", () => {
    const cache = createQuireBlockShapeCache();

    cache.recordTextblockTailBypass("multi-run");
    cache.recordTextblockTailBypass("fragment-hit");
    cache.recordTextblockTailBypass("textblock-input-hit");
    cache.recordTextblockTailBypass("top-level-input-hit", 3);
    cache.recordTextblockTailBypass("estimated");

    expect(cache.snapshot()).toMatchObject({
      localShapeBypassMultiRun: 1,
      localShapeBypassFragmentHit: 1,
      localShapeBypassTextblockInputHit: 1,
      localShapeBypassTopLevelInputHit: 3,
      localShapeBypassEstimated: 1
    });

    cache.clear();

    expect(cache.snapshot()).toMatchObject({
      localShapeBypassMultiRun: 0,
      localShapeBypassFragmentHit: 0,
      localShapeBypassTextblockInputHit: 0,
      localShapeBypassTopLevelInputHit: 0,
      localShapeBypassEstimated: 0
    });
  });

  it("tracks retained textblock tail candidates before run-signature lookup", () => {
    const cache = createQuireBlockShapeCache();

    expect(cache.hasTextblockTailShapeCandidate("paragraph-0", 300, 1)).toBe(false);

    cache.setTextblockTailShape({
      id: "paragraph-0",
      width: 300,
      contentStart: 1,
      runSignature: "ltr\u000016px sans-serif",
      text: "Hello",
      fragments: []
    });

    expect(cache.hasTextblockTailShapeCandidate("paragraph-0", 300, 1)).toBe(true);
    expect(cache.hasTextblockTailShapeCandidate("paragraph-0", 240, 1)).toBe(false);

    cache.clear();

    expect(cache.hasTextblockTailShapeCandidate("paragraph-0", 300, 1)).toBe(false);
  });

  it("retains tail-shape candidates only for long textblocks", () => {
    const longText = createLongParagraphText();
    const editor = createEditorWithParagraphs(["Short text", longText]);
    const cache = createQuireBlockShapeCache();
    const counter = createCountingMeasurer();
    const secondContentStart = editor.state.doc.child(0).nodeSize + 1;

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });

    expect(cache.hasTextblockTailShapeCandidate("paragraph-0", viewportRect.width, 1))
      .toBe(false);
    expect(
      cache.hasTextblockTailShapeCandidate(
        "paragraph-1",
        viewportRect.width,
        secondContentStart
      )
    ).toBe(true);
  });

  it("re-measures only the block whose content changed", () => {
    const editor = createEditorWithParagraphs(["AAAA", "BBBB", "CCCC"]);
    const cache = createQuireBlockShapeCache();
    const counter = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });

    // A real transaction: PM reuses the unchanged paragraph node objects, so the
    // cache hits for them; only the edited paragraph is a new node object.
    const secondBlockContentStart = editor.state.doc.child(0).nodeSize + 1;
    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("Z", secondBlockContentStart)
    );

    counter.reset();
    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });

    expect(counter.calls).toBeGreaterThan(0);
    // The changed block ("ZBBBB") is measured; the unchanged blocks are not.
    expect(counter.texts.some((text) => text.includes("Z"))).toBe(true);
    expect(counter.texts.some((text) => text.includes("A"))).toBe(false);
    expect(counter.texts.some((text) => text.includes("C"))).toBe(false);
  });

  it("reuses previous long textblock lines when appending at the tail", () => {
    const editor = createEditorWithParagraphs([createLongParagraphText()]);
    const cache = createQuireBlockShapeCache();
    const cachedMeasurer = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });

    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("A", getFirstParagraphTextEndPosition(editor))
    );

    cachedMeasurer.reset();
    const cached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });
    const uncached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: createCountingMeasurer().measurer
    });

    expect(serializeSnapshot(cached)).toEqual(serializeSnapshot(uncached));
    expect(getFirstTextFragments(cached).length).toBeGreaterThan(10);
    expect(measuredTextIncludes(cachedMeasurer.texts, "BEGIN_SENTINEL")).toBe(
      false
    );
  });

  it("reuses previous long textblock lines when deleting at the tail", () => {
    const editor = createEditorWithParagraphs([`${createLongParagraphText()}Z`]);
    const cache = createQuireBlockShapeCache();
    const cachedMeasurer = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });

    const textEnd = getFirstParagraphTextEndPosition(editor);
    editor.dispatchTransaction(editor.state.pm.tr.delete(textEnd - 1, textEnd));

    cachedMeasurer.reset();
    const cached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });
    const uncached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: createCountingMeasurer().measurer
    });

    expect(serializeSnapshot(cached)).toEqual(serializeSnapshot(uncached));
    expect(getFirstTextFragments(cached).length).toBeGreaterThan(10);
    expect(measuredTextIncludes(cachedMeasurer.texts, "BEGIN_SENTINEL")).toBe(
      false
    );
  });

  it("reuses previous long textblock lines when inserting in the middle", () => {
    const editor = createEditorWithParagraphs([createLongParagraphText()]);
    const cache = createQuireBlockShapeCache();
    const cachedMeasurer = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });

    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("A", getFirstParagraphTextPositionOf(editor, "segment-180"))
    );

    cachedMeasurer.reset();
    const cached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });
    const uncached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: createCountingMeasurer().measurer
    });

    expect(serializeSnapshot(cached)).toEqual(serializeSnapshot(uncached));
    expect(getFirstTextFragments(cached).length).toBeGreaterThan(10);
    expect(measuredTextIncludes(cachedMeasurer.texts, "BEGIN_SENTINEL")).toBe(
      false
    );
  });

  it("reuses previous long textblock lines when deleting in the middle", () => {
    const editor = createEditorWithParagraphs([createLongParagraphText()]);
    const cache = createQuireBlockShapeCache();
    const cachedMeasurer = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });

    const deleteFrom = getFirstParagraphTextPositionOf(editor, "segment-180");
    editor.dispatchTransaction(editor.state.pm.tr.delete(deleteFrom, deleteFrom + 1));

    cachedMeasurer.reset();
    const cached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });
    const uncached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: createCountingMeasurer().measurer
    });

    expect(serializeSnapshot(cached)).toEqual(serializeSnapshot(uncached));
    expect(getFirstTextFragments(cached).length).toBeGreaterThan(10);
    expect(measuredTextIncludes(cachedMeasurer.texts, "BEGIN_SENTINEL")).toBe(
      false
    );
  });

  it("keeps local reuse transparent inside an overlong word", () => {
    const editor = createEditorWithParagraphs([createLongUnbrokenParagraphText()]);
    const cache = createQuireBlockShapeCache();
    const cachedMeasurer = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { ...viewportRect, width: 180 },
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });

    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("Z", getFirstParagraphTextPositionOf(editor, "aaaaaaaaaa"))
    );

    const cached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { ...viewportRect, width: 180 },
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });
    const uncached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { ...viewportRect, width: 180 },
      textMeasurer: createCountingMeasurer().measurer
    });

    expect(serializeSnapshot(cached)).toEqual(serializeSnapshot(uncached));
  });

  it("keeps tail reuse transparent for long textblocks with fl ligatures", () => {
    const editor = createEditorWithParagraphs([createLongLigatureParagraphText()]);
    const cache = createQuireBlockShapeCache();
    const cachedMeasurer = createLigatureTextMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer,
      blockShapeCache: cache
    });

    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("A", getFirstParagraphTextEndPosition(editor))
    );

    const cached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer,
      blockShapeCache: cache
    });
    const uncached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: createLigatureTextMeasurer()
    });

    expect(JSON.stringify(serializeSnapshot(cached)))
      .toBe(JSON.stringify(serializeSnapshot(uncached)));
    expect(getFirstTextFragments(cached).some((fragment) =>
      fragment.text.includes("flowing")
    )).toBe(true);
  });

  it("re-measures when the content width changes (width is part of the key)", () => {
    const editor = createEditorWithParagraphs(["AAAA", "BBBB"]);
    const cache = createQuireBlockShapeCache();
    const counter = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });

    counter.reset();
    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { ...viewportRect, width: 400 },
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });

    expect(counter.calls).toBeGreaterThan(0);
    expect(counter.texts.some((text) => text.includes("A"))).toBe(true);
  });

  it("drops cached shapes when the measurer instance changes", () => {
    const editor = createEditorWithParagraphs(["AAAA", "BBBB"]);
    const cache = createQuireBlockShapeCache();
    const first = createCountingMeasurer();
    const second = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: first.measurer,
      blockShapeCache: cache
    });

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: second.measurer,
      blockShapeCache: cache
    });

    // The new measurer reshapes everything rather than serving the first
    // measurer's stale shapes.
    expect(second.calls).toBeGreaterThan(0);
    expect(second.texts.some((text) => text.includes("A"))).toBe(true);
  });

  it("drops cached shapes when the measurer version changes (font/shaper upgrade)", () => {
    const editor = createEditorWithParagraphs(["AAAA", "BBBB"]);
    const cache = createQuireBlockShapeCache();
    const counter = createCountingMeasurer();

    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });

    // Same measurer instance, but its backing (and output) changed — e.g. the
    // playground swappable measurer upgrading from the browser measurer to
    // HarfBuzz once fonts load. The cache must reshape, not serve stale shapes.
    counter.reset();
    counter.bumpVersion();
    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: counter.measurer,
      blockShapeCache: cache
    });

    expect(counter.calls).toBeGreaterThan(0);
    expect(counter.texts.some((text) => text.includes("A"))).toBe(true);
  });

  it("remaps cached fragment ranges when a block shifts position (insert above)", () => {
    const editor = createEditorWithParagraphs(["AAAA", "BBBB", "CCCC"]);
    const cache = createQuireBlockShapeCache();
    const cachedMeasurer = createCountingMeasurer();

    // First build caches each block's fragments at its initial document position.
    buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });

    // Insert into the first block: blocks 2 and 3 keep their node identity (cache
    // hit) but shift two positions down in the document.
    editor.dispatchTransaction(editor.state.pm.tr.insertText("ZZ", 1));

    const cached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });
    const uncached = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: createCountingMeasurer().measurer
    });

    // The cached path must match the uncached path: shifted blocks' fragment ranges
    // (and caret stops) must be remapped, not served with stale absolute positions.
    expect(serializeSnapshot(cached)).toEqual(serializeSnapshot(uncached));
    expect(cache.getTopLevelBlockInput(
      editor.state.doc.child(2),
      2,
      editor.state.doc.child(0).nodeSize + editor.state.doc.child(1).nodeSize,
      viewportRect.width,
      undefined,
      undefined
    )?.range).toEqual(cached.root.children?.[2]?.range);
  });

  it("materializes shifted textblock input fragments lazily", () => {
    const editor = createEditorWithParagraphs(["AAAA"]);
    const cache = createQuireBlockShapeCache();
    const node = editor.state.doc.child(0);
    const input = createCachedTextblockInput("paragraph-0", "AAAA", 0);
    const fragments = input.textFragments;
    let fragmentReads = 0;

    Object.defineProperty(input, "textFragments", {
      enumerable: true,
      configurable: true,
      get() {
        fragmentReads += 1;
        return fragments;
      }
    });

    cache.setTextblockInput(node, viewportRect.width, input.id, 1, input);
    const shifted = cache.getTextblockInput(
      node,
      viewportRect.width,
      input.id,
      3
    );

    expect(shifted?.range).toEqual({ from: 2, to: 8 });
    expect(shifted?.layoutSignature).toBe(input.layoutSignature);
    expect(Object.getOwnPropertyDescriptor(shifted, "textFragments")?.get)
      .toBeTypeOf("function");
    expect(fragmentReads).toBe(0);
    expect(shifted?.textFragments?.[0]?.range).toEqual({ from: 3, to: 7 });
    expect(shifted?.textFragments?.[0]?.caretStops).toEqual([
      { position: { pos: 3, bias: 1 }, localX: 0 },
      { position: { pos: 7, bias: -1 }, localX: 40 }
    ]);
    expect(fragmentReads).toBe(1);
  });

  it("reuses shifted top-level textblock inputs from the previous collection pass", () => {
    const editor = createEditorWithParagraphs(["AAAA"]);
    const cache = createQuireBlockShapeCache();
    const node = editor.state.doc.child(0);
    const input = createCachedTextblockInput("paragraph-0", "AAAA", 0);
    const fragments = input.textFragments;
    let fragmentReads = 0;

    Object.defineProperty(input, "textFragments", {
      enumerable: true,
      configurable: true,
      get() {
        fragmentReads += 1;
        return fragments;
      }
    });

    cache.setTopLevelBlockInputs(
      viewportRect.width,
      undefined,
      undefined,
      [node],
      [input.range.from],
      [input]
    );
    const shifted = cache.getTopLevelBlockInput(
      node,
      0,
      2,
      viewportRect.width,
      undefined,
      undefined
    );

    expect(shifted?.range).toEqual({ from: 2, to: 8 });
    expect(shifted?.layoutSignature).toBe(input.layoutSignature);
    expect(Object.getOwnPropertyDescriptor(shifted, "textFragments")?.get)
      .toBeTypeOf("function");
    expect(fragmentReads).toBe(0);
    expect(shifted?.textFragments?.[0]?.range).toEqual({ from: 3, to: 7 });
    expect(fragmentReads).toBe(1);
  });

  it("does not shifted-reuse structured top-level block inputs", () => {
    const editor = createEditorWithParagraphs(["AAAA"]);
    const cache = createQuireBlockShapeCache();
    const node = editor.state.doc.child(0);
    const input: QuireBlockLayoutInput = {
      id: "container-0",
      range: { from: 0, to: 6 },
      children: []
    };

    cache.setTopLevelBlockInputs(
      viewportRect.width,
      undefined,
      undefined,
      [node],
      [input.range.from],
      [input]
    );

    expect(cache.getTopLevelBlockInput(
      node,
      0,
      2,
      viewportRect.width,
      undefined,
      undefined
    )).toBeUndefined();
  });

  it("does not exact-reuse containers with snapshot-bound provider descendants", () => {
    const editor = createEditorWithParagraphs(["AAAA"]);
    const cache = createQuireBlockShapeCache();
    const node = editor.state.doc.child(0);
    const input: QuireBlockLayoutInput = {
      id: "word-section-0",
      range: { from: 0, to: 8 },
      children: [{
        id: "provider-child-0",
        range: { from: 1, to: 7 },
        layoutProvider: {} as NonNullable<QuireBlockLayoutInput["layoutProvider"]>
      }]
    };

    cache.setTopLevelBlockInputs(
      viewportRect.width,
      undefined,
      undefined,
      [node],
      [input.range.from],
      [input]
    );

    expect(cache.getTopLevelBlockInput(
      node,
      0,
      0,
      viewportRect.width,
      undefined,
      undefined
    )).toBeUndefined();
  });

  it("produces a snapshot identical to the uncached path (transparency)", () => {
    const editor = createEditorWithParagraphs(["AAAA", "Hello world wraps here", ""]);
    const cache = createQuireBlockShapeCache();
    const cachedMeasurer = createCountingMeasurer();
    const plainMeasurer = createCountingMeasurer();

    const withoutCache = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: plainMeasurer.measurer
    });
    const withCache = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect,
      textMeasurer: cachedMeasurer.measurer,
      blockShapeCache: cache
    });

    expect(serializeSnapshot(withCache)).toEqual(serializeSnapshot(withoutCache));
  });
});

/** Measurer that records every measured text for call-count assertions. */
interface CountingMeasurer {
  /** Wrapped measurer passed into the layout snapshot build. */
  readonly measurer: QuireTextMeasurer;
  /** Number of measureText calls since the last reset. */
  readonly calls: number;
  /** Texts passed to measureText since the last reset. */
  readonly texts: readonly string[];
  /** Resets the call count and measured-text log. */
  reset(): void;
  /** Increments the measurer version, simulating a font/shaper upgrade. */
  bumpVersion(): void;
}

/**
 * Creates a deterministic measurer that counts and records measureText calls.
 *
 * @returns A counting measurer with reset support.
 */
function createCountingMeasurer(): CountingMeasurer {
  let calls = 0;
  let texts: string[] = [];
  let version = 0;
  const measurer: QuireTextMeasurer = {
    /**
     * Measures text with a fixed-width font while recording the call.
     *
     * @param text - Text value to measure.
     * @returns Fixed-width metrics for the text.
     */
    measureText(text: string) {
      calls += 1;
      texts.push(text);
      return { width: Array.from(text).length * 10 };
    },
    get version() {
      return version;
    }
  };

  return {
    measurer,
    get calls() {
      return calls;
    },
    get texts() {
      return texts;
    },
    reset() {
      calls = 0;
      texts = [];
    },
    bumpVersion() {
      version += 1;
    }
  };
}

/**
 * Creates a deterministic shaper that models the `fl` ligature.
 *
 * @returns Text measurer whose `shapeRun` absorbs `l` into the previous `f`.
 */
function createLigatureTextMeasurer(): QuireTextMeasurer {
  return {
    /**
     * Measures text with fixed-width fallback metrics.
     *
     * @param text - Text value to measure.
     * @returns Fixed-width metrics for the text.
     */
    measureText(text: string) {
      return { width: Array.from(text).length * 10 };
    },
    /**
     * Shapes `fl` as one glyph cluster while keeping other characters simple.
     *
     * @param text - Text value to shape.
     * @returns Cluster and glyph placements for the source text.
     */
    shapeRun(text: string) {
      const clusters: QuireShapedTextCluster[] = [];
      const glyphs: QuireShapedGlyphPlacement[] = [];
      let offset = 0;
      let x = 0;

      while (offset < text.length) {
        const ligature = text.startsWith("fl", offset);
        const length = ligature ? 2 : 1;
        const advance = ligature ? 20 : 10;

        clusters.push({ from: offset, to: offset + length, x, advance, rtl: false });
        glyphs.push({
          glyphId: ligature ? 64258 : text.charCodeAt(offset),
          sourceCluster: offset,
          x,
          y: 0,
          xAdvance: advance,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        });
        offset += length;
        x += advance;
      }

      return {
        clusters,
        width: x,
        ascent: 0,
        descent: 0,
        glyphCoverage: "complete" as const,
        glyphs
      };
    }
  };
}

/**
 * Builds a single very long plain-text paragraph for tail-edit cache tests.
 *
 * @returns Long paragraph text with an easy-to-detect prefix sentinel.
 */
function createLongParagraphText(): string {
  const segments: string[] = [];
  for (let index = 0; index < 240; index += 1) {
    segments.push(`segment-${index}`);
  }

  return [
    "BEGIN_SENTINEL",
    segments.join(" "),
    "END_SENTINEL"
  ].join(" ");
}

/**
 * Builds a long paragraph with repeated `fl` ligatures.
 *
 * @returns Long text that repeatedly exercises `flowing` ligature layout.
 */
function createLongLigatureParagraphText(): string {
  const segments: string[] = [];
  for (let index = 0; index < 240; index += 1) {
    segments.push(`Row 44 B oversized cell segment ${index} keeps flowing through the same table row.`);
  }

  return segments.join(" ");
}

/**
 * Creates one cached local textblock input for shape-cache range-shift tests.
 *
 * @param id - Stable block input id.
 * @param text - Text content represented by the input.
 * @param from - Document start position for the block input.
 * @returns Cacheable textblock input with a precomputed layout signature.
 */
function createCachedTextblockInput(
  id: string,
  text: string,
  from: number
): QuireBlockLayoutInput {
  return {
    id,
    range: { from, to: from + text.length + 2 },
    minHeight: 24,
    layoutSignature: `text:${text}`,
    textFragments: [
      {
        id: `${id}:text-0`,
        text,
        range: { from: from + 1, to: from + text.length + 1 },
        rect: { x: 0, y: 0, width: text.length * 10, height: 24 },
        font: "16px sans-serif",
        lineHeight: 24,
        baseline: 18,
        caretStops: [
          { position: { pos: from + 1, bias: 1 }, localX: 0 },
          { position: { pos: from + text.length + 1, bias: -1 }, localX: text.length * 10 }
        ]
      }
    ]
  };
}

/**
 * Builds a paragraph with one word that must break across several lines.
 *
 * @returns Long unbroken paragraph text for conservative restart tests.
 */
function createLongUnbrokenParagraphText(): string {
  return "prefix " + "a".repeat(240) + " suffix";
}

/**
 * Finds the document position just after the first paragraph's text content.
 *
 * @param editor - Editor whose document starts with the paragraph under test.
 * @returns Absolute document position at the first paragraph text end.
 */
function getFirstParagraphTextEndPosition(editor: QuireEditor): number {
  return editor.state.doc.child(0).nodeSize - 1;
}

/**
 * Finds the document position of text inside the first paragraph.
 *
 * @param editor - Editor whose document starts with the paragraph under test.
 * @param text - Text to find inside the first paragraph.
 * @returns Absolute document position where the text starts.
 */
function getFirstParagraphTextPositionOf(editor: QuireEditor, text: string): number {
  const paragraphText = editor.state.doc.child(0).textContent;
  const offset = paragraphText.indexOf(text);

  if (offset < 0) {
    throw new Error(`Missing text in first paragraph: ${text}`);
  }

  return 1 + offset;
}

/**
 * Reads the first block's text fragments from a snapshot.
 *
 * @param snapshot - Layout snapshot whose first child is the paragraph under test.
 * @returns Text fragments for the first layout block.
 */
function getFirstTextFragments(
  snapshot: QuireLayoutSnapshot
): readonly QuireTextFragment[] {
  return snapshot.root.children?.[0]?.textFragments ?? [];
}

/**
 * Checks whether any measured text contains a target substring.
 *
 * @param texts - Measured text values captured by the counting measurer.
 * @param target - Substring to find.
 * @returns True when at least one measured text contains the target.
 */
function measuredTextIncludes(texts: readonly string[], target: string): boolean {
  for (const text of texts) {
    if (text.includes(target)) {
      return true;
    }
  }

  return false;
}

/**
 * Serializes a snapshot's layout tree for structural comparison.
 *
 * @param snapshot - Layout snapshot to serialize.
 * @returns Plain serializable representation of the snapshot geometry.
 */
function serializeSnapshot(snapshot: QuireLayoutSnapshot): unknown {
  return {
    documentRect: snapshot.documentRect,
    root: serializeNode(snapshot.root)
  };
}

/**
 * Serializes a layout node and its descendants for structural comparison.
 *
 * @param node - Layout node to serialize.
 * @returns Plain serializable representation of the node geometry and fragments.
 */
function serializeNode(node: QuireLayoutNode): unknown {
  return {
    id: node.id,
    kind: node.kind,
    range: node.range,
    rect: node.rect,
    textFragments: node.textFragments,
    children: node.children?.map(serializeNode)
  };
}

/**
 * Creates an editor whose document contains one paragraph for each text value.
 *
 * @param texts - Paragraph text content values.
 * @returns Editor containing the requested paragraph document.
 */
function createEditorWithParagraphs(texts: readonly string[]): QuireEditor {
  const editor = createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })]
  });
  const paragraphType = editor.state.schema.nodes.paragraph;
  const docType = editor.state.schema.nodes.doc;

  if (!paragraphType || !docType) {
    throw new Error("Starter kit schema did not provide doc and paragraph nodes.");
  }

  editor.setContent(
    docType.create(
      null,
      texts.map((text) =>
        paragraphType.create(
          null,
          text.length === 0 ? null : editor.state.schema.text(text)
        )
      )
    )
  );

  return editor;
}
