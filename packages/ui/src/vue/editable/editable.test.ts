import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import QuireEditable from "./editable.vue";

describe("QuireEditable label", () => {
  it("keeps a visually hidden label in the accessible component tree", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(QuireEditable, {
        defaultValue: "季度计划",
        hideLabel: true,
        label: "文档名称"
      })
    }));
    const label = html.match(/<label[^>]*qk-editable__label[^>]*>/u)?.[0];

    expect(label).toContain("qk-editable__label");
    expect(label).toContain("data-hidden");
    expect(label).not.toContain("aria-hidden");
    expect(html).toContain("文档名称");
  });
});
