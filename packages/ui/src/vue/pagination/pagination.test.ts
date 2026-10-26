// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import type { VNode } from "vue";
import QuirePagination from "./pagination.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const layout = ["first", "previous", "pages", "next", "last", "summary", "range", "pageSize", "jumper"] as const;
const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });

/** Mounts a render function in a disposable host. @param render - Vue render function. @returns Host element. */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  return host;
}

it("keeps Chinese navigation names and summaries without a provider", async () => {
  const host = mount(() => h(QuirePagination, { count: 248, layout: [...layout] }));
  await nextTick();
  expect(host.querySelector("nav")?.getAttribute("aria-label")).toBe("分页");
  expect(host.querySelector('[aria-label="上一页"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="第 1 页，共 25 页"]')).not.toBeNull();
  expect(host.textContent).toContain("共 248 条");
  expect(host.textContent).toContain("1–10 条");
  expect(host.textContent).toContain("跳至");
});

it("reads every pagination text from the active language", async () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: "en" }, () => h(QuirePagination, { count: 248, layout: [...layout] })));
  await nextTick();
  expect(host.querySelector("nav")?.getAttribute("aria-label")).toBe("Pagination");
  for (const name of ["First page", "Previous page", "Next page", "Last page", "Page 1 of 25", "Pagination page number"])
    expect(host.querySelector(`[aria-label="${name}"]`)).not.toBeNull();
  expect(host.textContent).toContain("248 items");
  expect(host.textContent).toContain("1–10");
  expect(host.textContent).toContain("10 / page");
  expect(host.textContent).toContain("Go to");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps a host-provided accessible name", () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: "en" }, () => h(QuirePagination, { count: 20, label: "Orders", layout: ["pages", "jumper"] })));
  expect(host.querySelector("nav")?.getAttribute("aria-label")).toBe("Orders");
  expect(host.querySelector('[aria-label="Orders page number"]')).not.toBeNull();
});
