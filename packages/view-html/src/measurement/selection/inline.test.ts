import { createEditor, Node as CoreNode, type QuireNodeViewRenderer } from "@quirekit/core";
import { DecorationSet } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlRetainedDocumentView } from "../../document";
import { createHtmlDomMeasurementProvider } from "../provider";

describe("inline object selection geometry", () => {
  for (const custom of [false, true]) {
    it(`includes fully selected inline objects with cached owner geometry (NodeView: ${custom})`, () => {
      const atom = CoreNode.create({
        name: "inlineObject", group: "inline", inline: true, atom: true,
        /** @returns Portable inline-object presentation. */
        renderHTML() { return ["span", "object"]; },
        ...(custom ? {
          /** @returns A retained opaque inline renderer. */
          addNodeView(): QuireNodeViewRenderer { return ({ view }) => {
            const dom = view.dom.ownerDocument.createElement("time"); dom.textContent = "object";
            return { dom };
          }; }
        } : {})
      });
      const editor = createEditor({ extensions: [StarterKit, atom], content: { type: "doc", content: [
        { type: "paragraph", content: [{ type: "text", text: "Left " }, { type: "inlineObject" }, { type: "text", text: " right" }] }
      ] } });
      const ownerDocument = new FakeSvgMountDocument();
      const surface = ownerDocument.createElement("div") as unknown as HTMLElement;
      const view = createHtmlRetainedDocumentView({ id: "inline-fixture", documentNode: editor.state.doc,
        ownerDocument: ownerDocument as unknown as Document, source: { sourceId: "inline-source" },
        nodeViewEnvironment: { view: { dom: surface } as never, nodeViews: editor.extensionManager.nodeViews, markViews: editor.extensionManager.markViews, getDecorations: () => DecorationSet.empty }
      });
      surface.appendChild(view.root.mount!.dom);
      const provider = createHtmlDomMeasurementProvider({ documentView: view, ownerDocument: ownerDocument as unknown as Document,
        surface, rootId: "inline-root", regionId: "inline-region" });
      const dom = view.nodeDOM(6) as HTMLElement, descriptor = view.ownerAtDOM(dom)!;
      let reads = 0;
      dom.getClientRects = () => { reads++; return [{ left: 100, right: 210, top: 20, bottom: 44, width: 110, height: 24 }] as unknown as DOMRectList; };
      const rects = provider.selectionRects({ from: 1, to: 13 });
      const selected = rects.filter(rect => rect.descriptorId === descriptor.id);
      expect(selected).toEqual([expect.objectContaining({ left: 100, right: 210,
        rootId: "inline-root", regionId: "inline-region", source: descriptor.source })]);
      expect(reads).toBe(1);
      provider.selectionRects({ from: 1, to: 13 });
      expect(reads).toBe(1);
      for (const range of [{ from: 1, to: 6 }, { from: 7, to: 13 }]) {
        expect(provider.selectionRects(range).some(rect => rect.descriptorId === descriptor.id)).toBe(false);
      }
      expect(provider.selectionRects({ from: 6, to: 7 })).toEqual(selected);
      provider.invalidate(); provider.selectionRects({ from: 6, to: 7 }); expect(reads).toBe(2);
      dom.getClientRects = () => [] as unknown as DOMRectList;
      provider.invalidate(); expect(provider.selectionRects({ from: 6, to: 7 })).toEqual([]);
      view.destroy(); editor.destroy();
    });
  }
});
