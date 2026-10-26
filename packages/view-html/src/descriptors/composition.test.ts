import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { FakeSvgMountDocument, type FakeSvgMountElement } from "@quirekit/view/test-support/svg-mount";
import { createHtmlDocumentDescriptor } from "./create";
import { createHtmlCompositionDescriptor } from "./composition";

describe("retained HTML composition descriptor", () => {
  it("updates one transient DOM identity with inherited IME presentation", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "abc" }] }]
      }
    });
    const root = createHtmlDocumentDescriptor({
      id: "composition-doc",
      documentNode: editor.state.doc,
      ownerDocument: ownerDocument as unknown as Document,
      source: { sourceId: "composition-source" }
    }).descriptor;
    const paragraph = root.children[0]!;
    const descriptor = createHtmlCompositionDescriptor({
      id: "composition-session-1",
      parent: paragraph as typeof root.children[0] & { kind: "node" },
      source: paragraph.source,
      range: { from: 2, to: 2 },
      text: "ni",
      ownerDocument: ownerDocument as unknown as Document,
      presentation: {
        background: true,
        backgroundFillStyle: "rgba(1, 2, 3, 0.4)",
        underline: true
      }
    });
    const span = descriptor.mount!.dom as unknown as FakeSvgMountElement;

    expect(descriptor.kind).toBe("composition");
    expect(span.className).toBe("qk-html-editor__composition");
    expect(span.dataset.qkComposition).toBe("composition-session-1");
    expect(span.style.backgroundColor).toBe("rgba(1, 2, 3, 0.4)");
    expect(span.style.textDecorationLine).toBe("underline");
    expect(descriptor.textDOM.nodeValue).toBe("ni");

    descriptor.update({ from: 2, to: 2 }, "nihao", {
      background: false,
      backgroundFillStyle: "transparent",
      underline: false
    });

    expect(descriptor.mount!.dom).toBe(span);
    expect(descriptor.textDOM.nodeValue).toBe("nihao");
    expect(span.style.backgroundColor).toBe("transparent");
    expect(span.style.textDecorationLine).toBe("none");
  });
});
