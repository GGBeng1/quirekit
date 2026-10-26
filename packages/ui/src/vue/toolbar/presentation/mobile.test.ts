// @vitest-environment happy-dom
import { createApp, h, nextTick, ref, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitToolbarExecuteEvent } from "../../../components/toolbar/types";
import Toolbar from "../toolbar.vue";
import More from "../collapse/more.vue";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.restoreAllMocks(); });
/** @param render - Public consumer tree. @returns Connected mounting host. */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement("div"); document.body.append(host);
  const app = createApp({ render }); app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  return host;
}
/** @param button - Real control receiving keyboard focus. */
function keyboardFocus(button: HTMLElement): void {
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 20, 80, 44));
  const matches = button.matches.bind(button);
  vi.spyOn(button, "matches").mockImplementation(selector => selector === ":focus-visible" || matches(selector));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); button.focus();
}

it("mobile mode suppresses Tooltip and retains native controls across a mode change", async () => {
  const mode = ref("mobile" as "mobile" | "desktop");
  const host = mount(() => h(Toolbar, { label: "Tools", mode: mode.value, overflow: "visible", items: [{ value: "copy", label: "Copy" }] }));
  await nextTick(); const button = host.querySelector<HTMLButtonElement>('button')!;
  keyboardFocus(button); await new Promise(resolve => setTimeout(resolve, 50));
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
  mode.value = "desktop"; await nextTick(); expect(host.querySelector('button')).toBe(button);
  button.blur(); keyboardFocus(button);
  await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Copy"));
});

it("mobile unit sizing reserves both split targets while preserving command identity", async () => {
  const mode = ref("mobile" as "mobile" | "desktop"), events: QuireKitToolbarExecuteEvent[] = [];
  const entry = { value: "accept", label: "Accept", icon: "check", kind: "split" as const, actionLabel: "Accept change", disclosureLabel: "Accept options", items: [{ value: "all", label: "Accept all" }] };
  const host = mount(() => h(Toolbar, { label: "Tools", mode: mode.value, sizing: "units", overflow: "visible", items: [entry], onExecute: (event: QuireKitToolbarExecuteEvent) => events.push(event) }));
  await nextTick(); const slot = host.querySelector<HTMLElement>('.qk-toolbar__slot')!;
  const action = host.querySelector<HTMLButtonElement>('[aria-label="Accept change"]')!;
  expect(slot.style.getPropertyValue('--qk-toolbar-span')).toBe("2");
  action.click(); expect(events[0]?.item).toBe(entry); expect(events[0]?.source).toBe("action");
  mode.value = "desktop"; await nextTick();
  expect(slot.style.getPropertyValue('--qk-toolbar-span')).toBe("1.5");
  expect(host.querySelector('[aria-label="Accept change"]')).toBe(action);
});

it("mobile overflow keeps full command identity, toggle state and disabled behavior in a bottom sheet", async () => {
  const events: QuireKitToolbarExecuteEvent[] = [], pressed = ref(false);
  const action = { value: "save", label: "Save document", payload: { format: "md" } };
  const host = mount(() => h(Toolbar, { label: "Tools", mode: "mobile", overflow: "visible" }, { default: () => h(More, {
    label: "More", mobile: true, renderers: {}, items: [action,
      { value: "bold", label: "Bold", kind: "toggle", pressed: pressed.value }, { value: "blocked", label: "Unavailable", disabled: true }],
    onExecute: (event: QuireKitToolbarExecuteEvent) => { events.push(event); if (event.value === "bold") pressed.value = event.pressed!; }
  }) }));
  await nextTick(); const trigger = host.querySelector<HTMLButtonElement>('[aria-label="More"]')!; trigger.click();
  await vi.waitFor(() => expect(document.querySelector('.qk-drawer__content[role="dialog"]')).not.toBeNull());
  const sheet = document.querySelector<HTMLElement>('.qk-drawer__content[role="dialog"]')!;
  const bold = sheet.querySelector<HTMLButtonElement>('[aria-label="Bold"]')!;
  bold.click(); await nextTick(); expect(bold.getAttribute('aria-pressed')).toBe("true"); expect(events[0]?.source).toBe("toggle");
  sheet.querySelector<HTMLButtonElement>('[aria-label="Unavailable"]')!.click(); expect(events).toHaveLength(1);
  sheet.querySelector<HTMLButtonElement>('[aria-label="Save document"]')!.click();
  expect(events).toHaveLength(2); expect(events[1]?.item).toBe(action); expect(events[1]?.payload).toBe(action.payload);
  await vi.waitFor(() => expect(document.querySelector('.qk-drawer__content[role="dialog"]')).toBeNull());
});

it("an open mobile overflow retains a custom draft and its shell through a mode change", async () => {
  const mobile = ref(true);
  const renderers = { note: { render: () => h('input', { 'aria-label': 'Note draft' }) } };
  const host = mount(() => h(Toolbar, { label: "Tools", mode: "mobile", overflow: "visible" }, { default: () => h(More, {
    label: "More", mobile: mobile.value, renderers,
    items: [{ value: "note", label: "Note", kind: "custom", renderer: "note" }]
  }) }));
  await nextTick(); host.querySelector<HTMLButtonElement>('[aria-label="More"]')!.click();
  await vi.waitFor(() => expect(document.querySelector<HTMLInputElement>('[aria-label="Note draft"]')).not.toBeNull());
  const input = document.querySelector<HTMLInputElement>('[aria-label="Note draft"]')!; input.value = "Unsaved draft"; input.focus();
  mobile.value = false; await nextTick();
  expect(document.querySelector('[aria-label="Note draft"]')).toBe(input); expect(input.value).toBe("Unsaved draft");
  expect(input.closest('.qk-drawer__content')).not.toBeNull(); expect(document.activeElement).toBe(input);
});
