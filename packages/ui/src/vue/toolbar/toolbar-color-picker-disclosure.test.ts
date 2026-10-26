// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import Toolbar from "./toolbar.vue";
import Action from "./toolbar-action.vue";
import Disclosure from "./toolbar-color-picker-disclosure.vue";
import ColorPicker from "../color-picker/color-picker.vue";
import SplitButton from "./toolbar-split-button.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

it("skips a ColorPicker disabled by its root during Toolbar navigation", async () => {
  const state = reactive({ disabled: false, open: false });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Toolbar, { label: "Format" }, {
    default: () => [
      h(Action, { label: "Before" }, () => "Before"),
      h(ColorPicker, {
        disabled: state.disabled, open: state.open, portalled: false,
        "onUpdate:open": (value: boolean) => { state.open = value; }
      }, { trigger: () => h(Disclosure, { label: "Color" }, () => "Color") }),
      h(Action, { label: "After" }, () => "After")
    ]
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const before = host.querySelector<HTMLButtonElement>('[aria-label="Before"]')!;
  const disclosure = host.querySelector<HTMLButtonElement>('[aria-label="Color"]')!;
  const after = host.querySelector<HTMLButtonElement>('[aria-label="After"]')!;
  before.focus();
  before.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await nextTick();
  expect(document.activeElement).toBe(disclosure);
  state.disabled = true;
  await nextTick();
  await nextTick();
  await vi.waitFor(() => expect(disclosure.tabIndex).toBe(-1));
  expect(disclosure.getAttribute("aria-disabled")).toBe("true");
  disclosure.click();
  expect(state.open).toBe(false);
  before.focus();
  before.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await nextTick();
  expect(document.activeElement).toBe(after);
  state.disabled = false;
  await vi.waitFor(() => expect(disclosure.getAttribute("aria-disabled")).toBeNull());
  after.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  await nextTick();
  expect(document.activeElement).toBe(disclosure);
});

it("inherits split-button availability without disabling the independent main action", async () => {
  const state = reactive({ disabled: false, disclosureDisabled: true, open: false });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Toolbar, { label: "Format" }, {
    default: () => [h(SplitButton, {
      label: "Text color", actionLabel: "Apply", disclosureLabel: "Color",
      disabled: state.disabled, disclosureDisabled: state.disclosureDisabled
    }, {
      default: () => "Apply",
      disclosure: () => h(ColorPicker, {
        open: state.open, portalled: false,
        "onUpdate:open": (value: boolean) => { state.open = value; }
      }, { trigger: () => h(Disclosure, { label: "Color" }, () => "Color") })
    }), h(Action, { label: "After" }, () => "After")]
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const main = host.querySelector<HTMLButtonElement>('[aria-label="Apply"]')!;
  const disclosure = host.querySelector<HTMLButtonElement>('[aria-label="Color"]')!;
  const after = host.querySelector<HTMLButtonElement>('[aria-label="After"]')!;
  expect(main.getAttribute("aria-disabled")).toBeNull();
  expect(disclosure.getAttribute("aria-disabled")).toBe("true");
  main.focus();
  main.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await nextTick();
  expect(document.activeElement).toBe(after);
  disclosure.click();
  expect(state.open).toBe(false);
  state.disclosureDisabled = false;
  state.disabled = true;
  await nextTick();
  expect(main.getAttribute("aria-disabled")).toBe("true");
  expect(disclosure.getAttribute("aria-disabled")).toBe("true");
  state.disabled = false;
  await nextTick();
  disclosure.click();
  await vi.waitFor(() => expect(state.open).toBe(true));
});
