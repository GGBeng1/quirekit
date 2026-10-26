import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import type { QuireLayoutNode } from "@quirekit/view-engine";
import type { HtmlDescriptor } from "../../../descriptors";
import { createHtmlRetainedDocumentView } from "../../../document";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlDomMeasurementProvider } from "../../provider";

/** @returns Retained paragraphs, an opaque atom, and nested/empty blocks with deterministic geometry. */
export function createGapFixture() {
  const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "before" }] },
    { type: "horizontalRule" },
    { type: "paragraph", content: [{ type: "text", text: "after" }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }, { type: "paragraph" }] },
    { type: "codeBlock" }
  ] } });
  const document = new FakeSvgMountDocument() as unknown as Document;
  const surface = document.createElement("div");
  const view = createHtmlRetainedDocumentView({ id: "gaps", documentNode: editor.state.doc, ownerDocument: document, source: { sourceId: "gaps" } });
  surface.appendChild(view.root.mount!.dom);
  let scroll = 0;
  surface.getBoundingClientRect = () => ({ left: 20, top: 30 - scroll, width: 400, height: 420 }) as DOMRect;
  const provider = createHtmlDomMeasurementProvider({ documentView: view, ownerDocument: document, surface, rootId: "root", regionId: "body" });
  /** @returns Existing retained owners with fixture CSS geometry; no new DOM reads. */
  function publish(): QuireLayoutNode {
    let index = 0;
    const tops = [20, 80, 180, 220, 240, 280, 360], heights = [20, 60, 20, 100, 20, 20, 20];
    /** @param owner - Retained descriptor. @returns Its fixture block geometry. */
    function measure(owner: HtmlDescriptor): QuireLayoutNode[] {
      if ((owner.kind !== "node" && owner.kind !== "node-view") || !owner.node.isBlock) return [];
      const row = index++;
      return [{ id: owner.id, kind: "block", range: { ...owner.range }, rect: { x: 0, y: tops[row]!, width: 400, height: heights[row]! },
        children: owner.children.flatMap(measure) }];
    }
    const root: QuireLayoutNode = { id: view.root.id, kind: "block", range: { ...view.root.range },
      rect: { x: 0, y: 0, width: 400, height: 420 }, children: view.root.children.flatMap(measure) };
    provider.updateBlockGeometry(root, editor.state.doc);
    return root;
  }
  const root = publish();
  document.elementFromPoint = () => view.root.mount!.dom as Element;
  document.caretPositionFromPoint = () => ({ offsetNode: view.root.mount!.dom, offset: 0, getClientRect: () => null });
  return { editor, document, surface, view, provider, root, publish,
    /** @param amount - Vertical CSS scroll projection. */
    scroll(amount: number): void { scroll = amount; }
  };
}
