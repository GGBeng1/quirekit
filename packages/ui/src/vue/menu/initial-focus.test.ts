// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, expect, it } from "vitest";
import Menu from "./menu.vue";
import MenuItem from "./menu-item.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

for (const initialFocus of ["auto", "menu"] as const) {
  it(`retains ${initialFocus} initial focus across controlled opening and reopening`, async () => {
    const state = reactive({ open: false });
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(defineComponent({ setup: () => () => h(Menu, {
      open: state.open, initialFocus, portalled: false,
      "onUpdate:open": value => { state.open = value === true; }
    }, {
      trigger: () => h("button", "Open"),
      default: () => [h("input", { "aria-label": "Search" }), h(MenuItem, { value: "copy" }, () => "Copy")]
    }) }));
    app.mount(host);
    cleanups.push(() => { app.unmount(); host.remove(); });
    await nextTick();
    const trigger = host.querySelector<HTMLButtonElement>("button")!;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    for (let cycle = 0; cycle < 2; cycle += 1) {
      state.open = true;
      await nextTick();
      const menu = host.querySelector<HTMLElement>('[role="menu"]')!;
      const field = menu.querySelector<HTMLInputElement>("input")!;
      await expect.poll(() => document.activeElement).toBe(initialFocus === "menu" ? menu : field);
      field.focus();
      await nextTick();
      expect(document.activeElement).toBe(field);
      state.open = false;
      await nextTick();
      await expect.poll(() => document.activeElement).toBe(trigger);
    }
  });
}
