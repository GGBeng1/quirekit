// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import DialogRoot from "../../dialog/root.vue";
import DialogContent from "../../dialog/content.vue";
import DrawerRoot from "../../drawer/root.vue";
import DrawerContent from "../../drawer/content.vue";
import PopoverRoot from "../../popover/root.vue";
import PopoverTrigger from "../../popover/trigger.vue";
import PopoverContent from "../../popover/content.vue";
import ColorPicker from "../../color-picker/color-picker.vue";
import TooltipRoot from "../../tooltip/root.vue";
import TooltipTrigger from "../../tooltip/trigger.vue";
import TooltipContent from "../../tooltip/content.vue";
import Menu from "../../menu/menu.vue";
import MenuItem from "../../menu/menu-item.vue";
import Select from "../../select/select.vue";
import Combobox from "../../combobox/combobox.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

for (const owner of ["dialog", "drawer"] as const) {
  it(`exposes later-opened popups after ${owner} isolation and preserves DOM across reopening`, async () => {
    const state = reactive({ parent: true, popover: false, color: false, menu: false, tooltip: false });
    const host = document.createElement("div");
    document.body.append(host);
    const items = [{ value: "sans", label: "Sans" }, { value: "serif", label: "Serif" }];
    /** @returns Real adapters mounted while their popup remains closed. */
    function popups() {
      return [
        h(PopoverRoot, { open: state.popover, autoFocus: false }, { default: () => [
          h(PopoverTrigger, {}, () => "Options"),
          h(PopoverContent, {}, () => h("input", { "aria-label": "Draft", defaultValue: "Retained" }))
        ] }),
        h(ColorPicker, { open: state.color, label: "Accent" }),
        h(Menu, { open: state.menu, ariaLabel: "Commands" }, {
          trigger: () => h("button", "Commands"),
          default: () => h(MenuItem, { value: "apply" }, () => "Apply")
        }),
        h(TooltipRoot, { open: state.tooltip }, { default: () => [
          h(TooltipTrigger, {}, () => "Help"),
          h(TooltipContent, { content: "Additional information" })
        ] }),
        h(Select, { label: "Font", items, layerOffset: 1 }),
        h(Combobox, { label: "Search font", items })
      ];
    }
    const app = createApp({ render: () => {
      const root = owner === "dialog" ? DialogRoot : DrawerRoot;
      const content = owner === "dialog" ? DialogContent : DrawerContent;
      return h("main", ["Background", h(root, {
        open: state.parent, trapFocus: false, preventScroll: false, restoreFocus: false
      }, { default: () => h(content, { title: "Document" }, { default: popups }) })]);
    } });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); });

    for (let cycle = 0; cycle < 2; cycle += 1) {
      await vi.waitFor(() => expect(host.getAttribute("aria-hidden")).toBe("true"));
      for (const [family, key] of [["popover", "popover"], ["color-picker", "color"], ["menu", "menu"], ["tooltip", "tooltip"]] as const) {
        const retained = document.querySelector(`.qk-${family}__positioner`);
        if (retained) expect(retained.closest(`[data-scope="${owner}"][data-part="content"]`)).not.toBeNull();
        for (let opening = 0; opening < 2; opening += 1) {
          state[key] = true;
          await nextTick();
          await vi.waitFor(() => expect(document.querySelector(`.qk-${family}__positioner`)).not.toBeNull());
          const positioner = document.querySelector(`.qk-${family}__positioner`)!;
          await vi.waitFor(() => expect(positioner.parentElement).toBe(document.body));
          if (retained) expect(positioner).toBe(retained);
          expect(positioner.closest('[aria-hidden="true"]')).toBeNull();
          if (family === "popover") {
            const input = positioner.querySelector<HTMLInputElement>("input")!;
            if (opening === 0) input.value = "Edited draft";
            else expect(input.value).toBe("Edited draft");
          }
          state[key] = false;
          await nextTick();
          await vi.waitFor(() => expect(positioner.parentElement).not.toBe(document.body));
        }
      }
      for (const family of ["select", "combobox"] as const) {
        const trigger = document.querySelector<HTMLButtonElement>(`.qk-${family}__trigger`)!;
        for (let opening = 0; opening < 2; opening += 1) {
          trigger.click();
          await vi.waitFor(() => expect(document.querySelector(`.qk-${family}__positioner`)).not.toBeNull());
          const positioner = document.querySelector(`.qk-${family}__positioner`)!;
          await vi.waitFor(() => expect(positioner.parentElement).toBe(document.body));
          if (family === "select") expect((positioner as HTMLElement).style.getPropertyValue("--qk-select-layer")).toBe("calc(var(--qk-layer-modal) + 2)");
          const option = positioner.querySelector<HTMLElement>('[role="option"]')!;
          expect(option.textContent).toContain("Sans");
          expect(option.closest('[aria-hidden="true"]')).toBeNull();
          trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          await vi.waitFor(() => expect(positioner.parentElement).not.toBe(document.body));
        }
      }
      state.parent = false;
      await vi.waitFor(() => expect(host.hasAttribute("aria-hidden")).toBe(false));
      if (cycle === 0) state.parent = true;
    }
  });
}

for (const owner of ["dialog", "drawer"] as const) {
  for (const family of ["popover", "color-picker", "tooltip"] as const) {
    it(`keeps an initially-open ${family} accessible when a retained ${owner} first opens and reopens`, async () => {
      const state = reactive({ parent: false });
      const host = document.createElement("div");
      document.body.append(host);
      /** @returns One initially-open popup retained by an initially-closed parent. */
      function popup() {
        if (family === "color-picker") return h(ColorPicker, { defaultOpen: true, label: "Accent" });
        if (family === "tooltip") return h(TooltipRoot, { defaultOpen: true }, { default: () => [
          h(TooltipTrigger, {}, () => "Help"), h(TooltipContent, { content: "Explanation" })
        ] });
        return h(PopoverRoot, { defaultOpen: true, autoFocus: false }, { default: () => [
          h(PopoverTrigger, {}, () => "Options"), h(PopoverContent, {}, () => h("input", { "aria-label": "Draft" }))
        ] });
      }
      const app = createApp({ render: () => {
        const root = owner === "dialog" ? DialogRoot : DrawerRoot;
        const content = owner === "dialog" ? DialogContent : DrawerContent;
        return h(root, {
          open: state.parent, lazyMount: false, unmountOnExit: false,
          trapFocus: false, preventScroll: false, restoreFocus: false
        }, { default: () => h(content, { title: "Document" }, { default: popup }) });
      } });
      app.mount(host);
      cleanup.push(() => { app.unmount(); host.remove(); });
      await vi.waitFor(() => expect(document.querySelector(`.qk-${family}__positioner`)).not.toBeNull());
      const positioner = document.querySelector(`.qk-${family}__positioner`)!;
      expect(positioner.parentElement).not.toBe(document.body);
      for (let opening = 0; opening < 2; opening += 1) {
        state.parent = true;
        await vi.waitFor(() => expect(host.getAttribute("aria-hidden")).toBe("true"));
        await vi.waitFor(() => expect(positioner.parentElement).toBe(document.body));
        expect(positioner.closest('[aria-hidden="true"]')).toBeNull();
        expect(document.querySelector(`.qk-${family}__positioner`)).toBe(positioner);
        state.parent = false;
        await vi.waitFor(() => expect(host.hasAttribute("aria-hidden")).toBe(false));
        await vi.waitFor(() => expect(positioner.parentElement).not.toBe(document.body));
        expect(positioner.isConnected).toBe(true);
      }
    });
  }
}
