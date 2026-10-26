// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";
import { revealNestedMenuItem, useNestedMenuScroll } from "./scroll";

it("reveals the active row only in inner scrollers and ignores retired surfaces", () => {
  const menu = document.createElement("div"), viewport = document.createElement("div"), item = document.createElement("div");
  item.id = "nested-menu-last"; menu.setAttribute("aria-activedescendant", item.id);
  viewport.style.overflowY = "auto";
  Object.defineProperties(viewport, { clientHeight: { value: 100 }, scrollHeight: { value: 800 } });
  viewport.getBoundingClientRect = () => new DOMRect(0, 50, 200, 100);
  item.getBoundingClientRect = () => new DOMRect(0, 300 - viewport.scrollTop, 200, 30);
  viewport.append(item); menu.append(viewport); document.body.append(menu);
  revealNestedMenuItem(menu); expect(viewport.scrollTop).toBe(180); expect(menu.scrollTop).toBe(0);
  revealNestedMenuItem(menu); expect(viewport.scrollTop).toBe(180);
  menu.remove(); viewport.scrollTop = 0;
  revealNestedMenuItem(menu); expect(viewport.scrollTop).toBe(0);
});

it("starts on opening a retained surface and disconnects while closed or unmounted", async () => {
  const menu = document.createElement("div"), viewport = document.createElement("div"), item = document.createElement("div");
  item.id = "retained-menu-last"; viewport.style.overflowY = "auto";
  Object.defineProperties(viewport, { clientHeight: { value: 100 }, scrollHeight: { value: 800 } });
  viewport.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
  item.getBoundingClientRect = () => new DOMRect(0, 200 - viewport.scrollTop, 200, 20);
  viewport.append(item); menu.append(viewport); document.body.append(menu);
  const open = shallowRef(false), host = document.createElement("div");
  const app = createApp({ setup() { useNestedMenuScroll(() => menu, () => open.value); return () => h("div"); } });
  app.mount(host);
  menu.setAttribute("aria-activedescendant", item.id); await nextTick(); expect(viewport.scrollTop).toBe(0);
  open.value = true; await nextTick(); expect(viewport.scrollTop).toBe(120);
  open.value = false; await nextTick(); viewport.scrollTop = 0;
  menu.setAttribute("aria-activedescendant", item.id); await nextTick(); expect(viewport.scrollTop).toBe(0);
  open.value = true; await nextTick(); expect(viewport.scrollTop).toBe(120);
  app.unmount(); viewport.scrollTop = 0;
  menu.setAttribute("aria-activedescendant", item.id); await nextTick(); expect(viewport.scrollTop).toBe(0);
  menu.remove();
});
