import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { htmlViewExtension } from "../extension";
import type { QuireMountedViewRenderEvent } from "@quirekit/view";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";

describe("HTML flow consumer compilation", () => {
  it("compiles the selectable body so copy can attach retained export decisions", async () => {
    const events: QuireMountedViewRenderEvent[] = [];
    const editor = createEditor({
      extensions: [StarterKit, htmlViewExtension({ runtime: { width: 320, height: 180, onRender: event => events.push(event) } })],
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Alpha" }] }] }
    });
    const ownerDocument = new FakeSvgMountDocument();
    editor.mount({
      element: ownerDocument.createElement("section") as unknown as HTMLElement,
      mode: "html",
      ownerDocument: ownerDocument as unknown as Document
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    const compilation = events.at(-1)?.renderResult.layoutSnapshot.consumerCompilation;
    expect(compilation?.kind).toBe("ready");
    editor.destroy();
  });
});
