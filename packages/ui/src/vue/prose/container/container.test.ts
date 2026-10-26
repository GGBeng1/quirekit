import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect, it } from "vitest";
import Container from "./container.vue";

it("preserves nested semantic bodies and safely renders plain titles", async () => {
  const html = await renderToString(createSSRApp({ render: () => h(Container, { title: "<script>alert(1)</script>", tone: "info" },
    { default: () => [h("p", "Body"), h(Container, { title: "Warning", tone: "warning" }, { default: () => h("p", "Nested") })] }) }));
  expect(html.match(/class="qk-prose-container"/gu)).toHaveLength(2);
  expect(html).toContain('data-tone="warning"');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html).toContain('<p>Nested</p>');
});
