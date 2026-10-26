// @vitest-environment happy-dom
import { createTheme } from "@quirekit/ui";
import { QuireDatePicker } from "@quirekit/ui/vue";
import { h, nextTick, ref, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { resolveClassicEditorOverlayState } from "../../shell/overlays/document-state";
import { applyClassicEditorTheme } from "../../shell/theme";
import { createClassicEditorUiApp } from "../../shell/vue-app";
import PopupMenu from "./popup-menu.vue";
import PopupMenuItem from "./popup-menu-item.vue";
import type { ClassicEditorPopupMenuAnchor } from "./types";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).reverse().forEach(dispose => dispose()));

/** @param target - Element receiving a real keyboard event. @param key - Requested navigation key. */
function press(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** @param withPicker - Whether to include a public body-portalled date editor. @param initiallyOpen - Initial controlled visibility. @returns A controlled contextual surface with a mutable semantic anchor. */
async function mountPopup(withPicker = false, initiallyOpen = true) {
  const host = document.createElement("div");
  host.className = "qk-classic-editor";
  host.lang = "en";
  const input = document.createElement("input");
  input.setAttribute("data-qk-input-proxy", "");
  const overlayHost = document.createElement("div");
  overlayHost.dataset.qkClassicDocumentOverlays = "";
  overlayHost.getBoundingClientRect = () => ({
    x: 100,
    y: 50,
    top: 50,
    right: 900,
    bottom: 1250,
    left: 100,
    width: 800,
    height: 1200,
    toJSON: () => undefined
  });
  const mount = document.createElement("div");
  host.append(input, overlayHost, mount);
  document.body.append(host);
  input.focus();
  const open = ref(initiallyOpen);
  const pickerOpen = ref(false);
  const theme = shallowRef(createTheme({ sources: { primary: "#246b55" } }));
  applyClassicEditorTheme(host, theme.value);
  const anchor = ref<ClassicEditorPopupMenuAnchor | null>({ x: 300, y: 220 });
  const app = createClassicEditorUiApp({ render: () => h(PopupMenu, {
    show: open.value, themeRoot: host, label: "Context actions", anchor: anchor.value,
    resolveAnchor: () => anchor.value,
    "onUpdate:show": (value: boolean) => { open.value = value; }
  }, { default: () => h(PopupMenuItem, {
    icon: "bold", label: "More actions", menuItems: [
      { key: "colors", label: "Colors", children: [{ key: "blue", label: "Blue" }] }
    ]
  }), ...(withPicker ? { body: () => h(QuireDatePicker, {
    label: "Date", modelValue: "2026-08-03", open: pickerOpen.value,
    "onUpdate:open": (value: boolean) => { pickerOpen.value = value; }
  }) } : {}) }) }, {}, () => theme.value);
  app.mount(mount);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  // Shared positioning and nested public controls settle after the opening frame.
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  const surface = (): HTMLElement => document.querySelector<HTMLElement>('.qk-classic-editor__popup-menu')!;
  const trigger = (): HTMLButtonElement => surface().querySelector<HTMLButtonElement>('[aria-label="More actions"]')!;
  return { host, input, open, pickerOpen, anchor, overlayHost, theme, surface, trigger };
}

it("creates contextual portals inside their document owner from the first opening", async () => {
  const before = [...document.body.childNodes];
  const { host, open, surface, overlayHost } = await mountPopup(false, false);
  expect([...document.body.childNodes]).toEqual([...before, host]);
  for (let cycle = 0; cycle < 3; cycle += 1) {
    open.value = true;
    await nextTick();
    expect(surface().parentElement).toBe(overlayHost);
    open.value = false;
    await nextTick();
    expect(surface()).toBeNull();
    expect([...document.body.childNodes]).toEqual([...before, host]);
  }
});

it("owns a body-portalled date picker and removes it when its target disappears", async () => {
  const { anchor, open, pickerOpen } = await mountPopup(true);
  pickerOpen.value = true;
  await expect.poll(() => document.querySelector('.qk-date-picker__panel [role="grid"]')).not.toBeNull();
  const day = document.querySelector<HTMLElement>('.qk-date-picker__panel [tabindex="0"]')!;
  day.focus();
  await nextTick();
  expect(open.value).toBe(true);
  expect(pickerOpen.value).toBe(true);
  anchor.value = null;
  await nextTick();
  expect(document.querySelector('.qk-date-picker__panel')).toBeNull();
  expect(open.value).toBe(true);
});

it("inherits the root theme without nested theme surfaces or anchor-update rewrites", async () => {
  const { host, anchor, theme, surface, trigger } = await mountPopup();
  trigger().click();
  await expect.poll(() => trigger().getAttribute("aria-expanded")).toBe("true");
  const menu = document.querySelector<HTMLElement>("[data-qk-menu-content]")!;
  expect(surface().closest("[data-qk-theme-surface]")).toBeNull();
  expect(menu.closest("[data-qk-theme-surface]")).toBeNull();
  expect(host.style.getPropertyValue("--qk-color-selection-document")).toBe(theme.value.color.selection.document);
  expect(surface().style.getPropertyValue("--qk-color-selection-document")).toBe("");
  expect(menu.style.getPropertyValue("--qk-color-selection-document")).toBe("");
  expect(surface().closest(".qk-popover__content")).toBeNull();
  expect(surface().matches('.qk-toolbar--outlined')).toBe(true);
  const write = vi.spyOn(host.style, "setProperty");
  try {
    anchor.value = { x: 420, y: 280 };
    host.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(write.mock.calls.length).toBe(0);
    const nextTheme = createTheme({ scheme: "dark", sources: { primary: "#8246ab" } });
    applyClassicEditorTheme(host, nextTheme);
    theme.value = nextTheme;
    await nextTick();
    expect(host.style.getPropertyValue("--qk-color-selection-document"))
      .toBe(nextTheme.color.selection.document);
    expect(surface().closest("[data-qk-theme-surface]")).toBeNull();
    expect(menu.closest("[data-qk-theme-surface]")).toBeNull();
  } finally {
    write.mockRestore();
  }
});

it("closes only the active public child layer and restores document focus after the parent Escape", async () => {
  const { open, input, surface, trigger } = await mountPopup();
  expect(document.activeElement).toBe(input);
  trigger().click();
  await expect.poll(() => trigger().getAttribute("aria-expanded")).toBe("true");
  const menu = document.querySelector<HTMLElement>('[data-qk-menu-content]')!;
  menu.focus();
  press(menu, "Home");
  await nextTick();
  press(menu, "ArrowRight");
  await expect.poll(() => document.querySelector('[data-qk-submenu-content]')?.getAttribute("data-state")).toBe("open");
  const submenu = document.querySelector<HTMLElement>('[data-qk-submenu-content]')!;
  submenu.focus();
  press(submenu, "Escape");
  await expect.poll(() => submenu.getAttribute("data-state")).toBe("closed");
  expect(open.value).toBe(true);
  expect(trigger().getAttribute("aria-expanded")).toBe("true");
  press(menu, "Escape");
  await expect.poll(() => trigger().getAttribute("aria-expanded")).toBe("false");
  expect(open.value).toBe(true);
  await expect.poll(() => document.activeElement).toBe(trigger());
  press(trigger(), "Escape");
  await expect.poll(() => open.value).toBe(false);
  await expect.poll(() => document.activeElement).toBe(input);
  expect(surface()).toBeNull();
});

it("uses the document overlay geometry, releases invalid targets and reopens without the previous child menu", async () => {
  const { open, anchor, overlayHost, surface, trigger } = await mountPopup();
  const state = resolveClassicEditorOverlayState(document);
  const owner = surface().getAttribute("data-qk-classic-overlay")!;
  expect(state.coordinator.activeIds).toContain(owner);
  trigger().click();
  await expect.poll(() => trigger().getAttribute("aria-expanded")).toBe("true");
  anchor.value = { x: 400, y: 280 };
  await nextTick();
  expect(surface().parentElement).toBe(overlayHost);
  expect(surface().style.position).toBe("absolute");
  expect(surface().style.left).toBe("300px");
  expect(surface().style.top).toBe("230px");
  anchor.value = null;
  await nextTick();
  expect(state.coordinator.activeIds).not.toContain(owner);
  expect(surface()).toBeNull();
  expect(open.value).toBe(true);
  anchor.value = { x: 240, y: 160 };
  await expect.poll(() => surface()?.getAttribute("data-state")).toBe("open");
  expect(trigger().getAttribute("aria-expanded")).toBe("false");
  for (let opening = 0; opening < 2; opening += 1) {
    open.value = false;
    await nextTick();
    open.value = true;
    await expect.poll(() => surface()?.getAttribute("data-state")).toBe("open");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  }
});

it("returns focus from the child trigger to the document when Escape closes its parent", async () => {
  const { input, open, trigger } = await mountPopup();
  trigger().click();
  await expect.poll(() => trigger().getAttribute("aria-expanded")).toBe("true");
  const menu = document.querySelector<HTMLElement>('[data-qk-menu-content]')!;
  menu.focus();
  press(menu, "Escape");
  await expect.poll(() => trigger().getAttribute("aria-expanded")).toBe("false");
  expect(open.value).toBe(true);
  await expect.poll(() => document.activeElement).toBe(trigger());
  press(trigger(), "Escape");
  await expect.poll(() => open.value).toBe(false);
  await expect.poll(() => document.activeElement).toBe(input);
});

it("keeps focus on the outside input when that interaction dismisses the contextual surface", async () => {
  const { open, trigger } = await mountPopup();
  const outside = document.createElement("input");
  document.body.append(outside);
  cleanups.push(() => outside.remove());
  trigger().focus();
  await nextTick();
  outside.focus();
  await expect.poll(() => open.value).toBe(false);
  await nextTick();
  expect(document.activeElement).toBe(outside);
});

it("retains a new document-owned target without swallowing unrelated outside pointers", async () => {
  const { host, open, anchor, surface } = await mountPopup();
  const documentMount = document.createElement("div");
  documentMount.className = "qk-classic-editor__canvas-mount";
  const pointer = document.createElement("div");
  documentMount.append(pointer);
  host.append(documentMount);
  pointer.addEventListener("pointerdown", event => {
    event.preventDefault();
    anchor.value = { x: 480, y: 320 };
  });
  pointer.dispatchEvent(new PointerEvent("pointerdown", {
    bubbles: true, cancelable: true, pointerType: "mouse", button: 0
  }));
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  expect(open.value).toBe(true);
  expect(surface().getAttribute("data-state")).toBe("open");

  // A product action can prevent native focus without owning a document target.
  const chrome = document.createElement("button");
  host.append(chrome);
  chrome.addEventListener("pointerdown", event => event.preventDefault());
  chrome.dispatchEvent(new PointerEvent("pointerdown", {
    bubbles: true, cancelable: true, pointerType: "mouse", button: 0
  }));
  await expect.poll(() => open.value).toBe(false);
});
