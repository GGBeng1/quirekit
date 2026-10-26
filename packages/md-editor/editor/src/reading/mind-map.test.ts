import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMindMapEmbed, serializeMindMapEmbed } from "@quirekit/mind-map";
import { renderMindMapPreview } from "./mind-map";

describe("native mindMap reading", () => {
  it("renders inert saved images and keeps unknown versions as readable source", async () => {
    const mind = { ...createMindMapEmbed("read", "系统架构"), preview: { dataUrl: "data:image/png;base64,AAAA", width: 10, height: 20 } };
    const html = await renderToString(createSSRApp({ render: () => h("main", [renderMindMapPreview(serializeMindMapEmbed(mind))]) }));
    expect(html).toContain('data-qk-mind-map="true"'); expect(html).toContain('alt="系统架构"');
    expect(html).not.toContain('"children"'); expect(renderMindMapPreview("invalid")).toBeUndefined();
    expect(renderMindMapPreview(JSON.stringify({ ...mind, version: 99 }))).toBeUndefined();
  });
});
