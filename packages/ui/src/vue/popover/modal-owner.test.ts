// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import DialogRoot from "../dialog/root.vue";
import DialogContent from "../dialog/content.vue";
import DrawerRoot from "../drawer/root.vue";
import DrawerContent from "../drawer/content.vue";
import PopoverRoot from "./root.vue";
import PopoverTrigger from "./trigger.vue";
import PopoverContent from "./content.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

for (const owner of ["dialog", "drawer"] as const) {
  for (const controlled of [false, true]) {
    it(`suspends a ${controlled ? "controlled" : "default-open"} modal Popover while its retained ${owner} is closed`, async () => {
      const state = reactive({ parent: false });
      const requested = vi.fn();
      const host = document.createElement("div");
      document.body.append(host);
      const app = createApp({ render: () => {
        const root = owner === "dialog" ? DialogRoot : DrawerRoot;
        const content = owner === "dialog" ? DialogContent : DrawerContent;
        return h("main", [h("button", "Outside"), h(root, {
          open: state.parent, defaultOpen: true, lazyMount: false, unmountOnExit: false,
          finalFocusEl: () => host.querySelector<HTMLButtonElement>("button")
        }, { default: () => h(content, { title: "Parent" }, { default: () => h(PopoverRoot, {
          modal: true, ...(controlled ? { open: true } : { defaultOpen: true }),
          "onUpdate:open": requested
        }, { default: () => [
          h(PopoverTrigger, {}, () => "Options"),
          h(PopoverContent, {}, () => h("input", { "aria-label": "Draft", defaultValue: "Retained" }))
        ] }) }) })]);
      } });
      app.mount(host);
      cleanup.push(() => { app.unmount(); host.remove(); });
      await nextTick();
      const popup = document.querySelector<HTMLElement>('.qk-popover__content')!;
      await vi.waitFor(() => expect(popup.dataset.state).toBe("closed"));
      expect(host.closest('[aria-hidden="true"]')).toBeNull();
      expect(document.body.style.overflow).not.toBe("hidden");
      for (let cycle = 0; cycle < 2; cycle += 1) {
        state.parent = true;
        await vi.waitFor(() => expect(popup.dataset.state).toBe("open"));
        await vi.waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
        const input = popup.querySelector<HTMLInputElement>("input")!;
        if (cycle === 0) input.value = "Edited draft";
        else expect(input.value).toBe("Edited draft");
        state.parent = false;
        await vi.waitFor(() => expect(popup.dataset.state).toBe("closed"));
        await vi.waitFor(() => expect(host.closest('[aria-hidden="true"]')).toBeNull());
        await vi.waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
        await vi.waitFor(() => expect(document.activeElement).toBe(host.querySelector("button")));
        expect(document.querySelector('.qk-popover__content')).toBe(popup);
      }
      expect(requested).not.toHaveBeenCalled();
    });
  }
}
