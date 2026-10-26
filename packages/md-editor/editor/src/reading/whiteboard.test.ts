import { describe, expect, it } from "vitest";
import { renderToString } from "vue/server-renderer";
import { createSSRApp, h } from "vue";
import { createWhiteboardDocument, serializeWhiteboard } from "@quirekit/whiteboard";
import { renderWhiteboardPreview } from "./whiteboard";

const board = { ...createWhiteboardDocument("read", "团队流程"), preview: {
  dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", width: 1, height: 1,
} };
describe("MD Editor whiteboard defaults", () => {
  it("renders an inert preview in reading mode and leaves invalid source to the ordinary fence renderer", async () => {
    const html = await renderToString(createSSRApp({ render: () => h("main", [renderWhiteboardPreview(serializeWhiteboard(board))]) }));
    expect(html).toContain('data-qk-whiteboard="true"'); expect(html).toContain('alt="团队流程"');
    expect(html).toContain("border:1px solid"); expect(html).toContain("max-width:460px"); expect(html).not.toContain("<figcaption");
    expect(html).not.toContain('"elements"'); expect(renderWhiteboardPreview("invalid")).toBeUndefined();
  });
});
