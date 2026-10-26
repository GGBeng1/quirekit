import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect, it } from "vitest";
import { QuireProse } from "./index";
import { QuireCodeBlock } from "../code-block";
it("preserves native document structure, islands and SSR-safe code markup", async () => {
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(
          QuireProse,
          { as: "article", "aria-label": "Guide" },
          {
            default: () => [
              h("h2", { id: "intro" }, "Intro"),
              h("p", "Description"),
              h("div", { "data-qk-not-prose": "" }, "Interactive"),
              h(QuireCodeBlock, { code: "<img>" }),
            ],
          }
        ),
    })
  );
  expect(html).toMatch(/<article(?=[^>]*class="qk-prose")(?=[^>]*aria-label="Guide")[^>]*>/u);
  expect(html).toContain('<h2 id="intro">Intro</h2>');
  expect(html).toContain("&lt;img&gt;");
  expect(html).toContain("data-qk-not-prose");
});

it("fills tables by default and exposes the content-width variant", async () => {
  const render = (tableWidth?: "fill" | "content") => renderToString(createSSRApp({ render: () => h(QuireProse, tableWidth ? { tableWidth } : {}) }));
  expect(await render()).not.toContain("qk-prose--table-content");
  expect(await render("fill")).not.toContain("qk-prose--table-content");
  expect(await render("content")).toContain('class="qk-prose qk-prose--table-content"');
});
