// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import ConfirmDialog from "./confirm-dialog.vue";
import { resolveClassicEditorOverlayState } from "../../shell/overlays/document-state";

const cleanups: Array<() => void> = [];
afterEach(async () => {
  cleanups.splice(0).reverse().forEach(dispose => dispose());
  // Zag defers focus restoration beyond synchronous Vue unmount. Finish that
  // teardown before the next independent fixture installs outside-focus guards.
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
});

/** @returns One real public dialog with controlled visibility and cancellation observation. */
async function mountConfirm() {
  const root = document.createElement("div");
  root.className = "qk-classic-editor";
  document.body.append(root);
  const open = ref(true);
  const busy = ref(false);
  const cancel = vi.fn();
  const app = createApp({ render: () => h(ConfirmDialog, {
    themeRoot: root, show: open.value, busy: busy.value,
    title: "Confirm action", message: "Continue?", cancelLabel: "Cancel", confirmLabel: "Confirm",
    "onUpdate:show": (value: boolean) => { open.value = value; }, onCancel: cancel
  }) });
  app.mount(root);
  cleanups.push(() => { app.unmount(); root.remove(); });
  await nextTick();
  const surface = document.querySelector<HTMLElement>('[role="dialog"]')!;
  await expect.poll(() => document.activeElement).toBe(surface);
  return { open, busy, cancel, surface, root };
}

it("registers externally opened dialogs and releases ownership after controlled closure", async () => {
  const { open, surface } = await mountConfirm();
  const state = resolveClassicEditorOverlayState(document);
  const owner = surface.getAttribute("data-qk-classic-overlay")!;
  expect(state.coordinator.activeIds).toContain(owner);
  open.value = false;
  await nextTick();
  expect(state.coordinator.activeIds).not.toContain(owner);
  open.value = true;
  await expect.poll(() => resolveClassicEditorOverlayState(document).coordinator.activeIds).toContain(owner);
});

it("cancels once through the public dialog visibility event on Escape", async () => {
  const { open, cancel, surface } = await mountConfirm();
  surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  await expect.poll(() => open.value).toBe(false);
  expect(cancel).toHaveBeenCalledTimes(1);
});

it("retains busy tasks until public Escape dismissal is enabled again", async () => {
  const { open, busy, cancel, surface } = await mountConfirm();
  busy.value = true;
  await nextTick();
  surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  await nextTick();
  expect(open.value).toBe(true);
  expect(cancel).not.toHaveBeenCalled();
  busy.value = false;
  await nextTick();
  surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  await expect.poll(() => open.value).toBe(false);
  expect(cancel).toHaveBeenCalledTimes(1);
});
