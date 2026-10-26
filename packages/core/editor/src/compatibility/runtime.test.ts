import {
  EditorState,
  Fragment,
  NodeSelection,
  Schema,
  Slice,
  TextSelection
} from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import {
  attrsEqual,
  decodeHtmlEntities,
  encodeHtmlEntities,
  getPreviousBlockSibling,
  getStyleProperty,
  isNodeViewSelected,
  isProseMirrorAddMarkStep,
  isProseMirrorAddNodeMarkStep,
  isProseMirrorAttrStep,
  isProseMirrorCellSelection,
  isProseMirrorDocAttrStep,
  isProseMirrorFragment,
  isProseMirrorNodeSelection,
  isProseMirrorRemoveMarkStep,
  isProseMirrorRemoveNodeMarkStep,
  isProseMirrorReplaceAroundStep,
  isProseMirrorReplaceStep,
  isProseMirrorSlice,
  isProseMirrorStep,
  isProseMirrorStepResult,
  marksEqual
} from "../index";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: { inline: true }
  },
  marks: {
    bold: {}
  }
});

describe("Tiptap-compatible runtime helpers", () => {
  it("compares attributes and mark collections without key or mark order drift", () => {
    expect(attrsEqual({ a: 1, b: undefined }, { b: undefined, a: 1 })).toBe(true);
    expect(attrsEqual({ a: undefined }, { b: undefined })).toBe(false);
    expect(marksEqual(
      [{ type: "bold" }, { type: { name: "link" }, attrs: { href: "/a" } }],
      [{ type: "link", attrs: { href: "/a" } }, { type: { name: "bold" } }]
    )).toBe(true);
  });

  it("round-trips the admitted HTML entities without recursive decoding", () => {
    expect(decodeHtmlEntities("&amp;lt;&lt;&gt;&quot;")).toBe("&lt;<>\"");
    expect(encodeHtmlEntities("<&>\"")).toBe("&lt;&amp;&gt;\"");
  });

  it("reads the last raw case-insensitive inline style declaration", () => {
    const element = {
      getAttribute: () => "COLOR: rgb(1, 2, 3); color: #fff; font-family: 'A:B'"
    } as unknown as HTMLElement;
    expect(getStyleProperty(element, "color")).toBe("#fff");
    expect(getStyleProperty(element, "font-family")).toBe("'A:B'");
    expect(getStyleProperty(element, "missing")).toBeNull();
  });

  it("recognizes ProseMirror values and stable step discriminators", () => {
    const doc = paragraphDocument("abc");
    const mark = schema.marks.bold!.create();
    const addMark = EditorState.create({ schema, doc }).tr.addMark(1, 2, mark).steps[0]!;
    const removeMark = EditorState.create({ schema, doc: addMark.apply(doc).doc! })
      .tr.removeMark(1, 2, mark).steps[0]!;
    const replace = EditorState.create({ schema, doc }).tr.insertText("x", 2).steps[0]!;

    expect(isProseMirrorStep(addMark)).toBe(true);
    expect(isProseMirrorAddMarkStep(addMark)).toBe(true);
    expect(isProseMirrorRemoveMarkStep(removeMark)).toBe(true);
    expect(isProseMirrorReplaceStep(replace)).toBe(true);
    expect(isProseMirrorStepResult(replace.apply(doc))).toBe(true);
    expect(isProseMirrorFragment(doc.content)).toBe(true);
    expect(isProseMirrorSlice(new Slice(Fragment.from(schema.text("x")), 0, 0))).toBe(true);
    expect(isProseMirrorNodeSelection(NodeSelection.create(doc, 0))).toBe(true);
    expect(isProseMirrorCellSelection({ forEachCell: () => undefined })).toBe(true);

    expect(isProseMirrorAddNodeMarkStep(fakeStep("addNodeMark"))).toBe(true);
    expect(isProseMirrorRemoveNodeMarkStep(fakeStep("removeNodeMark"))).toBe(true);
    expect(isProseMirrorAttrStep(fakeStep("attr"))).toBe(true);
    expect(isProseMirrorDocAttrStep(fakeStep("docAttr"))).toBe(true);
    expect(isProseMirrorReplaceAroundStep(fakeStep("replaceAround"))).toBe(true);
    expect(isProseMirrorStep({ toJSON: () => ({}) })).toBe(false);
    expect(isProseMirrorSlice({ openStart: -1 })).toBe(false);
  });

  it("resolves previous blocks and node-view selection policy", () => {
    const first = schema.node("paragraph", null, schema.text("one"));
    const second = schema.node("paragraph", null, schema.text("two"));
    const doc = schema.node("doc", null, [first, second]);
    expect(getPreviousBlockSibling(doc.resolve(first.nodeSize + 1))?.eq(first)).toBe(true);
    expect(getPreviousBlockSibling(doc.resolve(1))).toBeNull();

    expect(isNodeViewSelected({
      selection: NodeSelection.create(doc, 0),
      pos: 0,
      nodeSize: first.nodeSize
    })).toBe(true);
    expect(isNodeViewSelected({
      selection: TextSelection.create(doc, 1, 2),
      pos: 0,
      nodeSize: first.nodeSize,
      selectedOnTextSelection: true
    })).toBe(true);
  });
});

/** @param text - Paragraph text. @returns One-paragraph document. */
function paragraphDocument(text: string) {
  return schema.node("doc", null, [schema.node("paragraph", null, schema.text(text))]);
}

/**
 * Creates one structural Step protocol fixture with a stable JSON discriminator.
 *
 * @param stepType - JSON step family.
 * @returns Structural Step-like fixture.
 */
function fakeStep(stepType: string) {
  return {
    apply: () => undefined,
    getMap: () => undefined,
    invert: () => undefined,
    map: () => undefined,
    merge: () => undefined,
    toJSON: () => ({ stepType })
  };
}
