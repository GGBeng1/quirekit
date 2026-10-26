// @vitest-environment happy-dom
import { createApp, h, shallowRef } from "vue";
import { expect, it, vi } from "vitest";
import DialogRoot from "./root.vue";
import DialogContent from "./content.vue";

it("releases pointer and keyboard interaction while a closed dialog remains mounted", async () => {
  const open = shallowRef(true);
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(DialogRoot, {
    open: open.value, unmountOnExit: false, trapFocus: false, preventScroll: false, restoreFocus: false
  }, () => h(DialogContent, { title: "Directory settings" }, () => h("input"))) });
  app.mount(host);
  try {
    await vi.waitFor(() => expect(document.querySelector(".qk-dialog__content")).not.toBeNull());
    const backdrop = document.querySelector<HTMLElement>(".qk-dialog__backdrop")!;
    const positioner = document.querySelector<HTMLElement>(".qk-dialog__positioner")!;
    expect(backdrop.hasAttribute("inert")).toBe(false);
    expect(positioner.hasAttribute("inert")).toBe(false);
    open.value = false;
    await vi.waitFor(() => expect(backdrop.hasAttribute("inert")).toBe(true));
    expect(positioner.hasAttribute("inert")).toBe(true);
    expect(positioner.querySelector("input")).not.toBeNull();
    open.value = true;
    await vi.waitFor(() => expect(document.querySelector(".qk-dialog__positioner")?.hasAttribute("inert")).toBe(false));
    expect(document.querySelector(".qk-dialog__backdrop")?.hasAttribute("inert")).toBe(false);
  } finally {
    app.unmount(); host.remove();
  }
});
