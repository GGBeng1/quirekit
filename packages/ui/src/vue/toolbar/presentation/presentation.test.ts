// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import Toolbar from "../toolbar.vue";
import Field from "./field.vue";
import Action from "../toolbar-action.vue";
import ColorPicker from "../../color-picker/color-picker.vue";
import ColorDisclosure from "../toolbar-color-picker-disclosure.vue";
import { quireKitEditorIconData } from "../../../components/icon/catalog";
import type { QuireKitToolbarExecuteEvent } from "../../../components/toolbar/types";

const cleanup: Array<() => void> = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); vi.restoreAllMocks(); });

/** @param target - Native control without a layout engine in happy-dom. */
function keyboardFocus(target: HTMLElement): void {
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 20, 80, 28));
  const matches = target.matches.bind(target);
  vi.spyOn(target, "matches").mockImplementation(selector => selector === ":focus-visible" || matches(selector));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  target.focus();
}

it("uses one Tooltip for labels and disabled reasons while preserving original native actions", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const intents: QuireKitToolbarExecuteEvent[] = [];
  let source: EventTarget | null = null;
  const app = createApp({ render: () => h(Toolbar, {
    label: "Formatting", items: [
      { value: "bold", label: "Bold", kind: "toggle", pressed: false, iconData: quireKitEditorIconData.bold, attributes: { "data-command": "bold" } },
      { value: "save", label: "Save", tooltip: "Save changes", disabled: true, disabledReason: "Document is read only" }
    ], onExecute: (event: QuireKitToolbarExecuteEvent) => { intents.push(event); source = event.nativeEvent?.currentTarget ?? null; }
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const bold = host.querySelector<HTMLButtonElement>('[aria-label="Bold"]')!;
  expect(bold.hasAttribute("title")).toBe(false);
  expect(bold.querySelector("svg")).not.toBeNull();
  expect(bold.dataset.command).toBe("bold");
  keyboardFocus(bold);
  await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Bold"));
  expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
  bold.click();
  expect(intents).toHaveLength(1);
  expect(intents[0]?.nativeEvent).toBeInstanceOf(MouseEvent);
  expect(source).toBe(bold);
  await nextTick();
  expect(bold.getAttribute("aria-pressed")).toBe("false");
  const unavailable = host.querySelector<HTMLButtonElement>('[aria-label="Save"]')!;
  keyboardFocus(unavailable);
  await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Document is read only"));
  unavailable.click();
  expect(intents).toHaveLength(1);
});

it("opens an externally owned panel without creating an empty Popover and preserves its trigger", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const open = ref(false);
  const targets: Array<EventTarget | null | undefined> = [];
  const app = createApp({ render: () => h(Toolbar, {
    label: "Workspace", items: [{ value: "comments", label: "Comments", kind: "disclosure", popup: false, expanded: open.value }],
    onOpenChange: (event: { expanded: boolean }) => { open.value = event.expanded; },
    onExecute: (event: QuireKitToolbarExecuteEvent) => targets.push(event.nativeEvent?.currentTarget)
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Comments"]')!;
  trigger.click();
  await nextTick();
  expect(targets).toEqual([trigger]);
  expect(open.value).toBe(true);
  expect(trigger.getAttribute("aria-haspopup")).toBeNull();
  keyboardFocus(trigger);
  await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Comments"));
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(document.querySelector('[data-scope="popover"][data-part="content"]')).toBeNull();
});

it("preserves public menu ownership, normalized icon data and controlled async selection", async () => {
  const host = document.createElement("div");
  const portal = document.createElement("div");
  document.body.append(host, portal);
  const open = ref(false);
  const selected: string[] = [];
  const app = createApp({ render: () => h(Toolbar, {
    label: "Menu", items: [{ value: "options", label: "Options", kind: "menu", trigger: "disclosure",
      text: "Options", iconData: quireKitEditorIconData.bold, expanded: open.value,
      overlayProps: { portalTarget: portal, closeOnSelect: false, contentAttributes: { lang: "en", "data-owner": "document" } },
      items: [{ value: "apply", label: "Apply" }] }],
    onOpenChange: (event: { expanded: boolean }) => { open.value = event.expanded; },
    onSelect: (value: string) => selected.push(value)
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); portal.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Options"]')!;
  trigger.click();
  await vi.waitFor(() => expect(portal.querySelector('[role="menu"]')).not.toBeNull());
  expect(trigger.querySelectorAll("svg")).toHaveLength(2);
  expect(trigger.id).toBe(trigger.getAttribute("aria-controls")?.replace(/:content$/, ":trigger"));
  expect(portal.querySelector('[role="menu"]')?.getAttribute("lang")).toBe("en");
  expect(portal.querySelector('[role="menu"]')?.getAttribute("data-owner")).toBe("document");
  const command = portal.querySelector<HTMLElement>('[role="menuitem"]')!;
  command.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "mouse", bubbles: true }));
  command.click();
  await vi.waitFor(() => expect(selected).toEqual(["apply"]));
  expect(open.value).toBe(true);
  open.value = false;
  await nextTick();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

it("gives a real field the same Tooltip without adding toolbar navigation semantics", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  let size = "";
  const app = createApp({ render: () => h(Toolbar, { label: "Field" }, { default: () => [
    h(Action, { label: "Save" }), h(Field, { label: "Font size", width: "80px" }, {
      default: (scope: { size: string }) => { size = scope.size; return h("input", { "aria-label": "Font size" }); }
    })
  ] }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const input = host.querySelector("input")!;
  expect(input.type).toBe("text");
  expect(size).toBe("sm");
  expect(input.hasAttribute("data-qk-toolbar-item")).toBe(false);
  keyboardFocus(input);
  await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Font size"));
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  expect(document.activeElement).toBe(input);
});

it("keeps a ColorPicker trigger's Tooltip and popup under their public owners", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Toolbar, { label: "Color" }, { default: () => h(ColorPicker, {
    label: "Text color", modelValue: "#4f46e5"
  }, { trigger: () => h(ColorDisclosure, { label: "Choose color" }, () => "+") }) }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Choose color"]')!;
  expect(trigger.id).toBe(trigger.getAttribute("aria-controls")?.replace(/:content$/, ":trigger"));
  const triggerId = trigger.id;
  keyboardFocus(trigger);
  await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Choose color"));
  trigger.click();
  await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
  await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
  expect(trigger.id).toBe(triggerId);
  const popup = document.querySelector<HTMLElement>('[data-scope="color-picker"][data-part="content"]')!;
  popup.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
});


it("opens a configured popup with ArrowDown without also moving vertical Toolbar focus", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Toolbar, {
    label: "Insert", orientation: "vertical", items: [
      { value: "table", kind: "disclosure", label: "Insert table", contentRenderer: "grid" },
      { value: "next", label: "Next command" }
    ], renderers: { grid: { render: () => h("button", "Grid cell") } }
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Insert table"]')!;
  keyboardFocus(trigger);
  const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
  trigger.dispatchEvent(event);
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Grid cell"));
  expect(event.defaultPrevented).toBe(true);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(document.activeElement).not.toBe(host.querySelector('[aria-label="Next command"]'));
});
