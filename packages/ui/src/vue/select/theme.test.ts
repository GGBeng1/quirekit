// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { createTheme, defaultTheme } from "../../theme";
import { createUiThemeCssVariables } from "../../styles/theme";
import { QuireThemeProvider } from "../theme-provider";
import Select from "./select.vue";
import Combobox from "../combobox/combobox.vue";
import PopoverRoot from "../popover/root.vue";
import PopoverTrigger from "../popover/trigger.vue";
import PopoverContent from "../popover/content.vue";
import TooltipRoot from "../tooltip/root.vue";
import TooltipTrigger from "../tooltip/trigger.vue";
import TooltipContent from "../tooltip/content.vue";
import Menu from "../menu/menu.vue";
import Submenu from "../menu/menu-submenu.vue";
import MenuItem from "../menu/menu-item.vue";
import ContextMenu from "../menu/context/context-menu.vue";

const families = ["select", "combobox", "popover", "tooltip", "menu", "submenu", "context-menu"] as const;
const variables = createUiThemeCssVariables(defaultTheme);
const themeNames = new Set(Object.keys(variables));
const colorName = "--qk-color-selection-document";
const items = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }];
const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

/**
 * Renders real public adapters with mutable presentation attributes and a fixed theme.
 * @param family - Public overlay family under test.
 * @param sequence - Unrelated parent update, also changing a small business style.
 * @param open - Whether the controlled surface is exposed.
 * @returns Public component tree retaining the family's original portal behavior.
 */
function renderFamily(family: typeof families[number], sequence: number, open: boolean): VNode {
  const attrs = { "data-theme-test": family, "data-sequence": sequence, style: { padding: `${sequence + 3}px` } };
  if (family === "select") return h(Select, { label: "Choose", modelValue: "a", items, open, contentProps: attrs });
  if (family === "combobox") return h(Combobox, { label: "Search", modelValue: "a", items, open, contentProps: attrs });
  if (family === "popover") return h(PopoverRoot, { open, autoFocus: false }, { default: () => [
    h(PopoverTrigger, {}, () => "Options"), h(PopoverContent, attrs, () => "Content")
  ] });
  if (family === "tooltip") return h(TooltipRoot, { open }, { default: () => [
    h(TooltipTrigger, {}, () => "Help"), h(TooltipContent, { ...attrs, content: "Explanation" })
  ] });
  if (family === "context-menu") return h(ContextMenu, { label: `Actions ${sequence}`, open, width: `${sequence + 160}px` }, {
    trigger: () => "Context target",
    default: () => h(MenuItem, { value: "a", "data-theme-test": family, "data-sequence": sequence }, () => "Alpha")
  });
  if (family === "submenu") return h(Menu, { open: true, ariaLabel: "Parent" }, { default: () =>
    h(Submenu, { open, contentProps: attrs }, {
      trigger: () => "More", default: () => h(MenuItem, { value: "a" }, () => "Alpha")
    })
  });
  return h(Menu, { ...attrs, open, ariaLabel: "Actions" }, { default: () => h(MenuItem, { value: "a" }, () => "Alpha") });
}

/**
 * Finds an actual DOM ancestor that supplies the inherited theme to a portal.
 * @param content - Connected floating content, independently of private scope attributes.
 * @returns Nearest ancestor that declares the shared semantic color.
 */
function themeOwner(content: HTMLElement): HTMLElement | undefined {
  let element = content.parentElement;
  while (element) {
    if (element.style.getPropertyValue(colorName)) return element;
    element = element.parentElement;
  }
  return undefined;
}

for (const family of families) {
  it(`${family} inherits its open portal theme without rewriting it on unrelated updates`, async () => {
      const theme = shallowRef(defaultTheme);
      const sequence = shallowRef(0);
      const host = document.createElement("div");
      document.body.append(host);
      const app = createApp({ render: () => h(QuireThemeProvider, { theme: theme.value }, {
        default: () => renderFamily(family, sequence.value, true)
      }) });
      app.mount(host);
      cleanups.push(() => { app.unmount(); host.remove(); });
      await nextTick();
      const content = document.querySelector<HTMLElement>(`[data-theme-test="${family}"]`)!;
      expect(content).not.toBeNull();
      await vi.waitFor(() => expect(host.contains(content)).toBe(false));
      const owner = themeOwner(content);
      expect(owner, "body portals must retain the nearest provider's theme").toBeDefined();
      expect(owner!.style.getPropertyValue(colorName)).toBe(defaultTheme.color.selection.document);
      if (family === "popover") expect(owner!.contains(document.querySelector(".qk-popover__arrow"))).toBe(true);

      // Spy on connected scope styles rather than CSSStyleDeclaration.prototype:
      // DOM emulators may construct detached computed-style copies internally.
      const writes = Array.from(document.querySelectorAll<HTMLElement>("[data-qk-theme-surface]"),
        scope => vi.spyOn(scope.style, "setProperty"));
      for (let update = 1; update <= 4; update += 1) {
        sequence.value = update;
        await nextTick();
      }
      expect(content.getAttribute("data-sequence")).toBe("4");
      expect(writes.flatMap(spy => spy.mock.calls).filter(([name]) => themeNames.has(name)).length).toBe(0);
      if (family !== "context-menu") expect(content.style.padding).toBe("7px");

      theme.value = createTheme({ scheme: "dark", sources: { primary: "#246b55" } });
      await nextTick();
      expect(themeOwner(content)).toBe(owner);
      expect(owner!.style.getPropertyValue(colorName)).toBe(theme.value.color.selection.document);
      expect(writes.some(spy => spy.mock.calls.some(([name]) => themeNames.has(name)))).toBe(true);
  });
}

it("retains explicit content theme overrides and ordinary styles under a provider", async () => {
  const override = shallowRef("#123456");
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(QuireThemeProvider, { theme: defaultTheme }, {
    default: () => {
      const contentProps = {
        "data-theme-test": "override", style: { [colorName]: override.value, padding: "9px" }, lang: "en"
      };
      return h(Select, { label: "Choose", items, modelValue: "a", open: true, contentProps });
    }
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const content = document.querySelector<HTMLElement>('[data-theme-test="override"]')!;
  expect(content.style.getPropertyValue(colorName)).toBe("#123456");
  expect(content.style.padding).toBe("9px");
  expect(content.lang).toBe("en");
  override.value = "#654321";
  await nextTick();
  expect(content.style.getPropertyValue(colorName)).toBe("#654321");
  expect(themeOwner(content)?.style.getPropertyValue(colorName)).toBe(defaultTheme.color.selection.document);
});
