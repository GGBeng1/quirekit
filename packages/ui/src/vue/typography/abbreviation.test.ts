// @vitest-environment happy-dom
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect, it, vi } from "vitest";
import Typography from "./typography.vue";
import ProseAbbr from "../prose/inline/annotations/abbr.vue";

it.each([Typography, ProseAbbr])("hydrates a focusable abbreviation without a native title or block wrapper", async component => {
  const title = "Application Programming Interface";
  const render = () => h("p", {}, ["应用程序接口（", h(component, { as: component === Typography ? "abbr" : undefined, title, id: "api", class: "consumer" }, () => "API"), "）"]);
  const host = document.createElement("div");
  host.innerHTML = await renderToString(createSSRApp({ render }));
  document.body.append(host);
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const app = createSSRApp({ render });
  try {
    expect(host.querySelectorAll("p")).toHaveLength(1);
    expect(host.querySelector("p div, p button")).toBeNull();
    const abbreviation = host.querySelector("abbr")!;
    expect(abbreviation.getAttribute("title")).toBeNull();
    expect(abbreviation.getAttribute("tabindex")).toBe("0");
    expect(abbreviation.id).toBe("api");
    expect(abbreviation.classList.contains("consumer")).toBe(true);
    app.mount(host); await nextTick();
    expect([...warn.mock.calls, ...error.mock.calls].flat().join(" ")).not.toMatch(/hydration|mismatch/iu);
  } finally { app.unmount(); host.remove(); warn.mockRestore(); error.mockRestore(); }
});

it("leaves abbreviations without an expansion outside the tab order and preserves native titles on other text", async () => {
  for (const title of [undefined, "", "   "]) {
    const html = await renderToString(createSSRApp({ render: () => h(ProseAbbr, { title }, () => "API") }));
    expect(html).toMatch(/^<abbr\b/u);
    expect(html).not.toMatch(/tabindex|data-scope="tooltip"|data-qk-abbr/u);
  }
  const html = await renderToString(createSSRApp({ render: () => h(Typography, { title: "说明" }, () => "段落") }));
  expect(html).toContain('title="说明"');
});
