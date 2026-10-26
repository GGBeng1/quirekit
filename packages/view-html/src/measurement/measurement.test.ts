import { createEditor, getChangedRanges, Node as CoreNode, type QuireAnyExtension, type QuireEditor } from "@quirekit/core";
import { TextStyle } from "@quirekit/extension-text-style";
import { Decoration, DecorationSet } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createHtmlRetainedDocumentView, HtmlDomMappingGapError } from "../document";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlDomMeasurementProvider } from "./provider";

describe("retained HTML DOM measurement", () => {
  it("prefers the exact atomic owner over a neighboring browser caret", () => {
    const fixture = createMeasurementFixture({ type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "before" }] },
      { type: "horizontalRule" },
      { type: "paragraph", content: [{ type: "text", text: "after" }] }
    ] });
    const rule = fixture.view.nodeDOM(8)!;
    const next = fixture.provider.domAtPos(10);
    let elements = 0, carets = 0;
    (fixture.ownerDocument as FakeCaretDocument).elementFromPoint = () => { elements++; return rule as Element; };
    (fixture.ownerDocument as FakeCaretDocument).caretPositionFromPoint = () => { carets++; return { offsetNode: next.node, offset: next.offset, getClientRect: () => null }; };
    expect(fixture.provider.posAtClientPoint(40, 30)).toMatchObject({ pos: 8, inside: 8, nodeSelection: true, source: { range: { from: 8, to: 9 } } });
    expect(elements).toBe(1); expect(carets).toBe(0);
  });
  it("keeps nonselectable atoms on the browser's accepted text-caret path", () => {
    const atom = CoreNode.create({ name: "nonselectableAtom", group: "block", atom: true, selectable: false,
      /** @returns An inert element representing the fixture atom. */
      renderHTML() { return ["hr"]; }
    });
    const fixture = createMeasurementFixture({ type: "doc", content: [
      { type: "nonselectableAtom" }, { type: "paragraph", content: [{ type: "text", text: "after" }] }
    ] }, undefined, [atom]);
    const next = fixture.provider.domAtPos(2);
    const document = fixture.ownerDocument as FakeCaretDocument;
    document.elementFromPoint = () => fixture.view.nodeDOM(0) as Element;
    document.caretPositionFromPoint = () => ({ offsetNode: next.node, offset: next.offset, getClientRect: () => null });
    const measured = fixture.provider.posAtClientPoint(40, 30);
    expect(measured?.pos).toBe(2);
    expect(measured?.nodeSelection).toBeUndefined();
  });
  it("keeps empty code and structural fallback carets within one text line", () => {
    const fixture = createMeasurementFixture({ type: "doc", content: [{ type: "codeBlock" }, { type: "paragraph" }] });
    fixture.ownerDocument.createRange = (() => ({ setStart() {}, setEnd() {}, collapse() {}, getClientRects: () => [],
      getBoundingClientRect: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 })
    })) as unknown as typeof fixture.ownerDocument.createRange;
    const code = fixture.view.root.children[0]!.mount!;
    const content = (code.contentDOM ?? code.dom) as HTMLElement;
    content.getBoundingClientRect = () => ({ left: 100, right: 900, top: 80, bottom: 880, width: 800, height: 800, x: 100, y: 80, toJSON() {} });
    const caret = fixture.provider.coordsAtPos(1);
    expect(caret.left).toBe(100); expect(caret.top).toBeGreaterThanOrEqual(80);
    expect(caret.bottom - caret.top).toBeGreaterThan(10);
    expect(caret.bottom - caret.top).toBeLessThan(30);
    const boundary = fixture.provider.coordsAtPos(0);
    expect(boundary.bottom - boundary.top).toBeLessThan(30);
  });
  it("maps text and mark positions with explicit provenance", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "bold", marks: [{ type: "bold" }] }]
      }]
    });

    const point = fixture.provider.domAtPos(3);
    const position = fixture.provider.posAtDOM(point.node, point.offset);

    expect(fixture.view.descriptorById(point.descriptorId)?.kind).toBe("text");
    expect(point.source.sourceId).toBe("fixture:document");
    expect(point.rootId).toBe("fixture:root");
    expect(point.regionId).toBe("fixture:body");
    expect(position.pos).toBe(3);
    expect(position.descriptorId).toBe(point.descriptorId);
  });

  it("measures caret and selection ranges with descriptor-epoch caching", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "abcd" }] }]
    });
    let rangeReads = 0;
    const originalCreateRange = fixture.ownerDocument.createRange.bind(
      fixture.ownerDocument
    );
    fixture.ownerDocument.createRange = () => {
      rangeReads += 1;
      return originalCreateRange();
    };

    expect(fixture.provider.coordsAtPos(3)).toMatchObject({
      left: 16,
      right: 16,
      top: 0,
      bottom: 20
    });
    fixture.provider.coordsAtPos(3);
    expect(rangeReads).toBe(1);
    expect(fixture.provider.selectionRects({ from: 1, to: 4 })[0]).toMatchObject({
      left: 0,
      right: 24,
      top: 0,
      bottom: 20
    });
    fixture.provider.invalidate();
    fixture.provider.coordsAtPos(3);
    expect(rangeReads).toBe(3);
  });

  it("co-locates normal-view hidden-text carets with the preceding visible boundary", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "AB" },
          {
            type: "text",
            text: "SECRET",
            marks: [{ type: "textStyle", attrs: { hidden: true } }]
          },
          { type: "text", text: "CD" }
        ]
      }]
    });
    suppressHiddenRangeGeometry(fixture.ownerDocument);

    const rect = fixture.provider.coordsAtPos(6);

    expect(rect).toMatchObject({ left: 16, right: 16, top: 0, bottom: 20 });
    expect(fixture.view.descriptorById(rect.descriptorId)).toMatchObject({
      kind: "text",
      range: { from: 1, to: 3 }
    });
  });

  it("flattens only selected text in the same retained textblock without extra Range reads", () => {
    const fixture = createMeasurementFixture({ type: "doc", content: [
      { type: "paragraph", content: [
        { type: "text", text: "large", marks: [{ type: "textStyle", attrs: { fontSize: "24pt" } }] },
        { type: "text", text: "small" }
      ] },
      { type: "paragraph", content: [{ type: "text", text: "other" }] }
    ] });
    const boxes: Record<string, { left: number; right: number; top: number; bottom: number }> = {
      large: { left: 0, right: 40, top: 0, bottom: 30 },
      small: { left: 40, right: 70, top: 10, bottom: 24 },
      other: { left: 70, right: 100, top: 8, bottom: 25 }
    };
    fixture.ownerDocument.createRange = (() => {
      let text = "";
      return {
        setStart(node: Node) { text = node.textContent!; }, setEnd() {}, collapse() {},
        getClientRects: () => [boxes[text]!], getBoundingClientRect: () => boxes[text]!
      };
    }) as unknown as typeof fixture.ownerDocument.createRange;
    const range = { from: 1, to: fixture.editor.state.doc.content.size - 1 };
    const rects = fixture.provider.selectionRects(range);
    expect(rects.map(({ left, right, top, bottom }) => ({ left, right, top, bottom }))).toEqual([
      { left: 0, right: 40, top: 0, bottom: 30 },
      { left: 40, right: 70, top: 0, bottom: 30 },
      boxes.other
    ]);
    expect(new Set(rects.map(rect => rect.descriptorId)).size).toBe(3);
    expect(rects.every(rect => rect.source.sourceId === "fixture:document" && rect.rootId === "fixture:root")).toBe(true);
    expect(fixture.provider.getRangeReadCount()).toBe(3);
    expect(fixture.provider.selectionRects(range)).toEqual(rects);
    expect(fixture.provider.getRangeReadCount()).toBe(3);
    // Raw cached geometry remains character-sized for a different selection.
    expect(fixture.provider.selectionRects({ from: 6, to: 11 })[0]).toMatchObject(boxes.small!);
  });

  it("uses the following boundary for hidden text at paragraph start", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "SECRET",
            marks: [{ type: "textStyle", attrs: { hidden: true } }]
          },
          { type: "text", text: "CD" }
        ]
      }]
    });
    suppressHiddenRangeGeometry(fixture.ownerDocument);

    const rect = fixture.provider.coordsAtPos(4);

    expect(rect).toMatchObject({ left: 0, right: 0, top: 0, bottom: 20 });
    expect(fixture.view.descriptorById(rect.descriptorId)).toMatchObject({
      kind: "text",
      range: { from: 7, to: 9 }
    });
  });

  it("uses the retained paragraph edge when every text owner is hidden", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{
          type: "text",
          text: "SECRET",
          marks: [{ type: "textStyle", attrs: { hidden: true } }]
        }]
      }]
    });
    suppressHiddenRangeGeometry(fixture.ownerDocument);

    const rect = fixture.provider.coordsAtPos(4);

    expect(rect.left).toBe(rect.right);
    expect(fixture.view.descriptorById(rect.descriptorId)).toMatchObject({
      kind: "node",
      node: expect.objectContaining({ isTextblock: true })
    });
  });

  it("accepts empty block boundaries and rejects unowned browser candidates", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{ type: "paragraph" }]
    });
    const paragraph = fixture.view.root.children[0]?.mount?.contentDOM;
    if (!paragraph) {
      throw new RangeError("Expected retained empty paragraph content DOM.");
    }
    (fixture.ownerDocument as FakeCaretDocument).caretPositionFromPoint = () => ({
      offsetNode: paragraph,
      offset: 0,
      getClientRect: () => null
    });

    expect(fixture.provider.posAtClientPoint(4, 4)).toMatchObject({
      pos: 1,
      inside: 0,
      source: { sourceId: "fixture:document" }
    });

    const outside = fixture.ownerDocument.createTextNode("outside");
    (fixture.ownerDocument as FakeCaretDocument).caretPositionFromPoint = () => ({
      offsetNode: outside as unknown as Node,
      offset: 0,
      getClientRect: () => null
    });
    expect(fixture.provider.posAtClientPoint(4, 4)).toBeNull();
    expect(() => fixture.provider.posAtDOM(outside as unknown as Node, 0)).toThrow(
      HtmlDomMappingGapError
    );
  });

  it("uses an owned blank boundary when the browser caret candidate is rejected", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{ type: "paragraph" }]
    });
    const paragraph = fixture.view.root.children[0]?.mount?.contentDOM;
    if (!paragraph) {
      throw new RangeError("Expected retained empty paragraph content DOM.");
    }
    const outside = fixture.ownerDocument.createTextNode("outside");
    (fixture.ownerDocument as FakeCaretDocument).caretPositionFromPoint = () => ({
      offsetNode: outside as unknown as Node,
      offset: 0,
      getClientRect: () => null
    });
    (fixture.ownerDocument as FakeCaretDocument).elementFromPoint = () => (
      paragraph as unknown as Element
    );

    expect(fixture.provider.posAtClientPoint(4, 4)).toMatchObject({
      pos: 1,
      inside: 0,
      source: { sourceId: "fixture:document" }
    });
  });

  it.each(["modern", "legacy", "element"])("maps %s hits inside a widget to its live zero-width position", mode => {
    let position = 9, visible = true;
    const fixture = createMeasurementFixture({ type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "before" }] },
      { type: "paragraph", content: [{ type: "text", text: "after" }] }
    ] }, document => visible ? [Decoration.widget(position, () => {
      const button = document.createElement("button"), shape = document.createElement("span");
      shape.appendChild(document.createTextNode("1.")); button.appendChild(shape);
      return button as unknown as HTMLElement;
    }, { key: "marker", side: -1 })] : []);
    const widget = fixture.view.root.children[1]!.kind === "node" ? fixture.view.root.children[1]!.children[0]! : undefined;
    expect(widget?.kind).toBe("widget");
    const marker = widget!.mount!.dom;
    let node = marker;
    const document = fixture.ownerDocument as FakeCaretDocument;
    document.caretPositionFromPoint = () => mode === "modern" ? { offsetNode: node, offset: 0, getClientRect: () => null } : null;
    document.caretRangeFromPoint = () => mode === "legacy" ? { startContainer: node, startOffset: 0 } : null;
    document.elementFromPoint = () => (node.nodeType === 1 ? node : node.parentNode) as Element;
    for (const target of [marker, marker.childNodes[0]!, marker.childNodes[0]!.childNodes[0]!]) {
      node = target;
      expect(fixture.provider.posAtDOM(target, 0).pos).toBe(9);
      expect(fixture.provider.posAtClientPoint(4, 40)).toMatchObject({ pos: 9, descriptorId: widget!.id, source: { sourceId: "fixture:document" } });
    }
    const transaction = fixture.editor.state.pm.tr.insertText("!", 1);
    fixture.editor.dispatchTransaction(transaction); position = 10;
    fixture.view.update({ documentNode: fixture.editor.state.doc, mapping: transaction.mapping, changedRanges: getChangedRanges(transaction) });
    expect(fixture.provider.posAtClientPoint(4, 40)?.pos).toBe(10);
    expect(fixture.provider.getRangeReadCount()).toBe(0);
    visible = false;
    const removal = fixture.editor.state.pm.tr.insertText("!", 1);
    fixture.editor.dispatchTransaction(removal);
    fixture.view.update({ documentNode: fixture.editor.state.doc, mapping: removal.mapping, changedRanges: getChangedRanges(removal) });
    expect(fixture.provider.posAtClientPoint(4, 40)).toBeNull();
  });

  it("keeps selection rectangle provenance on each retained text owner", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "first" }] },
        { type: "paragraph", content: [{ type: "text", text: "second" }] }
      ]
    });

    const rects = fixture.provider.selectionRects({ from: 1, to: 13 });

    expect(rects).toHaveLength(2);
    expect(new Set(rects.map((rect) => rect.descriptorId)).size).toBe(2);
    expect(rects.every((rect) => (
      fixture.view.descriptorById(rect.descriptorId)?.kind === "text"
    ))).toBe(true);
  });

  it("rejects stale DOM owners after retained reconciliation", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "remove" }] }]
    });
    const stale = fixture.provider.domAtPos(3);
    const transaction = fixture.editor.state.pm.tr.delete(1, 7);
    fixture.editor.dispatchTransaction(transaction);
    fixture.view.update({
      documentNode: fixture.editor.state.pm.doc,
      mapping: transaction.mapping,
      changedRanges: getChangedRanges(transaction)
    });
    fixture.provider.invalidate();

    expect(() => fixture.provider.posAtDOM(stale.node, stale.offset)).toThrow(
      HtmlDomMappingGapError
    );
  });

  it("uses caretRangeFromPoint only when the modern browser candidate misses", () => {
    const fixture = createMeasurementFixture({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "fallback" }] }]
    });
    const point = fixture.provider.domAtPos(4);
    (fixture.ownerDocument as FakeCaretDocument).caretPositionFromPoint = () => null;
    (fixture.ownerDocument as FakeCaretDocument).caretRangeFromPoint = () => ({
      startContainer: point.node,
      startOffset: point.offset
    });

    expect(fixture.provider.posAtClientPoint(10, 10)?.pos).toBe(4);
  });
});

/** Measurement fixture owning one retained document and mounted surface. */
interface MeasurementFixture {
  /** Fake browser document with deterministic Range geometry. */
  readonly ownerDocument: FakeSvgMountDocument;
  /** Editor whose transactions update the retained fixture. */
  readonly editor: QuireEditor;
  /** Retained document facade under test. */
  readonly view: ReturnType<typeof createHtmlRetainedDocumentView>;
  /** Identity-preserving measurement provider under test. */
  readonly provider: ReturnType<typeof createHtmlDomMeasurementProvider>;
}

/**
 * Creates a retained semantic tree mounted under one fake HTML surface.
 *
 * @param content - ProseMirror JSON document content.
 * @param decorations - Current widget decorations for retained hit testing.
 * @param extensions - Additional fixture node contracts.
 * @returns Mounted retained measurement fixture.
 */
function createMeasurementFixture(
  content: object,
  decorations: (document: FakeSvgMountDocument) => readonly Decoration[] = () => [],
  extensions: readonly QuireAnyExtension[] = []
): MeasurementFixture {
  const editor = createEditor({
    extensions: [StarterKit, TextStyle, ...extensions],
    content: content as never
  });
  const ownerDocument = new FakeSvgMountDocument();
  const surface = ownerDocument.createElement("div") as unknown as HTMLElement;
  surface.setAttribute("width", "320");
  surface.setAttribute("height", "180");
  const view = createHtmlRetainedDocumentView({
    id: "fixture:document",
    documentNode: editor.state.doc,
    ownerDocument: ownerDocument as unknown as Document,
    source: { sourceId: "fixture:document" },
    nodeViewEnvironment: {
      view: {} as never,
      nodeViews: editor.extensionManager.nodeViews,
      markViews: editor.extensionManager.markViews,
      getDecorations: () => DecorationSet.create(editor.state.doc, [...decorations(ownerDocument)])
    }
  });
  const root = view.root.mount?.dom;
  if (!root) {
    throw new RangeError("Expected retained measurement root.");
  }
  surface.appendChild(root);
  const provider = createHtmlDomMeasurementProvider({
    documentView: view,
    ownerDocument: ownerDocument as unknown as Document,
    surface,
    rootId: "fixture:root",
    regionId: "fixture:body"
  });

  return { ownerDocument, editor, view, provider };
}

/**
 * Makes fake browser Ranges match display-none hidden text behavior.
 *
 * @param ownerDocument - Fake retained HTML document to instrument.
 */
function suppressHiddenRangeGeometry(ownerDocument: FakeSvgMountDocument): void {
  const createRange = ownerDocument.createRange.bind(ownerDocument);
  ownerDocument.createRange = () => {
    const range = createRange();
    const setStart = range.setStart.bind(range);
    const getClientRects = range.getClientRects.bind(range);
    const getBoundingClientRect = range.getBoundingClientRect.bind(range);
    let startNode: Node | undefined;
    range.setStart = (node, offset) => {
      startNode = node;
      setStart(node, offset);
    };
    range.getClientRects = () => isInsideHiddenText(startNode)
      ? [] as unknown as DOMRectList
      : getClientRects();
    range.getBoundingClientRect = () => isInsideHiddenText(startNode)
      ? emptyDomRect()
      : getBoundingClientRect();
    return range;
  };
}

/**
 * Reports whether a fake DOM point is wrapped by a hidden textStyle mark.
 *
 * @param node - Candidate fake retained DOM node.
 * @returns Whether an ancestor carries the hidden-text marker.
 */
function isInsideHiddenText(node: Node | undefined): boolean {
  for (let current = node; current; current = current.parentNode ?? undefined) {
    if (
      current.nodeType === 1 &&
      (current as Element).getAttribute("data-qk-hidden-text") === "true"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Creates a browser-like empty rectangle rejected by HTML geometry filtering.
 *
 * @returns Zero-area DOM rectangle.
 */
function emptyDomRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({})
  } as DOMRect;
}

/** Fake document extended with the browser caret API used by hit tests. */
type FakeCaretDocument = FakeSvgMountDocument & {
  /** Deterministic point-to-caret test hook. */
  caretPositionFromPoint: (
    x: number,
    y: number
  ) => {
    readonly offsetNode: Node;
    readonly offset: number;
    readonly getClientRect: () => null;
  } | null;
  /** Deterministic legacy WebKit point-to-caret hook. */
  caretRangeFromPoint: (
    x: number,
    y: number
  ) => { readonly startContainer: Node; readonly startOffset: number } | null;
  /** Deterministic element hit-test hook for retained blank boundaries. */
  elementFromPoint: (x: number, y: number) => Element | null;
};
