import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createFlowchartEmbed, serializeFlowchartEmbed } from "@quirekit/flowchart";
import { renderFlowchartPreview } from "./flowchart";

describe("native flowchart reading", () => {
  it("renders inert saved images and keeps unknown versions as readable source", async () => {
    const flow = { ...createFlowchartEmbed("read", "系统架构"), preview: { dataUrl: "data:image/png;base64,AAAA", width: 10, height: 20 } };
    const html = await renderToString(createSSRApp({ render: () => h("main", [renderFlowchartPreview(serializeFlowchartEmbed(flow))]) }));
    expect(html).toContain('data-qk-flowchart="true"'); expect(html).toContain('alt="系统架构"');
    expect(html).not.toContain('"nodes"'); expect(renderFlowchartPreview("invalid")).toBeUndefined();
    expect(renderFlowchartPreview(JSON.stringify({ ...flow, version: 99 }))).toBeUndefined();
  });
});
