// @vitest-environment happy-dom
import { createApp, h, nextTick, ref, type Component } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import Toolbar from "./toolbar.vue";
import Selector from "./toolbar-selector.vue";
import Disclosure from "./toolbar-disclosure.vue";
import PopoverRoot from "../popover/root.vue";
import PopoverTrigger from "../popover/trigger.vue";
import PopoverContent from "../popover/content.vue";

const cleanup: Array<() => void> = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); vi.restoreAllMocks(); });

for (const [name, Control] of [["Selector", Selector], ["Disclosure", Disclosure]] as const) {
  it(`${name} gives native click to one popup owner while retaining ArrowDown and disabled guards`, async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const open = ref(false);
    const disabled = ref(false);
    const requests = vi.fn((next: boolean) => { open.value = next; });
    const activated = vi.fn();
    const app = createApp({ render: () => h(Toolbar, { label: "Document" }, () => h(PopoverRoot, {
      open: open.value, "onUpdate:open": (next: boolean) => { open.value = next; }
    }, () => [
      h(PopoverTrigger, { asChild: true }, () => h(Control as Component, {
        label: "Options", text: "Current", popup: "dialog", toggleOnClick: false,
        expanded: open.value, disabled: disabled.value, "onUpdate:expanded": requests, onActivate: activated
      })),
      h(PopoverContent, { "aria-label": "Options" }, () => h("button", "Apply"))
    ])) });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); });
    await nextTick();
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Options"]')!;
    trigger.click();
    await vi.waitFor(() => expect(open.value).toBe(true));
    expect(requests).not.toHaveBeenCalled();
    expect(activated).not.toHaveBeenCalled();
    trigger.click();
    await vi.waitFor(() => expect(open.value).toBe(false));
    expect(requests).not.toHaveBeenCalled();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(open.value).toBe(true));
    expect(requests).toHaveBeenCalledExactlyOnceWith(true);
    open.value = false;
    disabled.value = true;
    await nextTick();
    trigger.click();
    await nextTick();
    expect(open.value).toBe(false);
    expect(requests).toHaveBeenCalledTimes(1);
  });
}
