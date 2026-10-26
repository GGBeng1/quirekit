// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createApp, createSSRApp, h, nextTick, reactive, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import { QuireMarkdown } from "../index";
import { parseMarkdown } from "../../parse/complete";
import { MarkdownRenderer } from "../cache/renderer";
import type { MarkdownHtmlOptions } from "../types";

const card = '<div style="background: #f0f9ff; padding: 1rem; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 1em 0"><p style="margin: 0; color: #1e40af"><strong>HTML 元素示例</strong></p><p style="margin: 0.5em 0 0 0; color: #1e40af">这是一个使用 HTML 样式自定义的段落。</p></div>';

/** @param content - Exact HTML island. @param html - Public opt-in policy. @returns Detached SSR DOM for semantic and style assertions. */
async function render(content: string, html: boolean | MarkdownHtmlOptions): Promise<HTMLElement> {
  const markup = await renderToString(createSSRApp({ render: () => h(QuireMarkdown, { content, html }) }));
  const root = document.createElement("main"); root.innerHTML = markup; return root;
}

describe("restricted inline HTML styles", () => {
  it("keeps styles disabled by default and restores the example card only with explicit opt-in", async () => {
    const plain = await render(card, true);
    expect(plain.querySelector("[style]")).toBeNull();
    const styled = await render(card, { styles: "safe" });
    const box = styled.querySelector("div[style]") as HTMLElement;
    expect(box).not.toBeNull();
    expect(box.style.backgroundColor).toBe("#f0f9ff");
    expect(box.style.padding).toBe("1rem");
    expect(box.style.borderLeft).toBe("4px solid #3b82f6");
    expect(box.querySelector("p")?.style.color).toBe("#1e40af");
  });

  it("supports nested flex/grid layouts, table cells and native disclosure", async () => {
    const root = await render('<div style="display:flex;flex-wrap:wrap;gap:12px"><div style="flex:1 1 240px;min-width:0;max-width:100%">Card</div><div style="display:grid;grid-template-columns:1fr 2fr;gap:1rem">Grid</div></div>\n\n<details><summary style="cursor:pointer;font-weight:600">More</summary><table><tbody><tr><td style="text-align:right;color:teal">42</td></tr></tbody></table></details>', { styles: "safe" });
    expect((root.querySelector('div[style]') as HTMLElement).style.display).toBe("flex");
    expect(root.querySelector("summary")?.style.cursor).toBe("pointer");
    expect((root.querySelector("td") as HTMLElement).style.textAlign).toBe("right");
    expect(root.querySelector("details table td")?.textContent).toBe("42");
    expect(root.querySelector('[style*="grid-template-columns"]')).not.toBeNull();
  });

  it.each([
    'background:url(https://example.com/track);position:fixed;inset:0;z-index:9999',
    'color:var(--secret);background:expression(alert(1));behavior:url(bad.htc)',
    'color:r/**/ed;background:re\\64;--color:red;-moz-binding:url(bad)',
    'padding:-1px;margin:1e9px;width:999999rem;height:calc(100vh);color:red!important',
    'display:none;opacity:0;visibility:hidden;transform:translate(1px);animation:spin 1s',
  ])("drops unsupported CSS without losing valid siblings: %s", async css => {
    const root = await render(`<div style="${css};border-radius:6px">safe</div>`, { styles: "safe" });
    expect(root.querySelector("div[style]")?.getAttribute("style")).toBe("border-radius:6px;");
    expect(root.textContent).toBe("safe");
  });

  it("bounds CSS input and never admits style tags or event handlers with the style option", async () => {
    const root = await render('<div onclick="bad()" style="background:&#117;rl(https://example.com);color:blue"><style>body {display:none}</style>safe</div>', { styles: "safe" });
    expect(root.querySelector("style,[onclick]")).toBeNull();
    expect(root.querySelector("div[style]")?.getAttribute("style")).toBe("color:blue;");
    for (const css of ["color:red;".repeat(65), `color:red;${" ".repeat(4096)}`]) {
      expect((await render(`<div style="${css}">safe</div>`, { styles: "safe" })).querySelector("[style]")).toBeNull();
    }
  });

  it("invalidates existing HTML blocks when the mutable style policy changes", async () => {
    const renderer = new MarkdownRenderer(), state = parseMarkdown(`${card}\n\nAfter.`);
    const html = reactive<{ styles?: "safe" }>({});
    const root = document.createElement("main");
    const app = createApp({ render: () => h("article", [renderer.render(state, "en", "style", undefined, { html })]) });
    app.mount(root);
    try {
      expect(root.querySelector("div[style]")).toBeNull();
      html.styles = "safe"; await nextTick();
      expect(root.querySelector("div[style]")).not.toBeNull();
      delete html.styles; await nextTick();
      expect(root.querySelector("div[style]")).toBeNull();
    } finally { app.unmount(); renderer.clear(); }
  });

  it("retains incomplete source and converges across streamed style/attribute boundaries", async () => {
    const content = shallowRef(""), root = document.createElement("main");
    const html = { styles: "safe" } as const;
    const app = createApp({ render: () => h(QuireMarkdown, { content: content.value, html }) });
    app.mount(root);
    try {
      for (let offset = 0; offset < card.length; offset += 7) {
        const chunk = card.slice(offset, offset + 7); content.value += chunk;
        await nextTick();
        if (content.value.length < card.length) expect(root.querySelector("div[style]")).toBeNull();
      }
      const staticRoot = await render(card, html);
      expect(root.textContent).toBe(staticRoot.textContent);
      expect([...root.querySelectorAll("div,p,strong")].map(node => node.tagName)).toEqual([...staticRoot.querySelectorAll("div,p,strong")].map(node => node.tagName));
      const box = root.querySelector("div[style]") as HTMLElement;
      expect(box.style.backgroundColor).toBe("#f0f9ff");
      expect(box.style.borderLeft).toBe("4px solid #3b82f6");
      expect(box.style.padding).toBe("1rem");
    } finally { app.unmount(); }
  });
});
