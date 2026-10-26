import { expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import QuireHtmlSandbox from "./html-sandbox.vue";
it("SSR renders trusted controls but neither executes nor inserts author HTML", async () => {
  const html = await renderToString(createSSRApp({ render: () => h(QuireHtmlSandbox, { html: '<script>globalThis.sandboxEscaped=true</script><img src=x onerror=alert(1)>', config: { execution: "on-complete" } }) }));
  expect(html).toContain("qk-html-sandbox");
  expect(html).not.toContain("<iframe"); expect(html).not.toContain("<script>"); expect(html).not.toContain("<img src=x");
  expect((globalThis as Record<string, unknown>).sandboxEscaped).toBeUndefined();
});
