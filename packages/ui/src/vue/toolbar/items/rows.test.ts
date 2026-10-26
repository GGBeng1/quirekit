// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from "vue";
import { expect, it } from "vitest";
import Toolbar from "../toolbar.vue";
import Action from "../toolbar-action.vue";
import Body from "./body.vue";
import type { QuireKitToolbarExecuteEvent } from "../../../components/toolbar/types";

it("owns all explicit rows through one toolbar, tab stop and command path", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const hidden = ref(false);
  const events: QuireKitToolbarExecuteEvent[] = [];
  const app = createApp({ render: () => h(Toolbar, {
    label: "Formatting", variant: "elevated", rows: [
      { value: "text", label: "Text", hidden: hidden.value, items: [{ value: "bold", label: "Bold" }] },
      { value: "table", label: "Table", items: [{ value: "locked", label: "Locked", disabled: true }, { value: "merge", label: "Merge" }] }
    ], onExecute: (event: QuireKitToolbarExecuteEvent) => events.push(event)
  }) });
  try {
    app.mount(host);
    await nextTick();
    expect(host.querySelectorAll('[role="toolbar"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-qk-toolbar-row]')).toHaveLength(2);
    expect(host.querySelectorAll('[data-qk-toolbar-viewport]')).toHaveLength(1);
    const bold = host.querySelector<HTMLButtonElement>('[aria-label="Bold"]')!;
    const merge = host.querySelector<HTMLButtonElement>('[aria-label="Merge"]')!;
    expect(host.querySelectorAll('[data-qk-toolbar-item][tabindex="0"]')).toHaveLength(1);
    bold.focus();
    bold.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(merge);
    merge.click();
    expect(events).toHaveLength(1);
    expect(events[0]?.path).toEqual(["table", "merge"]);
    hidden.value = true;
    await nextTick();
    expect(host.querySelectorAll('[data-qk-toolbar-row]')).toHaveLength(1);
    expect(host.querySelector('[aria-label="Merge"]')).toBe(merge);
    expect(merge.tabIndex).toBe(0);
  } finally { app.unmount(); host.remove(); }
});

it("retains a primary control's DOM and focus when single-row collapse wrapping changes", async () => {
  const host = document.createElement("div"); document.body.append(host);
  const units = ref(true);
  const app = createApp({ render: () => h(Toolbar, { label: "Formatting" }, { default: () => h(Body, { units: units.value, rows: undefined,
    items: [{ value: "primary", label: "Primary" }], renderers: {} }) }) });
  try {
    app.mount(host); await nextTick();
    const button = host.querySelector<HTMLButtonElement>('[aria-label="Primary"]')!;
    button.focus(); units.value = false; await nextTick();
    expect(host.querySelector('[aria-label="Primary"]')).toBe(button);
    expect(document.activeElement).toBe(button);
    units.value = true; await nextTick();
    expect(host.querySelector('[aria-label="Primary"]')).toBe(button);
  } finally { app.unmount(); host.remove(); }
});

it("keeps a default slot above rows and preserves the vertical single-row contract", async () => {
  const host = document.createElement("div");
  const app = createApp({ render: () => h(Toolbar, {
    label: "Manual", orientation: "vertical", rows: [{ value: "ignored", label: "Ignored", items: [{ value: "no", label: "No" }] }]
  }, { default: () => h(Action, { label: "Manual action" }) }) });
  try {
    app.mount(host);
    await nextTick();
    expect(host.querySelector('[role="toolbar"]')?.getAttribute("aria-orientation")).toBe("vertical");
    expect(host.querySelectorAll('[data-qk-toolbar-row]')).toHaveLength(0);
    expect(host.querySelector('[aria-label="Manual action"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="No"]')).toBeNull();
  } finally { app.unmount(); }
});

it("inherits row availability and follows RTL row order without adding a keyboard model", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const events: QuireKitToolbarExecuteEvent[] = [];
  const app = createApp({ render: () => h(Toolbar, {
    label: "RTL rows", dir: "rtl", orientation: "vertical", loopFocus: false, rows: [
      { value: "first", label: "First", items: [{ value: "a", label: "A" }] },
      { value: "locked", label: "Locked", disabled: true, items: [{ value: "b", label: "B" }] },
      { value: "last", label: "Last", items: [{ value: "c", label: "C" }] }
    ], onExecute: (event: QuireKitToolbarExecuteEvent) => events.push(event)
  }) });
  try {
    app.mount(host);
    await nextTick();
    expect(host.querySelector('[role="toolbar"]')?.getAttribute("aria-orientation")).toBe("horizontal");
    const a = host.querySelector<HTMLButtonElement>('[aria-label="A"]')!;
    const b = host.querySelector<HTMLButtonElement>('[aria-label="B"]')!;
    const c = host.querySelector<HTMLButtonElement>('[aria-label="C"]')!;
    expect(b.getAttribute("aria-disabled")).toBe("true");
    expect(b.tabIndex).toBe(-1);
    b.click();
    expect(events).toHaveLength(0);
    a.focus();
    a.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(c);
    c.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(c);
  } finally { app.unmount(); host.remove(); }
});
