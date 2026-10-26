// @vitest-environment happy-dom
import { createSSRApp, defineComponent, h, nextTick, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, expect, it, vi } from "vitest";
import TooltipRoot from "./root.vue";
import TooltipTrigger from "./trigger.vue";
import TooltipContent from "./content.vue";
import ColorPicker from "../color-picker/color-picker.vue";
import Menu from "../menu/menu.vue";
import Select from "../select/select.vue";

const cleanup: Array<() => void> = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); document.body.replaceChildren(); vi.restoreAllMocks(); });

it("hydrates independent tooltip, color, menu and select boundaries without consuming a sibling portal", async () => {
  const tooltip = await serverBoundary("tip", defineComponent({ render: () => h(TooltipRoot, { open: true }, { default: () => [
    h(TooltipTrigger, { asChild: true }, () => h("button", "Font")),
    h(TooltipContent, { content: "Font family" })
  ] }) }));
  // The color picker mounts its portal lazily, so a closed boundary renders no
  // positioner to hydrate. Opening it keeps this boundary's portal ownership
  // assertion meaningful, matching the tooltip boundary above.
  const color = await serverBoundary("color", defineComponent({ render: () => h(ColorPicker, { label: "Text color", modelValue: "#1677FF", defaultOpen: true }) }));
  const menu = await serverBoundary("menu", defineComponent({ render: () => h(Menu, {
    items: [{ value: "copy", label: "Copy" }]
  }, { trigger: () => h("button", "More") }) }));
  const select = await serverBoundary("select", defineComponent({ render: () => h(Select, {
    label: "Scrollbar", modelValue: "hidden", items: [{ value: "hidden", label: "Hidden" }, { value: "auto", label: "Auto" }]
  }) }));
  const navigation = await serverBoundary("navigation", defineComponent({ render: () => h(Select, {
    label: "Browse components", modelValue: "toolbar", items: [{ value: "toolbar", label: "Toolbar" }]
  }) }));
  // Independent asynchronous roots can hydrate in a different order than the response.
  document.body.innerHTML = tooltip.portal + color.portal + menu.portal + select.portal + navigation.portal;
  document.body.append(tooltip.host, color.host, menu.host, select.host, navigation.host);
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
  navigation.hydrate();
  menu.hydrate();
  select.hydrate();
  color.hydrate();
  tooltip.hydrate();
  await nextTick();
  expect([...errors.mock.calls, ...warnings.mock.calls].map(call => String(call[0])).filter(message => /hydration|mismatch/i.test(message))).toEqual([]);
  expect(document.querySelectorAll('[data-scope="color-picker"][data-part="positioner"]')).toHaveLength(1);
  const ids = [...document.querySelectorAll("[id]")].map(element => element.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(document.querySelector('[data-scope="color-picker"][data-part="positioner"]')?.closest("main")).toBeNull();
});

/**
 * Prepares one independently hydrated SSR boundary and its body portal.
 * @param prefix - Unique framework identifier for this boundary.
 * @param component - Popup family rendered by the boundary.
 * @returns Response markup and the matching client hydration operation.
 */
async function serverBoundary(prefix: string, component: Component) {
  const server = createSSRApp(component);
  server.config.idPrefix = prefix;
  const ssr: { teleports?: Record<string, string> } = {};
  const html = await renderToString(server, ssr);
  const host = document.createElement("main");
  host.innerHTML = html;
  return { host, portal: ssr.teleports?.body ?? "",
    /** Hydrates this boundary without assuming its siblings have resolved. */
    hydrate(): void {
      const client = createSSRApp(component);
      client.config.idPrefix = prefix;
      client.mount(host);
      cleanup.push(() => { client.unmount(); host.remove(); });
    }
  };
}
