// @vitest-environment happy-dom
import { ColorPicker as ArkColorPicker } from "@ark-ui/vue/color-picker";
import { createApp, h, nextTick, reactive, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import DialogRoot from "../../dialog/root.vue";
import DialogTrigger from "../../dialog/trigger.vue";
import DialogContent from "../../dialog/content.vue";
import PopoverRoot from "../../popover/root.vue";
import PopoverTrigger from "../../popover/trigger.vue";
import PopoverContent from "../../popover/content.vue";
import TooltipRoot from "../../tooltip/root.vue";
import TooltipTrigger from "../../tooltip/trigger.vue";
import TooltipContent from "../../tooltip/content.vue";
import ColorPickerRoot from "../../color-picker/color-picker-root.vue";
import ColorPicker from "../../color-picker/color-picker.vue";
import Collapsible from "../../collapsible/collapsible.vue";

const families = ["dialog", "popover", "tooltip", "color-picker-root", "color-picker", "collapsible"] as const;
type Family = typeof families[number];
const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

/**
 * Renders the public SFC and real Ark parts needed to observe its open lifecycle.
 * @param family - Public adapter under test.
 * @param bindings - Initial default plus optional controlled state and update recorder.
 * @returns One complete component tree with a real trigger.
 */
function surface(family: Family, bindings: Record<string, unknown>): VNode {
  if (family === "dialog") return h(DialogRoot, {
    ...bindings, lazyMount: false, unmountOnExit: false
  }, { default: () => [
    h(DialogTrigger, {}, () => "Open dialog"),
    h(DialogContent, { title: "Document" }, () => h("input", { "aria-label": "Draft" }))
  ] });
  if (family === "popover") return h(PopoverRoot, { ...bindings, modal: true }, { default: () => [
    h(PopoverTrigger, {}, () => "Open options"),
    h(PopoverContent, {}, () => h("input", { "aria-label": "Draft" }))
  ] });
  if (family === "tooltip") return h(TooltipRoot, {
    ...bindings, openDelay: 0, closeDelay: 0
  }, { default: () => [
    h(TooltipTrigger, {}, () => "Help"), h(TooltipContent, { content: "Explanation" })
  ] });
  if (family === "color-picker-root") return h(ColorPickerRoot, bindings, { default: () => [
    h(ArkColorPicker.Control, {}, () => h(ArkColorPicker.Trigger, {}, () => "Accent")),
    h(ArkColorPicker.Content, {}, () => h("input", { "aria-label": "Draft" }))
  ] });
  if (family === "color-picker") return h(ColorPicker, { ...bindings, label: "Accent", portalled: false });
  return h(Collapsible, { ...bindings, title: "Details" }, () => h("input", { "aria-label": "Draft" }));
}

/**
 * Mounts an adapter without writing its update request back into controlled props.
 * @param family - Public adapter under test.
 * @param open - Explicit initial state, or omitted to exercise default initialization.
 * @returns The actual trigger, mutable host state, and requested updates.
 */
async function mountSurface(family: Family, open?: boolean) {
  const state = reactive({ open });
  const updates: boolean[] = [];
  const host = document.createElement("div");
  const outside = document.createElement("button");
  outside.textContent = "Outside";
  document.body.append(outside, host);
  outside.focus();
  const app = createApp({ render: () => surface(family, {
    defaultOpen: true,
    ...(state.open === undefined ? {} : { open: state.open }),
    "onUpdate:open": (next: boolean) => { updates.push(next); }
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); outside.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>('[data-part="trigger"]')!;
  return { state, updates, host, outside, trigger };
}

/**
 * Requests closure through the adapter's public control.
 * @param family - Public adapter under test.
 * @param trigger - The rendered opening control.
 */
function closeSurface(family: Family, trigger: HTMLButtonElement): void {
  if (family === "dialog") document.querySelector<HTMLButtonElement>(".qk-dialog__close-trigger")!.click();
  else trigger.click();
}

/**
 * Reopens through the trigger's ordinary input path.
 * @param family - Public adapter under test.
 * @param trigger - The rendered opening control.
 */
function openSurface(family: Family, trigger: HTMLButtonElement): void {
  if (family === "tooltip") {
    trigger.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse", bubbles: true }));
    trigger.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", bubbles: true }));
  }
  else trigger.click();
}

for (const family of families) {
  it(`${family}: controlled false wins over default true without initial modal or focus effects`, async () => {
    const { state, updates, host, outside, trigger } = await mountSurface(family, false);
    expect(trigger.dataset.state).toBe("closed");
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    expect(document.activeElement).toBe(outside);
    expect(host.closest('[aria-hidden="true"]')).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(updates).toEqual([]);
    for (let cycle = 0; cycle < 2; cycle += 1) {
      state.open = true;
      await vi.waitFor(() => expect(trigger.dataset.state).toBe("open"));
      closeSurface(family, trigger);
      await vi.waitFor(() => expect(updates.at(-1)).toBe(false));
      // A request alone does not overwrite the host-owned value.
      expect(trigger.dataset.state).toBe("open");
      state.open = false;
      await vi.waitFor(() => expect(trigger.dataset.state).toBe("closed"));
      await vi.waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
    }
  });

  it(`${family}: default true initializes once and remains closable across reopening`, async () => {
    const { trigger, updates } = await mountSurface(family);
    expect(trigger.dataset.state).toBe("open");
    for (let cycle = 0; cycle < 2; cycle += 1) {
      closeSurface(family, trigger);
      await vi.waitFor(() => expect(trigger.dataset.state).toBe("closed"));
      openSurface(family, trigger);
      await vi.waitFor(() => expect(trigger.dataset.state).toBe("open"));
    }
    expect(updates).toEqual([false, true, false, true]);
  });
}
