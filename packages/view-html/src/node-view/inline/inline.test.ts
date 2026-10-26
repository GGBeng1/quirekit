import { getChangedRanges, type QuireMountedEditorView } from "@quirekit/core";
import { Decoration, DecorationGroup, DecorationSet, EditorState, Mapping, Schema } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlRetainedDocumentView } from "../../document";
import { createHtmlDocumentCompositionRuntime } from "../../document/composition";
import { walkHtmlDescriptors } from "../../reconcile/ownership/descriptor-tree";
import type { HtmlDescriptor } from "../../descriptors";

/** @param marked - Whether the first run carries canonical marks. @param grouped - Whether providers return fresh equivalent groups. @returns Retained source and reversible decoration owner. */
function fixture(marked = false, grouped = false) {
  const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*", toDOM: () => ["p", 0] }, text: {} },
    marks: { bold: { toDOM: () => ["strong", 0] }, italic: { toDOM: () => ["em", 0] } } });
  const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text("abcdef", marked ? [schema.mark("bold"), schema.mark("italic")] : [])), schema.node("paragraph", null, schema.text("untouched"))]);
  let source = DecorationSet.create(doc, [Decoration.inline(1, 4, { class: "first", style: "color: red" }), Decoration.inline(3, 6, { class: "second", style: "background: blue" })]);
  const owner = new FakeSvgMountDocument();
  const view = createHtmlRetainedDocumentView({ id: "inline", documentNode: doc, source: { sourceId: "body" }, ownerDocument: owner as unknown as Document,
    nodeViewEnvironment: { view: { dom: owner.createElement("div") } as unknown as QuireMountedEditorView, nodeViews: {}, markViews: {}, getDecorations: () => grouped
      ? DecorationGroup.from([source, DecorationSet.create(doc, [Decoration.inline(9, 10, { class: "other-provider" })])]) : source } });
  return { doc, owner, view,
    /** @param next - New presentation source. */
    setSource(next: DecorationSet) { source = next; },
    /** @returns Current presentation source. */
    getSource() { return source; }
  };
}

/** @param view - Retained tree. @returns Actual descriptors, including presentation owners. */
function descriptors(view: ReturnType<typeof fixture>["view"]): HtmlDescriptor[] {
  const all: HtmlDescriptor[] = []; walkHtmlDescriptors(view.root, value => all.push(value)); return all;
}

/** @param node - Browser or fake DOM root. @returns Text actually mounted below this owner. */
function mountedText(node: Node): string {
  return node.nodeType === 3 ? node.nodeValue ?? "" : Array.from(node.childNodes).map(mountedText).join("");
}

describe("HTML partial inline decorations", () => {
  it("does not reconcile content when providers return an equivalent decoration group on selection", () => {
    const { doc, view } = fixture(false, true);
    const before = descriptors(view);
    const result = view.update({ documentNode: doc, mapping: new Mapping(), changedRanges: [] });
    expect(result.dirtyContainers).toHaveLength(0);
    expect(result.trace.descriptorVisits).toBe(0);
    expect(result.trace.structureWrites).toHaveLength(0);
    expect(result.trace.textWrites).toHaveLength(0);
    expect(descriptors(view)).toEqual(before);
    view.destroy();
  });
  for (const marked of [false, true]) it(`partitions overlaps and preserves model mapping with marks=${marked}`, () => {
    const { doc, view, setSource } = fixture(marked), untouched = view.root.children[1];
    const wrappers = descriptors(view).filter(item => item.kind === "inline-decoration");
    expect(wrappers.map(item => [item.range.from, item.range.to, mountedText(item.mount!.dom)])).toEqual([[1, 3, "ab"], [3, 4, "c"], [4, 6, "de"]]);
    expect((wrappers[1]!.mount!.dom as Element).getAttribute("class")).toBe("first second");
    for (let pos = 1; pos <= 7; pos++) {
      const point = view.domAtPos(pos); expect(view.posAtDOM(point.node, point.offset)).toBe(pos);
    }
    const unchanged = view.update({ documentNode: doc, mapping: new Mapping(), changedRanges: [] });
    expect(unchanged.trace.structureWrites).toHaveLength(0);
    expect(descriptors(view).filter(item => item.kind === "inline-decoration")).toEqual(wrappers);
    setSource(DecorationSet.empty); view.update({ documentNode: doc, mapping: new Mapping(), changedRanges: [] });
    expect(descriptors(view).some(item => item.kind === "inline-decoration")).toBe(false);
    expect(view.root.children[1]).toBe(untouched);
    expect(view.root.node).toBe(doc);
  });
  it("maps split text through edits and hosts/cancels composition without duplicating source", () => {
    const { doc, view, owner, setSource, getSource } = fixture();
    const tr = EditorState.create({ doc }).tr.insertText("Z", 3);
    setSource(getSource().map(tr.mapping, tr.doc));
    view.update({ documentNode: tr.doc, mapping: tr.mapping, changedRanges: getChangedRanges(tr) });
    expect(mountedText(view.root.mount!.dom)).toBe("abZcdefuntouched");
    const composition = createHtmlDocumentCompositionRuntime({ documentView: view, resolveDomPoint: (pos, side) => view.domAtPos(pos, side), ownerDocument: owner as unknown as Document, rootId: "root", regionId: "body" });
    const presentation = { background: true, backgroundFillStyle: "blue", underline: true };
    expect(composition.sync({ range: { from: 3, to: 3 }, text: "中文" }, presentation).active).toBe(true);
    composition.sync(undefined, presentation);
    expect(mountedText(view.root.mount!.dom)).toBe("abZcdefuntouched");
    for (let pos = 1; pos <= 8; pos++) { const point = view.domAtPos(pos); expect(view.posAtDOM(point.node, point.offset)).toBe(pos); }
    composition.destroy(); view.destroy();
  });
});
