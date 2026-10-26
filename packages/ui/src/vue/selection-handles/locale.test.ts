// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireSelectionHandles from "./selection-handles.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

it("names the handles from the active language", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const selection = { type: "caret" as const, caret: { x: 10, y: 20, height: 18 } };
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale: "en" }, () => h(QuireSelectionHandles, { selection })) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  expect(host.querySelector('[data-handle="caret"] button')!.getAttribute("aria-label")).toBe("Move cursor");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});
