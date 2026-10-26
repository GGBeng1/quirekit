import { createEditor, Node as CoreNode } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { afterEach, expect, it, vi } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlRetainedDocumentView } from "../../document";
import { createHtmlDomMeasurementProvider } from "../provider";

const dispose: (() => void)[] = [];
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); });

/** @param rtl - Visual direction of the opaque inline node. @returns A lone atom with private renderer text. */
function fixture(rtl = false) {
  const atom = CoreNode.create({ name: "inlineObject", group: "inline", inline: true, atom: true,
    /** @returns Opaque presentation with a label that is not canonical text. */
    renderHTML() { return ["span", ["span", "private label"]]; }
  });
  const editor = createEditor({ extensions: [StarterKit, atom], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "inlineObject" }] }
  ] } });
  const document = new FakeSvgMountDocument() as unknown as Document;
  const surface = document.createElement("div");
  const view = createHtmlRetainedDocumentView({ id: "inline-boundary", documentNode: editor.state.doc,
    ownerDocument: document, source: { sourceId: "inline-source" } });
  surface.appendChild(view.root.mount!.dom);
  const paragraph = view.nodeDOM(0) as HTMLElement, dom = view.nodeDOM(1) as HTMLElement;
  const owner = view.ownerAtDOM(dom)!;
  const reads = vi.fn(() => ({ left: 100, right: 260, top: 20, bottom: 54, width: 160, height: 34 }) as DOMRect);
  dom.getBoundingClientRect = reads;
  Object.defineProperty(document, "defaultView", { value: { getComputedStyle: () => ({ direction: rtl ? "rtl" : "ltr" }) } });
  document.elementFromPoint = () => paragraph;
  document.caretPositionFromPoint = () => ({ offsetNode: dom.firstChild!, offset: 0, getClientRect: () => null });
  document.createRange = (() => ({ setStart() {}, setEnd() {}, collapse() {}, getClientRects: () => [],
    getBoundingClientRect: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 })
  })) as unknown as typeof document.createRange;
  const provider = createHtmlDomMeasurementProvider({ documentView: view, ownerDocument: document, surface,
    rootId: "root", regionId: "body" });
  dispose.push(() => { view.destroy(); editor.destroy(); });
  return { document, view, provider, paragraph, dom, owner, reads };
}

it.each([false, true])("maps private inline labels to canonical edges in RTL=%s", rtl => {
  const f = fixture(rtl);
  for (const privateDOM of [f.dom, f.dom.firstChild!, f.dom.firstChild!.firstChild!]) {
    f.document.caretPositionFromPoint = () => ({ offsetNode: privateDOM, offset: 0, getClientRect: () => null });
    expect(f.provider.posAtClientPoint(90, 37)).toMatchObject({ pos: rtl ? 2 : 1, inside: 0,
      descriptorId: f.owner.id, source: f.owner.source, rootId: "root", regionId: "body" });
    expect(f.provider.posAtClientPoint(350, 37)).toMatchObject({ pos: rtl ? 1 : 2 });
    expect(f.provider.posAtClientPoint(350, 37)?.nodeSelection).toBeUndefined();
  }
  expect(f.reads).toHaveBeenCalledTimes(9);
  expect(f.provider.getRangeReadCount()).toBe(0);
  expect(() => f.provider.posAtDOM(f.dom.firstChild!, 0)).toThrow(/not owned/);
});

it.each([false, true])("uses cached adjacent atom caret edges instead of the paragraph start in RTL=%s", rtl => {
  const f = fixture(rtl);
  for (const side of [-1, 1]) {
    expect(f.provider.coordsAtPos(1, side)).toMatchObject({ left: rtl ? 260 : 100, right: rtl ? 260 : 100,
      top: 20, bottom: 54, descriptorId: f.owner.id, source: f.owner.source });
    expect(f.provider.coordsAtPos(2, side)).toMatchObject({ left: rtl ? 100 : 260, right: rtl ? 100 : 260 });
    f.provider.coordsAtPos(1, side); f.provider.coordsAtPos(2, side);
  }
  expect(f.reads).toHaveBeenCalledTimes(4);
  expect(f.provider.getRangeReadCount()).toBe(4);
  f.provider.invalidate(); f.provider.coordsAtPos(2);
  expect(f.reads).toHaveBeenCalledTimes(5);
});

it("rejects hidden inline geometry and leaves ordinary mapped content to the browser", () => {
  const f = fixture();
  f.document.caretPositionFromPoint = () => ({ offsetNode: f.paragraph, offset: 1, getClientRect: () => null });
  expect(f.provider.posAtClientPoint(350, 37)?.pos).toBe(2);
  expect(f.reads).not.toHaveBeenCalled();
  f.dom.getBoundingClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }) as DOMRect;
  f.document.caretPositionFromPoint = () => ({ offsetNode: f.dom, offset: 0, getClientRect: () => null });
  // Without visible inline geometry, the private label cannot become an editable offset.
  f.document.elementFromPoint = () => f.dom;
  f.paragraph.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 60 }) as DOMRect;
  expect(f.provider.posAtClientPoint(350, 37)).toBeNull();
});
