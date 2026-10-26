import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Typography from "./typography.vue";
import type { QuireKitTypographyElement } from "../../components/typography";

describe("semantic Typography", () => {
  it.each(["mark", "del", "ins", "s", "u", "sub", "sup", "cite", "dfn", "var", "samp", "kbd", "b", "i"] satisfies QuireKitTypographyElement[])("preserves the native %s element", async (as) => {
    const html = await renderToString(createSSRApp({
      render: () => h(Typography, { as, title: "补充说明" }, () => "内容")
    }));
    expect(html).toMatch(new RegExp(`^<${as}\\b`));
    expect(html).toContain('title="补充说明"');
    expect(html).not.toContain(' as=');
  });

  it("opts code into an inline surface without changing its native semantics", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(Typography, { as: "code", codeStyle: "inline" }, () => "editor.focus()")
    }));
    expect(html).toMatch(/^<code\b/u);
    expect(html).toContain("qk-typography--inline-code");
    expect(html).not.toContain("codeStyle=");
    const plain = await renderToString(createSSRApp({
      render: () => h(Typography, { as: "code" }, () => "editor.focus()")
    }));
    expect(plain).not.toContain("qk-typography--inline-code");
  });

  it("forwards native navigation attributes without inventing a click controller", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(Typography, { as: "a", href: "/guide", target: "_blank", rel: "noreferrer" }, () => "指南")
    }));
    expect(html).toContain('href="/guide"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });
  it("renders body copy as a paragraph and forwards native attributes", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(Typography, { id: "summary", lang: "zh-CN", class: "text-qk-text-secondary" }, () => "项目进展")
    }));
    expect(html).toMatch(/^<p\b/u);
    expect(html).toContain('id="summary"');
    expect(html).toContain('lang="zh-CN"');
    expect(html).toContain("qk-typography text-qk-text-secondary");
    expect(html).toContain("项目进展");
    expect(html).toMatch(/<\/p>$/u);
    expect(html).not.toContain("style=");
  });

  it("keeps heading semantics when its visual role is overridden", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(Typography, { as: "h2", variant: "display", "aria-describedby": "intro" }, () => "季度计划")
    }));
    expect(html).toMatch(/^<h2\b/u);
    expect(html).toContain("qk-type-display");
    expect(html).toContain('aria-describedby="intro"');
    expect(html).not.toContain("variant=");
  });

  it("preserves nested emphasis and code without adding visual-role resets", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(Typography, {}, () => [
        "请在", h(Typography, { as: "strong" }, () => "周五前"),
        "确认", h(Typography, { as: "em" }, () => "为什么要做"),
        "，再调用", h(Typography, { as: "code" }, () => "editor.focus()")
      ])
    }));
    const content = html.replace(/<!--.*?-->/gu, "");
    expect(content).toContain('<strong class="qk-typography">周五前</strong>');
    expect(content).toContain('<em class="qk-typography">为什么要做</em>');
    expect(content).toContain('<code class="qk-typography">editor.focus()</code>');
    expect(html).not.toContain("text-qk-text-");
  });
});
