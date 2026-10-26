// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { QuireMarkdown } from "../index";
import type { MarkdownHtmlOptions } from "../types";

/** @param content - Untrusted Markdown. @param html - Explicit HTML policy. @returns A detached semantic document for assertions. */
async function render(content: string, html: boolean | MarkdownHtmlOptions = true): Promise<Element> {
  const source = await renderToString(createSSRApp({ render: () => h(QuireMarkdown, { content, html }) }));
  const root = document.createElement("div"); root.innerHTML = source;
  return root.querySelector(".qk-prose")!;
}

describe("explicit HTML reading", () => {
  it.each([
    '<div><script>alert(1)</script><b onclick="bad()">safe</b></div>',
    '<div><img src="javascript:bad()" onerror="bad()"><a href="jav&#x61;script:bad()">safe</a></div>',
    '<div><a href="data:text/html,bad()">safe</a><iframe srcdoc="<script>bad()</script>"></iframe></div>',
    '<svg><g onload="bad()"><foreignObject><script>bad()</script></foreignObject></g></svg>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=bad()>"></table></mtext></math>',
    '<div style="background:url(javascript:bad())" id="__proto__"><input name="constructor"><a href="java&#10;script:bad()">safe</a></div>',
  ])("does not admit executable markup or disguised destinations: %s", async content => {
    for (const html of [true, { styles: "safe" }] as const) {
      const root = await render(content, html);
      expect(root.querySelector("script,iframe,svg,math,style,object,embed,form")).toBeNull();
      for (const element of root.querySelectorAll("*")) for (const attribute of element.attributes) {
        expect(attribute.name).not.toMatch(/^on/iu);
        if (["href", "src"].includes(attribute.name)) expect(attribute.value).not.toMatch(/^(?:javascript|data|vbscript):/iu);
      }
    }
  });

  it("keeps incomplete inline and block HTML visible until the closing delimiter arrives", async () => {
    for (const prefix of ['before <span title="note">safe', 'before <span title="note">safe</span', '<div><b>safe</b>']) {
      const root = await render(prefix);
      expect(root.textContent).toContain(prefix); expect(root.querySelector('[title="note"],div > b')).toBeNull();
    }
    const inline = await render('before <span title="note">safe</span> after');
    expect(inline.querySelector('[title="note"]')?.textContent).toBe("safe");
    const block = await render('<div><b>safe</b></div>'); expect(block.querySelector("div > b")?.textContent).toBe("safe");
  });

  it("supports multiline tables, entities and HTML inside Markdown without executing code contents", async () => {
    const root = await render('<table>\n<tr><td>A &amp; B</td></tr>\n</table>\n\ntext <em>**bold** &amp; more</em>\n\n```html\n<b>code</b>\n```');
    expect(root.querySelector("td")?.textContent).toBe("A & B");
    expect(root.querySelector("em strong")?.textContent).toBe("bold");
    expect(root.querySelector("em")?.textContent).toBe("bold & more");
    expect(root.querySelector("pre code")?.textContent).toBe("<b>code</b>");
  });

  it("retains source by default and applies host restrictions after sanitization", async () => {
    const content = '<div><b>label</b><a href="https://example.com">link</a><img src="https://example.com/image.png" alt="picture"></div>';
    expect((await render(content, false)).textContent).toBe(content);
    const root = await render(content, { allowedElements: ["a", "img"], allowLink: () => false, allowImage: () => false });
    expect(root.querySelector("b")).toBeNull(); expect(root.querySelector("a")?.hasAttribute("href")).toBe(false);
    expect(root.querySelector("img[src]")).toBeNull(); expect(root.textContent).toContain("label");
  });

  it("namespaces sanitized HTML ids consistently across independent readers", async () => {
    const content = '<div id="title"><a href="#title">jump</a></div>';
    const html = await renderToString(createSSRApp({ render: () => h("main", [h(QuireMarkdown, { content, html: true }), h(QuireMarkdown, { content, html: true })]) }));
    const root = document.createElement("div"); root.innerHTML = html;
    const ids = [...root.querySelectorAll('[id$="-html-title"]')].map(node => node.id);
    expect(ids).toHaveLength(2); expect(new Set(ids).size).toBe(2);
    for (const link of root.querySelectorAll('a[href^="#"]')) expect(ids).toContain(link.getAttribute("href")!.slice(1));
  });

  it("preserves Markdown code and link syntax inside inline HTML", async () => {
    const root = await render('before <span>`🙂<T>` and `</span>` [link](/target) **bold**</span> after');
    expect([...root.querySelectorAll("code")].map(node => node.textContent)).toEqual(["🙂<T>", "</span>"]);
    expect(root.querySelector('a[href="/target"]')?.textContent).toBe("link");
    expect(root.textContent).toBe("before 🙂<T> and </span> link bold after");
  });

  it("provides the exact decoded body to HTML pre replacements", async () => {
    const codes: string[] = [];
    const pre = defineComponent({ props: ["code"], setup: (props, { slots }) => {
      codes.push(props.code); return () => h("pre", slots.default?.());
    } });
    await renderToString(createSSRApp({ render: () => h(QuireMarkdown, {
      content: '<pre><code class="language-ts">const a = &lt;T&gt;\nnext</code></pre>', html: true, components: { pre },
    }) }));
    expect(codes).toEqual(["const a = <T>\nnext"]);
  });

  it("keeps Markdown delimiters literal inside HTML code", async () => {
    const root = await render('before <code>**bold** &amp; \\*literal\\*</code> after');
    expect(root.querySelector("code")?.textContent).toBe("**bold** & \\*literal\\*");
    expect(root.querySelector("code strong")).toBeNull();
  });
});
