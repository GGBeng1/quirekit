// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";
import { createDataView, serializeDataView } from "@quirekit/data-view";
import Inline from "./inline.vue";

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); });

it("retains canonical data and reports a rejected document edit without optimistic records", async () => {
  const value = createDataView("rejected"), commit = vi.fn(async () => ({accepted: false, message: "源码已被修改"}));
  const root = document.body.appendChild(document.createElement("div"));
  const app = createApp({render: () => h(Inline, {value, commit})});
  cleanup.push(() => { app.unmount(); root.remove(); }); app.mount(root); await nextTick();
  [...root.querySelectorAll("button")].find(button => button.textContent === "新增记录")!.click();
  await expect.poll(() => root.querySelector('[role="alert"]')?.textContent).toBe("源码已被修改");
  expect(commit).toHaveBeenCalledTimes(1);
  expect(commit).toHaveBeenCalledWith(expect.objectContaining({base: serializeDataView(value)}));
  expect(root.querySelector(".dv-result-count")?.textContent).toContain("0 条记录");
});
