import { createEditor, type QuireEditor } from "@quirekit/core";
import type { QuireRect } from "@quirekit/renderer";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { buildQuireBodyMeasuredContainer } from "../engine/pagination/measured-source";
import type { QuireLayoutBox, QuireLayoutContainer } from "../engine";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import { buildEngineLayoutSnapshot } from "../../editor-layout/snapshot/engine";
import { createQuireRetainedBlockLayoutGraph } from "../retained-block";
import { createQuireBlockShapeCache } from "./block";
import { createQuireMeasuredSourceCache } from "./measured-source";

const viewportRect: QuireRect = { x: 0, y: 0, width: 1000, height: 600 };
const pageGeometry: QuirePageGeometry = {
  pageRect: { x: 0, y: 0, width: 1000, height: 600 },
  bodyRect: { x: 0, y: 0, width: 1000, height: 560 },
  pageGap: 40
};

describe("CanvasMeasuredSourceCache", () => {
  it("reuses measured pagination items for the same layout box", () => {
    const box = createTextBox("paragraph-0", 0);
    const cache = createQuireMeasuredSourceCache();

    const first = buildQuireBodyMeasuredContainer([box], cache);
    expect(cache.snapshot()).toEqual({
      hits: 0,
      exactHits: 0,
      shiftedTextHits: 0,
      shiftedLeafHits: 0,
      misses: 1,
      stores: 1,
      textPrefixHits: 0,
      textPrefixMisses: 1,
      textPrefixReusedItems: 0,
      bodyPrefixHits: 0,
      bodyPrefixMisses: 0,
      bodyPrefixReusedItems: 0,
      bodySuffixHits: 0,
      bodySuffixMisses: 0,
      bodySuffixReusedItems: 0
    });

    const second = buildQuireBodyMeasuredContainer([box], cache);
    expect(second).toEqual(first);
    expect(second.items[0]).toBe(first.items[0]);
    expect(cache.snapshot()).toEqual({
      hits: 1,
      exactHits: 1,
      shiftedTextHits: 0,
      shiftedLeafHits: 0,
      misses: 1,
      stores: 1,
      textPrefixHits: 0,
      textPrefixMisses: 1,
      textPrefixReusedItems: 0,
      bodyPrefixHits: 0,
      bodyPrefixMisses: 0,
      bodyPrefixReusedItems: 0,
      bodySuffixHits: 0,
      bodySuffixMisses: 0,
      bodySuffixReusedItems: 0
    });
  });

  it("misses for an equivalent but new layout box object", () => {
    const cache = createQuireMeasuredSourceCache();

    buildQuireBodyMeasuredContainer([createTextBox("paragraph-0", 0)], cache);
    buildQuireBodyMeasuredContainer([createTextBox("paragraph-0", 0)], cache);

    expect(cache.snapshot()).toEqual({
      hits: 0,
      exactHits: 0,
      shiftedTextHits: 0,
      shiftedLeafHits: 0,
      misses: 2,
      stores: 2,
      textPrefixHits: 1,
      textPrefixMisses: 1,
      textPrefixReusedItems: 1,
      bodyPrefixHits: 0,
      bodyPrefixMisses: 0,
      bodyPrefixReusedItems: 0,
      bodySuffixHits: 0,
      bodySuffixMisses: 0,
      bodySuffixReusedItems: 0
    });
  });

  it("hits when snapshot pagination receives retained layout boxes", () => {
    const editor = createEditorWithParagraphs(["AAAA", "BBBB", "CCCC"]);
    const blockShapeCache = createQuireBlockShapeCache();
    const retainedBlockGraph = createQuireRetainedBlockLayoutGraph();
    const measuredSourceCache = createQuireMeasuredSourceCache();

    buildEngineLayoutSnapshot({
      state: editor.state,
      viewportRect,
      pageGeometry,
      blockShapeCache,
      measuredSourceCache
    }, retainedBlockGraph);
    const firstCounters = measuredSourceCache.snapshot();
    expect(firstCounters.stores).toBeGreaterThan(0);

    buildEngineLayoutSnapshot({
      state: editor.state,
      viewportRect,
      pageGeometry,
      blockShapeCache,
      measuredSourceCache
    }, retainedBlockGraph);
    const secondCounters = measuredSourceCache.snapshot();

    expect(secondCounters.hits).toBeGreaterThan(firstCounters.hits);
    expect(secondCounters.stores).toBe(firstCounters.stores);
  });

  it("reuses shifted measured items for estimated leaf blocks", () => {
    const cache = createQuireMeasuredSourceCache();
    const firstBox = createEstimatedBox("paragraph-80", {
      range: { from: 100, to: 120 },
      y: 2000
    });
    const shiftedBox = createEstimatedBox("paragraph-80", {
      range: { from: 104, to: 124 },
      y: 2016
    });

    const first = buildQuireBodyMeasuredContainer([firstBox], cache);
    const shifted = buildQuireBodyMeasuredContainer([shiftedBox], cache);

    expect(shifted.items[0]).not.toBe(first.items[0]);
    expect(shifted.items[0]).toMatchObject({
      id: "paragraph-80",
      range: { from: 104, to: 124 },
      flowTop: 2016,
      flowBottom: 2088,
      height: 72
    });
    expect(cache.snapshot()).toEqual({
      hits: 1,
      exactHits: 0,
      shiftedTextHits: 0,
      shiftedLeafHits: 1,
      misses: 1,
      stores: 1,
      textPrefixHits: 0,
      textPrefixMisses: 0,
      textPrefixReusedItems: 0,
      bodyPrefixHits: 0,
      bodyPrefixMisses: 0,
      bodyPrefixReusedItems: 0,
      bodySuffixHits: 0,
      bodySuffixMisses: 0,
      bodySuffixReusedItems: 0
    });
  });

  it("reuses a body measured-source prefix before the dirty range", () => {
    const cache = createQuireMeasuredSourceCache();
    const prefixA = createEstimatedBox("paragraph-0", {
      range: { from: 0, to: 4 },
      y: 0
    });
    const prefixB = createEstimatedBox("paragraph-1", {
      range: { from: 4, to: 8 },
      y: 96
    });
    const active = createEstimatedBox("paragraph-2", {
      range: { from: 8, to: 12 },
      y: 192
    });
    const suffix = createEstimatedBox("paragraph-3", {
      range: { from: 12, to: 16 },
      y: 288
    });

    const first = buildQuireBodyMeasuredContainer(
      [prefixA, prefixB, active, suffix],
      cache
    );
    const second = buildQuireBodyMeasuredContainer(
      [
        prefixA,
        prefixB,
        createEstimatedBox("paragraph-2", {
          range: { from: 8, to: 13 },
          y: 192
        }),
        suffix
      ],
      cache,
      { from: 10, to: 11 }
    );

    expect(second.items[0]).toBe(first.items[0]);
    expect(second.items[1]).toBe(first.items[1]);
    expect(cache.snapshot()).toMatchObject({
      bodyPrefixHits: 1,
      bodyPrefixMisses: 0,
      bodyPrefixReusedItems: 2
    });
  });

  it("reuses a shifted body measured-source suffix after the dirty range", () => {
    const cache = createQuireMeasuredSourceCache();
    const prefix = createEstimatedBox("paragraph-0", {
      range: { from: 0, to: 4 },
      y: 0
    });
    const active = createEstimatedBox("paragraph-1", {
      range: { from: 4, to: 8 },
      y: 96
    });
    const suffixA = createEstimatedBox("paragraph-2", {
      range: { from: 8, to: 12 },
      y: 192
    });
    const suffixB = createEstimatedBox("paragraph-3", {
      range: { from: 12, to: 16 },
      y: 288
    });
    const shiftedSuffixA = createEstimatedBox("paragraph-2", {
      range: { from: 9, to: 13 },
      y: 192
    });
    const shiftedSuffixB = createEstimatedBox("paragraph-3", {
      range: { from: 13, to: 17 },
      y: 288
    });
    const secondBoxes = [
      prefix,
      createEstimatedBox("paragraph-1", {
        range: { from: 4, to: 9 },
        y: 96
      }),
      shiftedSuffixA,
      shiftedSuffixB
    ];
    const expectedSecond = buildQuireBodyMeasuredContainer(secondBoxes);

    buildQuireBodyMeasuredContainer([prefix, active, suffixA, suffixB], cache);
    const second = buildQuireBodyMeasuredContainer(secondBoxes, cache, {
      from: 6,
      to: 7
    });

    expect(second).toEqual(expectedSecond);
    expect(second.items[2]).toMatchObject({
      id: "paragraph-2",
      range: { from: 9, to: 13 }
    });
    expect(second.items[3]).toMatchObject({
      id: "paragraph-3",
      range: { from: 13, to: 17 }
    });
    expect(cache.snapshot()).toMatchObject({
      bodyPrefixHits: 1,
      bodyPrefixReusedItems: 1,
      bodySuffixHits: 1,
      bodySuffixMisses: 0,
      bodySuffixReusedItems: 2
    });
  });

  it("reuses shifted measured sources for unchanged visible-window paragraphs after an earlier insert", () => {
    const editor = createEditorWithParagraphs(
      Array.from(
        { length: 160 },
        (_, index) =>
          Array.from(
            { length: 6 },
            (_unused, segmentIndex) =>
              `Paragraph ${index} segment ${segmentIndex} keeps the same measured text after earlier edits.`
          ).join(" ")
      )
    );
    const blockShapeCache = createQuireBlockShapeCache();
    const retainedBlockGraph = createQuireRetainedBlockLayoutGraph();
    const measuredSourceCache = createQuireMeasuredSourceCache();

    buildEngineLayoutSnapshot({
      state: editor.state,
      viewportRect,
      pageGeometry,
      blockShapeCache,
      measuredSourceCache,
      maxBlocks: 37
    }, retainedBlockGraph);
    const firstCounters = measuredSourceCache.snapshot();

    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("A", findTextPosition(editor, "Paragraph 3 segment 2"))
    );
    buildEngineLayoutSnapshot({
      state: editor.state,
      viewportRect,
      pageGeometry,
      blockShapeCache,
      measuredSourceCache,
      maxBlocks: 37
    }, retainedBlockGraph);
    const secondCounters = measuredSourceCache.snapshot();

    expect(secondCounters.textPrefixHits).toBeGreaterThan(firstCounters.textPrefixHits);
    expect(secondCounters.textPrefixReusedItems).toBeGreaterThan(
      firstCounters.textPrefixReusedItems
    );
  });

  it("reuses measured text-line prefix items for a new tail-edited long text box", () => {
    const cache = createQuireMeasuredSourceCache();
    const firstBox = createTextBoxWithFragments("paragraph-0", { from: 0, to: 31 }, [
      createLineFragment("paragraph-0", 0, 1, 11, 0, "AAAAAAAAAA"),
      createLineFragment("paragraph-0", 1, 11, 21, 24, "BBBBBBBBBB"),
      createLineFragment("paragraph-0", 2, 21, 31, 48, "CCCCCCCCCC")
    ]);
    const secondBox = createTextBoxWithFragments("paragraph-0", { from: 0, to: 32 }, [
      createLineFragment("paragraph-0", 0, 1, 11, 0, "AAAAAAAAAA"),
      createLineFragment("paragraph-0", 1, 11, 21, 24, "BBBBBBBBBB"),
      createLineFragment("paragraph-0", 2, 21, 32, 48, "CCCCCCCCCCC")
    ]);
    const expectedSecond = buildQuireBodyMeasuredContainer([secondBox]);

    const first = buildQuireBodyMeasuredContainer([firstBox], cache);
    const second = buildQuireBodyMeasuredContainer([secondBox], cache);

    expect(second).toEqual(expectedSecond);
    expect(second.items[0]).toBe(first.items[0]);
    expect(second.items[1]).toBe(first.items[1]);
    expect(second.items[2]).not.toBe(first.items[2]);
    expect(cache.snapshot()).toMatchObject({
      textPrefixHits: 1,
      textPrefixReusedItems: 2
    });
  });

  it("reuses shifted measured text-line items for unchanged text after an earlier edit", () => {
    const cache = createQuireMeasuredSourceCache();
    const firstBox = createTextBoxWithFragments("paragraph-1", { from: 40, to: 61 }, [
      createLineFragment("paragraph-1", 0, 41, 51, 0, "AAAAAAAAAA"),
      createLineFragment("paragraph-1", 1, 51, 60, 24, "BBBBBBBBB")
    ]);
    const secondBox = createTextBoxWithFragments("paragraph-1", { from: 45, to: 66 }, [
      createLineFragment("paragraph-1", 0, 46, 56, 0, "AAAAAAAAAA"),
      createLineFragment("paragraph-1", 1, 56, 65, 24, "BBBBBBBBB")
    ]);
    const expectedSecond = buildQuireBodyMeasuredContainer([secondBox]);

    const first = buildQuireBodyMeasuredContainer([firstBox], cache);
    const second = buildQuireBodyMeasuredContainer([secondBox], cache);

    expect(second).toEqual(expectedSecond);
    expect(second.items).toHaveLength(first.items.length);
    expect(second.items[0]).not.toBe(first.items[0]);
    expect(second.items[0]?.range).toEqual({ from: 45, to: 56 });
    expect(
      second.items[0]?.sourceFragments?.[0]?.range
    ).toEqual({ from: 46, to: 56 });
    expect(second.items[1]?.range).toEqual({ from: 56, to: 66 });
    expect(
      second.items[1]?.sourceFragments?.[0]?.range
    ).toEqual({ from: 56, to: 65 });
    expect(cache.snapshot()).toMatchObject({
      textPrefixHits: 1,
      textPrefixMisses: 1,
      textPrefixReusedItems: 2
    });
  });

  it("reuses signature-shifted text items without reading current fragments", () => {
    const cache = createQuireMeasuredSourceCache();
    const firstBox = createTextBoxWithFragments(
      "paragraph-1",
      { from: 40, to: 61 },
      [
        createLineFragment("paragraph-1", 0, 41, 51, 0, "AAAAAAAAAA"),
        createLineFragment("paragraph-1", 1, 51, 60, 24, "BBBBBBBBB")
      ],
      "same-lines"
    );
    const expectedSecond = buildQuireBodyMeasuredContainer([
      createTextBoxWithFragments(
        "paragraph-1",
        { from: 45, to: 66 },
        [
          createLineFragment("paragraph-1", 0, 46, 56, 12, "AAAAAAAAAA"),
          createLineFragment("paragraph-1", 1, 56, 65, 36, "BBBBBBBBB")
        ],
        "same-lines"
      )
    ]);
    const shiftedBox = createSignatureOnlyTextBox(
      "paragraph-1",
      { from: 45, to: 66 },
      { x: 0, y: 12, width: 100, height: 48 },
      "same-lines"
    );

    buildQuireBodyMeasuredContainer([firstBox], cache);
    const shifted = buildQuireBodyMeasuredContainer([shiftedBox], cache);

    expect(shifted).toEqual(expectedSecond);
    expect(
      shifted.items[0]?.sourceFragments?.[0]?.range
    ).toEqual({ from: 46, to: 56 });
    expect(cache.snapshot()).toMatchObject({
      hits: 1,
      exactHits: 0,
      shiftedTextHits: 1,
      shiftedLeafHits: 0,
      misses: 1,
      stores: 1
    });
  });

  it("keeps shifted text reuse for every paragraph of a long section", () => {
    const cache = createQuireMeasuredSourceCache();
    const count = 5000;
    const section = (shift: number, signatureOnly: boolean): QuireLayoutContainer => ({
      id: "section",
      range: { from: 0, to: count * 8 + shift + 2 },
      rect: { x: 0, y: 0, width: 100, height: count * 24 },
      children: Array.from({ length: count }, (_, index) => {
        const range = { from: index * 8 + 1 + shift, to: index * 8 + 9 + shift };
        return signatureOnly
          ? createSignatureOnlyTextBox(`paragraph-${index}`, range, { x: 0, y: index * 24, width: 100, height: 24 }, "line")
          : createTextBoxWithFragments(`paragraph-${index}`, range, [
              createLineFragment(`paragraph-${index}`, 0, range.from + 1, range.to - 1, index * 24, "AAAAAA")
            ], "line");
      })
    });

    buildQuireBodyMeasuredContainer([section(0, false)], cache);
    // Every paragraph moved by one position. Reuse must cover the whole section,
    // not only the most recently stored few thousand paragraphs.
    buildQuireBodyMeasuredContainer([section(1, true)], cache);
    expect(cache.snapshot()).toMatchObject({ shiftedTextHits: count });
  });

  it("reuses measured text-line prefix items for a new locally edited long text box", () => {
    const cache = createQuireMeasuredSourceCache();
    const firstBox = createTextBoxWithFragments("paragraph-0", { from: 0, to: 41 }, [
      createLineFragment("paragraph-0", 0, 1, 11, 0, "AAAAAAAAAA"),
      createLineFragment("paragraph-0", 1, 11, 21, 24, "BBBBBBBBBB"),
      createLineFragment("paragraph-0", 2, 21, 31, 48, "CCCCCCCCCC"),
      createLineFragment("paragraph-0", 3, 31, 41, 72, "DDDDDDDDDD")
    ]);
    const secondBox = createTextBoxWithFragments("paragraph-0", { from: 0, to: 42 }, [
      createLineFragment("paragraph-0", 0, 1, 11, 0, "AAAAAAAAAA"),
      createLineFragment("paragraph-0", 1, 11, 21, 24, "BBBBBBBBBB"),
      createLineFragment("paragraph-0", 2, 21, 32, 48, "CCCCCCCCCCC"),
      createLineFragment("paragraph-0", 3, 32, 42, 72, "DDDDDDDDDD")
    ]);
    const expectedSecond = buildQuireBodyMeasuredContainer([secondBox]);

    const first = buildQuireBodyMeasuredContainer([firstBox], cache);
    const second = buildQuireBodyMeasuredContainer([secondBox], cache);

    expect(second).toEqual(expectedSecond);
    expect(second.items[0]).toBe(first.items[0]);
    expect(second.items[1]).toBe(first.items[1]);
    expect(second.items[2]).not.toBe(first.items[2]);
    expect(second.items[3]).not.toBe(first.items[3]);
    expect(cache.snapshot()).toMatchObject({
      textPrefixHits: 1,
      textPrefixReusedItems: 2
    });
  });

});

/**
 * Creates a text layout box with one local text line.
 *
 * @param id - Stable layout box id.
 * @param y - Box y coordinate.
 * @returns Layout box with one text fragment.
 */
function createTextBox(id: string, y: number): QuireLayoutBox {
  return {
    id,
    range: { from: 0, to: 6 },
    rect: { x: 0, y, width: 100, height: 24 },
    textFragments: [createFragment(id, y)]
  };
}

/**
 * Creates an estimated leaf layout box.
 *
 * @param id - Stable layout box id.
 * @param options - Document range and y coordinate for the box.
 * @returns Estimated leaf layout box.
 */
function createEstimatedBox(
  id: string,
  options: {
    /** Document range represented by the box. */
    readonly range: QuireLayoutBox["range"];
    /** Box y coordinate. */
    readonly y: number;
  }
): QuireLayoutBox {
  return {
    id,
    range: options.range,
    rect: { x: 0, y: options.y, width: 100, height: 72 }
  };
}

/**
 * Finds the absolute document position where a text snippet starts.
 *
 * @param editor - Editor whose current document should be scanned.
 * @param text - Text snippet to locate.
 * @returns Absolute document position of the snippet.
 */
function findTextPosition(editor: QuireEditor, text: string): number {
  let position: number | undefined;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || node.text === undefined) {
      return true;
    }
    const offset = node.text.indexOf(text);

    if (offset >= 0) {
      position = pos + offset;
      return false;
    }

    return true;
  });

  if (position === undefined) {
    throw new Error(`Could not find text snippet: ${text}`);
  }

  return position;
}

/**
 * Creates a text layout box from explicit line fragments.
 *
 * @param id - Stable layout box id.
 * @param range - Document range represented by the text box.
 * @param fragments - Text fragments to attach to the box.
 * @returns Layout box with the provided text fragments.
 */
function createTextBoxWithFragments(
  id: string,
  range: QuireLayoutBox["range"],
  fragments: readonly QuireTextFragment[],
  layoutSignature?: string | undefined
): QuireLayoutBox {
  const firstY = fragments[0]?.rect.y ?? 0;
  const last = fragments[fragments.length - 1];
  const bottom = last === undefined ? firstY : last.rect.y + last.lineHeight;

  return {
    id,
    range,
    rect: { x: 0, y: firstY, width: 100, height: Math.max(0, bottom - firstY) },
    ...(layoutSignature === undefined ? {} : { layoutSignature }),
    textFragments: fragments
  };
}

/**
 * Creates a signature-only text box whose fragments must not be opened.
 *
 * @param id - Stable layout box id.
 * @param range - Document range represented by the text box.
 * @param rect - Layout rectangle represented by the text box.
 * @param layoutSignature - Position-independent text layout signature.
 * @returns Layout box with a throwing text-fragment accessor.
 */
function createSignatureOnlyTextBox(
  id: string,
  range: QuireLayoutBox["range"],
  rect: QuireLayoutBox["rect"],
  layoutSignature: string
): QuireLayoutBox {
  const box: QuireLayoutBox = {
    id,
    range,
    rect,
    layoutSignature
  };

  Object.defineProperty(box, "textFragments", {
    enumerable: true,
    get() {
      throw new Error("Signature-shifted measured items should not read fragments.");
    }
  });

  return box;
}

/**
 * Creates a text fragment used by measured-source cache tests.
 *
 * @param id - Owning layout box id.
 * @param y - Fragment y coordinate.
 * @returns Text fragment sufficient for line grouping.
 */
function createFragment(id: string, y: number): QuireTextFragment {
  return {
    id: `${id}:text-0`,
    text: "Hello",
    range: { from: 1, to: 6 },
    rect: { x: 0, y, width: 50, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: y + 18,
    caretStops: []
  };
}

/**
 * Creates one line-shaped fragment with an explicit document range.
 *
 * @param id - Owning layout box id.
 * @param lineIndex - Visual line index used in the fragment id.
 * @param from - Start document position.
 * @param to - End document position.
 * @param y - Fragment y coordinate.
 * @param text - Text content carried by the fragment.
 * @returns Text fragment sufficient for measured-source prefix reuse tests.
 */
function createLineFragment(
  id: string,
  lineIndex: number,
  from: number,
  to: number,
  y: number,
  text: string
): QuireTextFragment {
  return {
    id: `${id}:text-${lineIndex}`,
    text,
    range: { from, to },
    rect: { x: 0, y, width: text.length * 8, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: y + 18,
    caretStops: []
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
