// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import Toolbar from "./toolbar.vue";
import SplitButton from "./toolbar-split-button.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

it("keeps optional primary toggle state separate from disclosure and single execution", async () => {
  const state = reactive<{ pressed: boolean | "mixed" | undefined; open: boolean; disabled: boolean }>({
    pressed: undefined, open: false, disabled: false
  });
  const action = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Toolbar, { label: "Lists" }, {
    default: () => h(SplitButton, {
      label: "Numbering", actionLabel: "Apply numbering", disclosureLabel: "Presets",
      ...(state.pressed === undefined ? {} : { pressed: state.pressed }),
      expanded: state.open, disabled: state.disabled,
      "onUpdate:expanded": (open: boolean) => { state.open = open; },
      onAction: action
    }, () => "Numbering")
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const primary = host.querySelector<HTMLButtonElement>('[aria-label="Apply numbering"]')!;
  const disclosure = host.querySelector<HTMLButtonElement>('[aria-label="Presets"]')!;
  expect(primary.hasAttribute("aria-pressed")).toBe(false);
  primary.click();
  expect(action).toHaveBeenCalledTimes(1);
  expect(state.open).toBe(false);
  for (const pressed of [false, true, "mixed"] as const) {
    state.pressed = pressed;
    await nextTick();
    expect(primary.getAttribute("aria-pressed")).toBe(String(pressed));
    expect(disclosure.hasAttribute("aria-pressed")).toBe(false);
  }
  primary.focus();
  primary.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await nextTick();
  expect(document.activeElement).toBe(disclosure);
  disclosure.click();
  await nextTick();
  expect(state.open).toBe(true);
  expect(action).toHaveBeenCalledTimes(1);
  expect(primary.getAttribute("aria-pressed")).toBe("mixed");
  state.disabled = true;
  await nextTick();
  primary.click();
  expect(action).toHaveBeenCalledTimes(1);
});
