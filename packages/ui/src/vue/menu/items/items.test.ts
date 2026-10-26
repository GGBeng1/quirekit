// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from "vue";
import { LocaleProvider } from "@ark-ui/vue/locale";
import { expect, it } from "vitest";
import Menu from "../menu.vue";
import Items from "./items.vue";

it.each(["en-US", "ar-AE"])("keeps option icons separate from one trailing check in %s", async locale => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(LocaleProvider, { locale }, { default: () => h(Menu, { defaultOpen: true, portalled: false, items: [
    { value: "compact", label: "Compact", checked: true, icon: "alignStart", shortcut: "⌘K" },
    { value: "mode", label: "", kind: "radio-group", selectedValue: "page", children: [
      { value: "page", label: "Page", icon: "alignStart" }, { value: "outline", label: "Outline" }
    ] }
  ] }, { trigger: () => h("button", "Options") }) }) });
  try {
    app.mount(host);
    await nextTick();
    expect(host.querySelector('[role="menu"]')?.getAttribute("dir")).toBe(locale === "ar-AE" ? "rtl" : "ltr");
    expect(host.querySelector(".qk-menu__group-label")).toBeNull();
    for (const value of ["compact", "page", "outline"]) {
      const item = host.querySelector(`[data-value="${value}"]`)!;
      expect(item.lastElementChild?.classList.contains("qk-menu__selection-indicator")).toBe(true);
      expect(item.querySelector(".qk-menu__selection-indicator circle")).toBeNull();
      if (value !== "outline") expect(item.querySelector(".qk-menu__leading .qk-icon")).not.toBeNull();
    }
    expect(host.querySelector('[data-value="outline"] .qk-menu__leading')).not.toBeNull();
    expect(host.querySelector('[data-value="compact"] kbd [aria-hidden="true"]')?.textContent).toBe("⌘K");
    expect(host.querySelector('[data-value="compact"] kbd')?.classList.contains("qk-kbd--xs")).toBe(true);
    expect(host.querySelector('[data-value="page"]')?.getAttribute("aria-checked")).toBe("true");
    expect(host.querySelector('[data-value="outline"]')?.getAttribute("aria-checked")).toBe("false");
  } finally { app.unmount(); host.remove(); }
});

it("renders explicit shortcut keys with shared Kbd for ordinary, checkbox and radio rows", async () => {
  const host = document.createElement("div"); document.body.append(host);
  const app = createApp({ render: () => h(Menu, { defaultOpen: true, portalled: false, items: [
    { value: "parent", label: "Parent", shortcut: ["Shift", "Enter"] },
    { value: "toggle", label: "Toggle", checked: false, shortcut: ["⌘", "T"] },
    { value: "mode", kind: "radio-group", label: "Mode", selectedValue: "outline", children: [
      { value: "outline", label: "Outline", shortcut: ["Alt", "Shift", "→"] },
    ] },
  ] }, { trigger: () => h("button", "Options") }) });
  try {
    app.mount(host); await nextTick();
    expect(host.querySelectorAll("kbd.qk-kbd.qk-kbd--xs")).toHaveLength(3);
    expect(host.querySelector('[data-value="parent"] kbd [aria-hidden="true"]')?.textContent).toBe("Shift + Enter");
    expect(host.querySelector('[data-value="outline"] kbd .sr-only')?.textContent).toBe("Alt + Shift + Arrow right");
  } finally { app.unmount(); host.remove(); }
});

it("renders declarations with shortcut and prevents disabled execution", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const selected: string[] = [];
  const app = createApp({ render: () => h(Menu, { defaultOpen: true, portalled: false }, {
    trigger: () => h("button", "Actions"),
    default: () => h(Items, { items: [
      { value: "file", kind: "group", label: "File", children: [{ value: "save", label: "Save", shortcut: "⌘S" }] },
      { value: "remove-group", kind: "submenu", label: "Remove", tone: "danger", children: [{ value: "remove", label: "Remove item", tone: "danger" }] },
      { value: "delete", label: "Delete", disabled: true, reason: "Read only" }
    ], onSelect: (value: string) => selected.push(value) })
  }) });
  try {
    app.mount(host);
    await nextTick();
    expect(host.querySelector('kbd [aria-hidden="true"]')?.textContent).toBe("⌘S");
    expect(document.querySelector(".qk-menu__submenu-trigger")?.getAttribute("data-tone"))
      .toBe("danger");
    const disabled = host.querySelector('[data-value="delete"]')!;
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    disabled.dispatchEvent(new CustomEvent("menu:select"));
    expect(selected).toEqual([]);
    host.querySelector('[data-value="save"]')!.dispatchEvent(new CustomEvent("menu:select"));
    expect(selected).toEqual(["save"]);
  } finally { app.unmount(); host.remove(); }
});

it("accepts live root items, forwards one action, and applies disabled updates", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const selected: string[] = [];
  const disabled = ref(false);
  const app = createApp({ render: () => h(Menu, {
    defaultOpen: true, portalled: false,
    items: [
      { value: "copy", label: "Copy", disabled: disabled.value },
      { value: "separator", label: "", kind: "separator" },
      { value: "compact", label: "Compact", checked: true },
      { value: "view", label: "View", kind: "radio-group", selectedValue: "page", children: [
        { value: "page", label: "Page" }, { value: "outline", label: "Outline" }
      ] }
    ], onSelect: (value: string) => selected.push(value)
  }) });
  try {
    app.mount(host);
    await nextTick();
    expect(host.querySelector('[role="separator"]')).not.toBeNull();
    expect(host.querySelector('[role="menuitemcheckbox"]')?.getAttribute("aria-checked")).toBe("true");
    expect(host.querySelector('[data-value="page"]')?.getAttribute("aria-checked")).toBe("true");
    host.querySelector('[data-value="copy"]')!.dispatchEvent(new CustomEvent("menu:select", { bubbles: true }));
    expect(selected).toEqual(["copy"]);
    disabled.value = true;
    await nextTick();
    host.querySelector('[data-value="copy"]')!.dispatchEvent(new CustomEvent("menu:select", { bubbles: true }));
    expect(selected).toEqual(["copy"]);
  } finally { app.unmount(); host.remove(); }
});
