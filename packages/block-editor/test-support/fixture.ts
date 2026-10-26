import { createBlockEditor } from "@quirekit/block-editor";
import type { QuireJSONContent } from "@quirekit/core";

/** Resolves a required fixture host. @param id - Host ID. @returns Host element. */
function host(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing fixture host: ${id}`);
  return element;
}

const content: QuireJSONContent = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Hello block editor 中文输入" }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Continuous document" }] },
    { type: "paragraph", content: [{ type: "text", text: "Select across blocks and keep the highlight after blur." }] }
  ]
};

const diagnostics = { renders: 0, paginationProducts: 0, jsonReads: 0 };
const first = createBlockEditor({
  element: host("first"),
  content,
  view: {
    width: 700,
    height: 280,
    viewportPadding: { top: 20, right: 20, bottom: 20, left: 20 },
    /** @param event - Actual HTML runtime presentation event. */
    onRender(event) {
      diagnostics.renders += 1;
      if ("pages" in event.renderResult.layoutSnapshot || "pageDisplayListChunks" in event.renderResult) {
        diagnostics.paginationProducts += 1;
      }
    }
  }
});
const originalGetJSON = first.editor.getJSON.bind(first.editor);
/** @returns Explicitly requested canonical JSON; input should not call this. */
first.editor.getJSON = () => {
  diagnostics.jsonReads += 1;
  return originalGetJSON();
};
const second = createBlockEditor({ element: host("second"), content });
const fixture = { first, second, diagnostics, host };

declare global {
  /** Browser fixture exposed only by the acceptance harness. */
  interface Window {
    /** Package-consumer fixture with public product and Core APIs. */
    blockFixture: typeof fixture;
  }
}

window.blockFixture = fixture;
