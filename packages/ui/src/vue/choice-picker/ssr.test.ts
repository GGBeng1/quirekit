import { createSSRApp, createVNode } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect, it, vi } from "vitest";
import Picker from "./root.vue";

it("renders the unresolved automatic strategy as one stable closed entry without starting requests", async () => {
  const open = vi.fn(), submit = vi.fn(), search = vi.fn();
  const app = createSSRApp({ render: () => createVNode(Picker, {
    title: "选择成员", items: [{ value: "a", label: "Alice" }], defaultOpen: true,
    onOpenChange: open, submit, onSearchRequest: search
  }) });
  const html = await renderToString(app);
  expect(html.match(/<button /g)).toHaveLength(1);
  expect(html).not.toContain('role="dialog"');
  expect(open).not.toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
  expect(search).not.toHaveBeenCalled();
});

it("keeps an explicitly controlled closed desktop task closed during server rendering", async () => {
  const open = vi.fn();
  const app = createSSRApp({ render: () => createVNode(Picker, {
    title: "选择成员", items: [], presentation: "desktop", open: false, defaultOpen: true, onOpenChange: open
  }) });
  const html = await renderToString(app);
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain('role="dialog"');
  expect(open).not.toHaveBeenCalled();
});
